'use client';
import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import RiskBar from '../components/RiskBar';
import ConfidenceBar from '../components/ConfidenceBar';
import ResultCard from '../components/ResultCard';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../lib/firebaseClient';

interface AnalysisResult {
  verdict: string;
  score: number;
  confidence: number;
  category: string;
  details?: Record<string, unknown>;
  error?: string;
}

export default function Page() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [anonLogging, setAnonLogging] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase
  useEffect(() => {
    initFirebase();
  }, []);

  const analyze = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to analyze');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Log the analysis event
      logAnalyzeEvent();

      // Call the analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed. Please try again.');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      // Log to Firebase if anonymous logging is enabled
      if (anonLogging) {
        try {
          const urlHash = await hashUrl(url);
          await logToRealtimeDB({
            urlHash,
            verdict: data.verdict,
            score: data.score,
            category: data.category,
            ts: Date.now()
          });
        } catch (logError) {
          console.error('Failed to log analysis:', logError);
          // Don't show this error to the user as it doesn't affect their experience
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="space-y-6">
      <Hero />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Analyze a URL</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Paste a URL to get an AI-powered analysis of its safety and reliability.
        </p>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              className={`flex-1 p-3 rounded-lg border ${
                error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              placeholder="https://example.com"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
              disabled={loading}
              aria-label="Enter URL to analyze"
            />
            <button
              onClick={analyze}
              disabled={loading || !url.trim()}
              className={`px-6 py-3 rounded-lg font-medium text-white ${
                loading || !url.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-opacity'
              }`}
              aria-busy={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonLogging"
              checked={anonLogging}
              onChange={(e) => setAnonLogging(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="anonLogging" className="text-sm text-gray-600 dark:text-gray-300">
              Enable anonymous usage analytics
            </label>
          </div>
        </div>
      </div>

      {result && (
        <>
          <RiskBar score={result.score} />
          <ConfidenceBar confidence={result.confidence} />
          <ResultCard result={result} />
        </>
      )}
    </div>
  );
}
