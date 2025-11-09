'use client';
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../../lib/firebaseClient';
import { AIAnalysisResult } from '../../lib/ai';

// Initialize Firebase
initFirebase();

// Type definitions
interface AnalysisResult extends AIAnalysisResult {
  url: string;
  error?: string;
  timestamp?: number;
}

// Helper function to get color based on verdict
const getVerdictColor = (verdict: string) => {
  switch(verdict.toLowerCase()) {
    case 'safe': return 'text-green-400';
    case 'moderate': return 'text-yellow-400';
    case 'malicious': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

export default function BatchPage() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload and parsing
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (result: Papa.ParseResult<string[]>) => {
        const urls = result.data
          .map(row => row[0]?.trim())
          .filter((url): url is string => {
            try {
              if (!url) return false;
              new URL(url);
              return true;
            } catch {
              return false;
            }
          });
        
        if (urls.length === 0) {
          setError('No valid URLs found in the uploaded file.');
          return;
        }
        
        runBatch(urls);
      },
      error: (error: Error) => {
        setError(`Error parsing CSV: ${error.message}`);
      },
    });
  }, []);

  // Process batch of URLs
  const runBatch = useCallback(async (urls: string[]) => {
    setRunning(true);
    setResults([]);
    setError(null);
    setSummary(null);
    setProgress({ done: 0, total: urls.length });
    
    const out: AnalysisResult[] = [];
    
    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          // Log analysis event
          logAnalyzeEvent();
          
          // Call API to analyze URL
          const res = await fetch('/api/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (!res.ok) {
            throw new Error(`API request failed with status ${res.status}`);
          }
          
          const data = await res.json();
          
          // Log to Firebase
          try {
            const urlHash = await hashUrl(url);
            await logToRealtimeDB({
              urlHash,
              verdict: data.verdict,
              score: data.score,
              category: data.category,
              riskScore: data.riskScore,
              confidence: data.confidence,
              timestamp: Date.now(),
              ts: Date.now(),
              metadata: data.metadata || {}
            });
          } catch (logError) {
            console.error('Error logging to Firebase:', logError);
          }
          
          // Add to results
          out.push({
            url,
            ...data,
            timestamp: Date.now()
          });
          
        } catch (e) {
          console.error(`Error processing URL ${url}:`, e);
          out.push({
            url,
            error: e instanceof Error ? e.message : 'Unknown error',
            verdict: 'unknown',
            reasons: ['Failed to analyze URL'],
            summary: 'Analysis failed',
            category: 'error',
            confidence: 0,
            riskScore: 50,
            metadata: {
              isPhishing: false,
              isMalware: false,
              isSuspicious: true,
              reputationScore: 50,
            },
            timestamp: Date.now()
          });
        }
        
        // Update progress
        setProgress({ done: i + 1, total: urls.length });
        setResults([...out]);
      }
      
      // Generate batch summary
      try {
        const summaryResponse = await fetch('/api/batch-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: out.map(r => r.url),
            results: out.map(r => ({
              url: r.url,
              verdict: r.verdict,
              category: r.category,
              riskScore: r.riskScore,
              confidence: r.confidence,
              metadata: r.metadata
            }))
          })
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData.summary || summaryData.text || 'No summary available');
        }
      } catch (summaryError) {
        console.error('Error generating summary:', summaryError);
      }
      
    } catch (e) {
      setError(`Batch processing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  }, [setRunning, setError, setResults, setProgress, setSummary]);

  // Download results as CSV
  const downloadCSV = useCallback(() => {
    const headers = [
      'URL',
      'Verdict',
      'Risk Score',
      'Confidence',
      'Category',
      'Is Phishing',
      'Is Malware',
      'Is Suspicious',
      'Reputation Score',
      'Summary',
      'Reasons',
      'Error'
    ];
    
    const rows = results.map(r => ({
      url: `"${r.url}"`,
      verdict: r.verdict,
      riskScore: r.riskScore,
      confidence: r.confidence,
      category: r.category,
      isPhishing: r.metadata?.isPhishing ? 'Yes' : 'No',
      isMalware: r.metadata?.isMalware ? 'Yes' : 'No',
      isSuspicious: r.metadata?.isSuspicious ? 'Yes' : 'No',
      reputationScore: r.metadata?.reputationScore || 'N/A',
      summary: `"${(r.summary || '').replace(/"/g, '""')}"`,
      reasons: `"${(r.reasons || []).join('; ').replace(/"/g, '""')}"`,
      error: r.error ? `"${r.error.replace(/"/g, '""')}"` : ''
    }));
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `url_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [results]);

  // Get status badge
  const getStatusBadge = (result: AnalysisResult) => {
    if (result.error) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-900/50 text-red-300 rounded-full">Error</span>;
    }
    
    const colorMap = {
      safe: 'bg-green-900/50 text-green-300',
      moderate: 'bg-yellow-900/50 text-yellow-300',
      malicious: 'bg-red-900/50 text-red-300',
      unknown: 'bg-gray-700/50 text-gray-300',
    };
    
    const status = result.verdict?.toLowerCase() as keyof typeof colorMap || 'unknown';
    const className = colorMap[status] || colorMap.unknown;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">URL Security Analyzer</h1>
          <p className="text-gray-400">Batch analyze multiple URLs for security threats and risks</p>
        </div>
        
        {/* Upload Section */}
        <div className="glass p-6 rounded-lg shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Batch Analysis</h2>
              <p className="text-sm text-gray-300">
                Upload a CSV file containing one URL per line to analyze multiple URLs at once.
              </p>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex-shrink-0">
              <label className="btn bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 cursor-pointer">
                {running ? 'Analyzing...' : 'Upload CSV'}
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFile} 
                  className="hidden"
                  disabled={running}
                />
              </label>
            </div>
          </div>
          
          {running && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Progress</span>
                <span>{progress.done} of {progress.total} URLs analyzed</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-violet-600 to-cyan-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Summary Section */}
        {summary && (
          <div className="glass p-5 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Batch Analysis Summary</h3>
            <p className="text-gray-300 whitespace-pre-line">{summary}</p>
          </div>
        )}
        
        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Results ({results.length} URLs analyzed)
              </h3>
              <button 
                onClick={downloadCSV}
                className="btn bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
              >
                Download Full Report (CSV)
              </button>
            </div>
            
            <div className="grid gap-4">
              {results.map((result, index) => (
                <div key={index} className="glass p-4 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(result)}
                        <span className="text-sm text-gray-400">
                          {new Date(result.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate" title={result.url}>
                        {result.url}
                      </p>
                      {result.summary && (
                        <p className="text-sm text-gray-300 mt-1">{result.summary}</p>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-400 mt-1">Error: {result.error}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold" style={{ color: 
                        result.riskScore >= 70 ? '#ef4444' : 
                        result.riskScore >= 40 ? '#f59e0b' : 
                        '#10b981'
                      }}>
                        {result.riskScore}
                      </div>
                      <div className="text-xs text-gray-400">Risk Score</div>
                    </div>
                  </div>
                  
                  {/* Detailed Info */}
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Category:</span>{' '}
                        <span className="text-white">{result.category || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Confidence:</span>{' '}
                        <span className="text-white">{result.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Phishing:</span>{' '}
                        <span className={result.metadata?.isPhishing ? 'text-red-400' : 'text-green-400'}>
                          {result.metadata?.isPhishing ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Malware:</span>{' '}
                        <span className={result.metadata?.isMalware ? 'text-red-400' : 'text-green-400'}>
                          {result.metadata?.isMalware ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Suspicious:</span>{' '}
                        <span className={result.metadata?.isSuspicious ? 'text-yellow-400' : 'text-green-400'}>
                          {result.metadata?.isSuspicious ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Reputation:</span>{' '}
                        <span className={(result.metadata?.reputationScore ?? 100) < 50 ? 'text-yellow-400' : 'text-green-400'}>
                          {result.metadata?.reputationScore?.toString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {result.reasons && result.reasons.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Findings:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                          {result.reasons.map((reason, i) => (
                            <li key={i} className="truncate" title={reason}>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
