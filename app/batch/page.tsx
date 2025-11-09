'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../../lib/firebaseClient';
initFirebase();

export default function BatchPage() {
  const [csv, setCsv]=useState(null);
  const [progress, setProgress]=useState({done:0,total:0});
  const [results, setResults]=useState<any[]>([]);
  const [running, setRunning]=useState(false);

  async function handleFile(e:any){
    const f = e.target.files[0];
    if(!f) return;
    Papa.parse(f, { header:false, complete: (r)=> {
      const urls = r.data.map((row:any)=>row[0]).filter(Boolean);
      setProgress({done:0,total:urls.length});
      runBatch(urls);
    }});
  }

  async function runBatch(urls:string[]){ setRunning(true); const out=[]; for(let i=0;i<urls.length;i++){ try{
      logAnalyzeEvent();
      const res = await fetch('/api/batch', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ url: urls[i] })});
      const data = await res.json();
      out.push({url:urls[i],...data});
      const h = await hashUrl(urls[i]);
      await logToRealtimeDB({urlHash:h,verdict:data.verdict,score:data.score,ts:Date.now()}).catch(()=>{});
      setProgress({done:i+1,total:urls.length});
    }catch(e){ out.push({url:urls[i],error:String(e)}); setProgress({done:i+1,total:urls.length}); }
  } setResults(out); setRunning(false); }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded shadow">
        <h2 className="text-lg font-semibold">Batch Analyze (CSV)</h2>
        <p className="text-sm text-gray-400">Upload a CSV with one URL per row.</p>
        <input type="file" accept=".csv" onChange={handleFile} className="mt-3" />
        <div className="mt-3">{progress.done}/{progress.total} completed</div>
      </div>

      <div>
        <h3 className="font-medium">Results</h3>
        <div className="grid gap-3 mt-2">{results.map((r,i)=>(<div key={i} className="p-3 bg-slate-800 rounded">{r.url} — {r.verdict} — {Math.round(r.score||0)}</div>))}</div>
      </div>
    </div>
  );
}
