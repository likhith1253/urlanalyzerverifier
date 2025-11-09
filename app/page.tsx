'use client';
import { useState, useEffect } from 'react';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, getAnalysisHistory } from '../lib/firebaseClient';

initFirebase();

const VerdictBadge = ({ verdict }) => {
  const styles = {
    safe: { background: '#10B981', color: 'white' },
    suspicious: { background: '#F59E0B', color: 'white' },
    malicious: { background: '#EF4444', color: 'white' },
    unknown: { background: '#6B7280', color: 'white' },
    likely_safe: { background: '#10B981', color: 'white' },
  };

  const style = styles[verdict.toLowerCase()] || styles.unknown;
  
  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'capitalize',
      ...style
    }}>
      {verdict}
    </span>
  );
};

const HeuristicIndicator = ({ label, value, isWarning = false }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: isWarning ? '#FEE2E2' : '#EFF6FF',
    borderRadius: '6px',
    color: isWarning ? '#B91C1C' : '#1E40AF',
    fontSize: '0.875rem',
  }}>
    <span style={{ fontWeight: 600 }}>{label}:</span>
    <span>{String(value)}</span>
  </div>
);

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalScans: 0,
    safeCount: 0,
    suspiciousCount: 0,
    maliciousCount: 0,
    lastScanned: null
  });

  // Load analytics on component mount
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const history = await getAnalysisHistory(50); // Get last 50 scans
        const safeCount = history.filter(r => r.verdict === 'safe' || r.verdict === 'likely_safe').length;
        const suspiciousCount = history.filter(r => r.verdict === 'suspicious').length;
        const maliciousCount = history.filter(r => r.verdict === 'malicious').length;
        
        setAnalytics({
          totalScans: history.length,
          safeCount,
          suspiciousCount,
          maliciousCount,
          lastScanned: history[0]?.timestamp || null
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    };
    
    loadAnalytics();
  }, [result]); // Refresh analytics when new result is added

  interface ApiError extends Error {
    response?: any;
  }

  async function analyze() {
    setLoading(true); 
    setError(null); 
    setResult(null);
    console.log('Starting analysis for URL:', url);
    
    try {
      logAnalyzeEvent();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      console.log('Analysis response:', data);
      
      if (!res.ok) {
        const error = new Error(data.error || 'Analysis failed') as ApiError;
        error.response = data;
        throw error;
      }
      
      setResult(data);

      // Write log to realtime db
      try {
        await logToRealtimeDB({
          url: data.url,
          verdict: data.verdict,
          reasons: data.reasons,
          summary: data.summary,
          heuristics: data.heuristics,
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to save analysis to database', e);
      }
    } catch (e: unknown) {
      const error = e as ApiError;
      let errorMessage = 'An error occurred during analysis';
      
      if (error.response) {
        const status = error.response.status || 'Unknown status';
        const details = error.response.data || error.response._debug || 'No details';
        errorMessage = `Error: ${status} - ${typeof details === 'string' ? details : JSON.stringify(details)}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      console.error('Analysis error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response);
      }
    } finally {
      setLoading(false);
    }
  }

  const getHeuristicWarnings = (heuristics) => {
    const warnings = [];
    if (heuristics.hasIP) warnings.push('Contains IP address');
    if (heuristics.hasShortener) warnings.push('Uses URL shortener');
    if (heuristics.hasSuspiciousKeywords) warnings.push('Contains suspicious keywords');
    if (heuristics.hasSpecialChars) warnings.push('Has unusual characters');
    if (!heuristics.isHttps) warnings.push('Not using HTTPS');
    if (heuristics.subdomainCount > 2) warnings.push('Multiple subdomains detected');
    return warnings;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      color: '#E2E8F0',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      padding: '24px 16px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px', color: '#FFFFFF' }}>🔍 URL Security Analyzer</h1>
          <p style={{ color: '#94A3B8', maxWidth: '600px', margin: '0 auto' }}>
            Check any URL for security threats, phishing attempts, and suspicious behavior
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '48px' }}>
          {/* Main Analysis Section */}
          <div style={{ background: '#0F172A', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to analyze (e.g., https://example.com)"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#1E293B',
                  color: '#E2E8F0',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onKeyDown={(e) => e.key === 'Enter' && !loading && analyze()}
              />
              <button
                onClick={analyze}
                disabled={loading || !url.trim()}
                style={{
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: loading || !url.trim() ? '#4B5563' : '#3B82F6',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !url.trim() ? 0.7 : 1,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner" style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      borderTopColor: 'white',
                      animation: 'spin 1s ease-in-out infinite',
                    }} />
                    Analyzing...
                  </span>
                ) : 'Analyze URL'}
              </button>
            </div>

            {error && (
              <div style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                borderLeft: '4px solid #DC2626',
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div style={{ marginTop: '24px' }}>
                <div style={{
                  background: '#1E293B',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                }}>
                  <div style={{
                    padding: '16px 24px',
                    background: '#0F172A',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Analysis Results</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#94A3B8' }}>Verdict:</span>
                      <VerdictBadge verdict={result.verdict} />
                      {result.confidence && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#94A3B8',
                          background: '#1E293B',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}>
                          {result.confidence} confidence
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#94A3B8' }}>URL</h3>
                      <div style={{
                        background: '#0F172A',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                      }}>
                        {result.url}
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#94A3B8' }}>Summary</h3>
                      <div style={{
                        background: '#0F172A',
                        padding: '16px',
                        borderRadius: '6px',
                        lineHeight: '1.6',
                      }}>
                        {result.summary}
                      </div>
                    </div>

                    {result.reasons && result.reasons.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#94A3B8' }}>
                          {result.verdict === 'safe' || result.verdict === 'likely_safe' 
                            ? 'Security Indicators' 
                            : 'Potential Issues'}
                        </h3>
                        <ul style={{ 
                          margin: 0, 
                          padding: 0,
                          listStyle: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}>
                          {result.reasons.map((reason, i) => (
                            <li key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '12px 16px',
                              background: '#0F172A',
                              borderRadius: '6px',
                            }}>
                              <span style={{
                                color: result.verdict === 'safe' || result.verdict === 'likely_safe' ? '#10B981' : '#F59E0B',
                                fontSize: '1.25rem',
                                lineHeight: '1',
                                marginTop: '2px',
                              }}>
                                {result.verdict === 'safe' || result.verdict === 'likely_safe' ? '✓' : '⚠'}
                              </span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#94A3B8' }}>
                        Technical Analysis
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px',
                      }}>
                        {result.heuristics && (
                          <>
                            <HeuristicIndicator 
                              label="HTTPS" 
                              value={result.heuristics.isHttps ? 'Enabled' : 'Not Used'} 
                              isWarning={!result.heuristics.isHttps}
                            />
                            <HeuristicIndicator 
                              label="URL Length" 
                              value={`${result.heuristics.length} chars`}
                              isWarning={result.heuristics.length > 100}
                            />
                            <HeuristicIndicator 
                              label="Subdomains" 
                              value={result.heuristics.subdomainCount}
                              isWarning={result.heuristics.subdomainCount > 2}
                            />
                            <HeuristicIndicator 
                              label="URL Shortener" 
                              value={result.heuristics.hasShortener ? 'Detected' : 'None'}
                              isWarning={result.heuristics.hasShortener}
                            />
                            <HeuristicIndicator 
                              label="IP Address" 
                              value={result.heuristics.hasIP ? 'Contains IP' : 'No IP'}
                              isWarning={result.heuristics.hasIP}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analytics Sidebar */}
          <div style={{ background: '#0F172A', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 600 }}>Analytics</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '4px' }}>Total Scans</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analytics.totalScans}</div>
              </div>
              <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '4px' }}>Safe URLs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>{analytics.safeCount}</div>
              </div>
              <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '4px' }}>Suspicious</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B' }}>{analytics.suspiciousCount}</div>
              </div>
              <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '4px' }}>Malicious</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444' }}>{analytics.maliciousCount}</div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#94A3B8' }}>Security Tips</h3>
              <ul style={{ 
                margin: 0, 
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px',
                  background: '#1E293B',
                  borderRadius: '6px',
                }}>
                  <span style={{ color: '#3B82F6' }}>🔒</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>Check for HTTPS</div>
                    <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Always ensure the website uses HTTPS for secure communication.</div>
                  </div>
                </li>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px',
                  background: '#1E293B',
                  borderRadius: '6px',
                }}>
                  <span style={{ color: '#3B82F6' }}>🔍</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>Inspect the URL</div>
                    <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Look for misspellings or unusual characters in the domain name.</div>
                  </div>
                </li>
                <li style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px',
                  background: '#1E293B',
                  borderRadius: '6px',
                }}>
                  <span style={{ color: '#3B82F6' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>Be cautious with links</div>
                    <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Don't click on suspicious links in emails or messages.</div>
                  </div>
                </li>
              </ul>
            </div>

            {analytics.lastScanned && (
              <div style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #334155',
                fontSize: '0.75rem',
                color: '#64748B',
                textAlign: 'center',
              }}>
                Last scan: {new Date(analytics.lastScanned).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          body {
            margin: 0;
            padding: 0;
            background: #0b1220;
            color: #E2E8F0;
          }
        `}</style>
      </div>
    </div>
  );
}
