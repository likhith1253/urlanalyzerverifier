'use client';
import { useState } from 'react';
import Hero from '../components/Hero';
import RiskBar from '../components/RiskBar';
import ConfidenceBar from '../components/ConfidenceBar';
import ResultCard from '../components/ResultCard';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../lib/firebaseClient';
initFirebase();

export default function Page(){
  const [url,setUrl]=useState('');
  const [result,setResult]:any=useState(null);
  const [loading,setLoading]=useState(false);
  const [anonLogging,setAnonLogging]=useState(true);

  async function analyze(){ setLoading(true); setResult(null);
    try{
      logAnalyzeEvent();
      const res = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||'Analysis failed');
      setResult(data);
      const h = anonLogging ? await hashUrl(url) : null;
      try{ await logToRealtimeDB({ urlHash: h, verdict: data.verdict, score: data.score, category: data.category, ts: Date.now() }); }catch(e){}
    }catch(e:any){ alert(e.message||String(e)); } finally{ setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Hero />
      <div className="glass p-6">
        <h3 className="text-lg font-semibold">Analyze a URL</h3>
        <p className="text-sm text-gray-300">Paste a single URL and get an AI + heuristic powered factual analysis.</p>
        <div className="mt-4 flex gap-3">
          <input className="flex-1 p-3 rounded bg-transparent border border-slate-700" placeholder="https://example.com" value={url} onChange={e=>setUrl(e.target.value)} />
          <button className="btn bg-gradient-to-r from-violet-600 to-cyan-500 text-white" onClick={analyze} disabled={loading}>{loading?'Analyzing...':'Analyze'}</button>
        </div>
        <div className="mt-3 flex items-center gap-4"><label className="text-sm">Anonymous logging</label><input type="checkbox" checked={anonLogging} onChange={e=>setAnonLogging(e.target.checked)} /></div>
      </div>

      <RiskBar score={result?.score ?? null} />
      <ConfidenceBar confidence={result?.confidence ?? null} />
      {result && <ResultCard result={result} />}
    </div>
  );
}
