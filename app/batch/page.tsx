'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import { initFirebase, logAnalyzeEvent, logToRealtimeDB, hashUrl } from '../../lib/firebaseClient';
initFirebase();

export default function BatchPage(){
  const [results,setResults]=useState<any[]>([]);
  const [progress,setProgress]=useState({done:0,total:0});
  const [running,setRunning]=useState(false);
  const [summary,setSummary]=useState<string|null>(null);

  async function handleFile(e:any){ const f = e.target.files[0]; if(!f) return;
    Papa.parse(f, { complete: (r:any)=> { const urls = r.data.map((row:any)=>row[0]).filter(Boolean); runBatch(urls); } });
  }

  async function runBatch(urls:string[]){
    setRunning(true); setResults([]); setProgress({done:0,total:urls.length}); const out:any[]=[];
    for(let i=0;i<urls.length;i++){
      try{
        logAnalyzeEvent();
        const res = await fetch('/api/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:urls[i]})});
        const data = await res.json();
        out.push({url:urls[i],...data});
        const h = await hashUrl(urls[i]);
        await logToRealtimeDB({urlHash:h,verdict:data.verdict,score:data.score,category:data.category,ts:Date.now()}).catch(()=>{});
      }catch(e){ out.push({url:urls[i],error:String(e)}); }
      setProgress({done:i+1,total:urls.length});
    }
    setResults(out);
    // request AI batch summary
    try{ const r2 = await fetch('/api/batch-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urls: results.length?results.map(r=>r.url):urls})}); const s = await r2.json(); setSummary(s.summary || s.text || null); }catch(e){}
    setRunning(false);
  }

  function downloadCSV(){ const rows = results.map(r=>({url:r.url,verdict:r.verdict,score:r.score,category:r.category})); const csv = 'data:text/csv;charset=utf-8,' + ['url,verdict,score,category', ...rows.map(r=>`${r.url},${r.verdict},${r.score},${r.category}`)].join('\n'); const a = document.createElement('a'); a.setAttribute('href', encodeURI(csv)); a.setAttribute('download','batch_results.csv'); a.click(); }

  return (
    <div className="space-y-6">
      <div className="glass p-6"><h3 className="text-lg font-semibold">Batch Analyze</h3><p className="text-sm text-gray-300">Upload CSV with one URL per row. Download results after run.</p><input type="file" accept=".csv" onChange={handleFile} className="mt-3" /><div className="mt-3">{progress.done}/{progress.total}</div></div>
      {summary && <div className="glass p-4"><h4 className="font-medium">Batch AI Summary</h4><p className="text-sm text-gray-300">{summary}</p></div>}
      <div className="grid gap-3">{results.map((r,i)=>(<div key={i} className="glass p-3">{r.url} — <strong>{r.verdict}</strong> — {Math.round(r.score||0)}</div>))}</div>
      {results.length>0 && <button className="btn bg-gradient-to-r from-violet-600 to-cyan-500 text-white" onClick={downloadCSV}>Download CSV</button>}
    </div>
  );
}
