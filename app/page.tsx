'use client';
import { useState } from 'react';
import RiskBar from '../components/RiskBar';
import ResultCard from '../components/ResultCard';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../lib/firebaseClient';
initFirebase();

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [error,setError]=useState(null);

  async function analyze() {
    setLoading(true); setError(null); setResult(null);
    try {
      logAnalyzeEvent();
      const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Analyze failed');
      const h = await hashUrl(url);
      await logToRealtimeDB({ urlHash: h, verdict: data.verdict, score: data.score, ts: Date.now() }).catch(()=>{});
      setResult(data);
    } catch(e:any) { setError(e.message||String(e)); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold">Analyze a URL</h2>
        <p className="text-sm text-gray-400">Paste a single URL and get an AI + heuristic powered risk analysis.</p>
        <div className="mt-4 flex gap-3">
          <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://example.com" className="flex-1 p-3 rounded bg-slate-700/50 border border-slate-600"/>
          <button onClick={analyze} disabled={loading} className="px-4 py-2 bg-blue-600 rounded">{loading?'Analyzing...':'Analyze'}</button>
        </div>
      </div>

      <RiskBar score={result?.score ?? null} />

      {error && <div className="text-red-400">{String(error)}</div>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
