'use client';
import { useEffect, useMemo, useState } from 'react';
import { initFirebase } from '../../lib/firebaseClient';
import { getDatabase, ref, onValue } from 'firebase/database';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
initFirebase();

export default function Dashboard(){
  const [logs,setLogs]=useState<any[]>([]);
  const [filter,setFilter]=useState({verdict:'all',category:'all',min:0,max:100});

  useEffect(()=>{
    const db = getDatabase();
    const logsRef = ref(db,'analysis_logs');
    const unsub = onValue(logsRef,(snap)=>{ const val = snap.val() || {}; const arr = Object.values(val); arr.sort((a:any,b:any)=> (b.ts||0)-(a.ts||0)); setLogs(arr.slice(0,1000)); });
    return ()=> unsub();
  },[]);

  const filtered = useMemo(()=> logs.filter(l=> (filter.verdict==='all' || l.verdict===filter.verdict) && (filter.category==='all' || l.category===filter.category) && (l.score>=filter.min && l.score<=filter.max) ), [logs,filter]);

  const counts = logs.reduce((acc:any,l:any)=>{ acc.total=(acc.total||0)+1; acc[l.verdict]=(acc[l.verdict]||0)+1; acc[l.category]=(acc[l.category]||0)+1; return acc; },{});
  const pie = [{name:'safe',value:counts.safe||0},{name:'moderate',value:counts.moderate||0},{name:'malicious',value:counts.malicious||0}];
  const COLORS = ['#16a34a','#f59e0b','#ef4444'];

  const scatterData = filtered.map((l:any, i:number)=>({ x: i, y: l.score || 0, r: 5 + ((l.score||0)/20), v: l.verdict, c: l.category }));
  // trend avg by day
  const byDay:any = {};
  logs.forEach((l:any)=>{ const d = new Date(l.ts||0).toISOString().slice(0,10); byDay[d]=byDay[d]||[]; byDay[d].push(l.score||0); });
  const trend = Object.keys(byDay).sort().map(k=>({ date:k, avg: Math.round(byDay[k].reduce((a:number,b:number)=>a+b,0)/byDay[k].length) }));

  const categories = Array.from(new Set(logs.map(l=>l.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="glass p-6"><h3 className="text-lg font-semibold">Analytics</h3><p className="text-sm text-gray-300">Realtime local analytics (anonymized hashes)</p>
        <div style={{height:220}} className="mt-3"><ResponsiveContainer width='100%' height='100%'><PieChart><Pie data={pie} dataKey='value' outerRadius={80} label>{pie.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass p-4"><h4 className="font-medium">Trend (avg score per day)</h4><div style={{height:200}} className="mt-3"><ResponsiveContainer width='100%' height='100%'><LineChart data={trend}><XAxis dataKey='date'/><YAxis/><Tooltip/><Line type='monotone' dataKey='avg' stroke='#60a5fa' /></LineChart></ResponsiveContainer></div></div>

        <div className="glass p-4"><h4 className="font-medium">Heatmap / Scatter (clusters)</h4><div style={{height:260}} className="mt-3"><ResponsiveContainer width='100%' height='100%'><ScatterChart><CartesianGrid /><XAxis dataKey='x' name='index' /><YAxis dataKey='y' name='score' /><Tooltip /><Scatter name='scores' data={scatterData} fill='#8884d8' /></ScatterChart></ResponsiveContainer></div></div>
      </div>

      <div className="glass p-4"><h4 className="font-medium">Filters</h4>
        <div className="mt-2 flex gap-3"><select value={filter.verdict} onChange={(e)=>setFilter({...filter,verdict:e.target.value})} className="p-2 bg-transparent border border-slate-700 rounded"><option value='all'>All</option><option value='safe'>Safe</option><option value='moderate'>Moderate</option><option value='malicious'>Malicious</option></select>
        <select value={filter.category} onChange={(e)=>setFilter({...filter,category:e.target.value})} className="p-2 bg-transparent border border-slate-700 rounded"><option value='all'>All categories</option>{categories.map(c=>(<option key={c} value={c}>{c}</option>))}</select>
        <div className="flex items-center gap-2"><input type='number' value={filter.min} onChange={(e)=>setFilter({...filter,min:parseInt(e.target.value||'0')})} className="p-2 w-20 bg-transparent border border-slate-700 rounded"/> to <input type='number' value={filter.max} onChange={(e)=>setFilter({...filter,max:parseInt(e.target.value||'100')})} className="p-2 w-20 bg-transparent border border-slate-700 rounded"/></div>
        </div>
      </div>

      <div className="glass p-4"><h4 className="font-medium">Recent Logs (anonymized)</h4><div className="max-h-64 overflow-auto mt-2">{filtered.map((l,i)=>(<div key={i} className="p-2 border-b border-slate-700"><div className="text-xs text-gray-400">{new Date(l.ts||0).toLocaleString()}</div><div><strong>{l.verdict}</strong> — score: {Math.round(l.score||0)} — {l.category}</div></div>))}</div></div>
    </div>
  );
}
