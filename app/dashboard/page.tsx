'use client';
import { useEffect, useState } from 'react';
import { initFirebase } from '../../lib/firebaseClient';
import { getDatabase, ref, onValue } from 'firebase/database';
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';
initFirebase();

export default function Dashboard() {
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=> {
    const db = getDatabase();
    const logsRef = ref(db, 'analysis_logs');
    const unsub = onValue(logsRef, (snap)=> {
      const val = snap.val() || {};
      const arr = Object.values(val);
      arr.sort((a:any,b:any)=> (b.ts||0)-(a.ts||0));
      setLogs(arr.slice(0,500));
    });
    return ()=> unsub();
  }, []);

  const counts = logs.reduce((acc:any,l:any)=> { acc.total=(acc.total||0)+1; acc[l.verdict]=(acc[l.verdict]||0)+1; return acc; }, {});
  const pieData = [{name:'safe',value:counts.safe||0},{name:'moderate',value:counts.moderate||0},{name:'malicious',value:counts.malicious||0}];
  const COLORS=['#16a34a','#f59e0b','#ef4444'];
  const trendData = [];
  // aggregate by day
  const byDay:any = {};
  logs.forEach((l:any)=>{ const d = new Date(l.ts||0).toISOString().slice(0,10); byDay[d]=(byDay[d]||[]); byDay[d].push(l.score||0); });
  for(const k of Object.keys(byDay).sort()) { const arr=byDay[k]; const avg = arr.reduce((a:number,b:number)=>a+b,0)/arr.length; trendData.push({date:k,avg:Math.round(avg)}); }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded shadow">
        <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
        <div style={{height:220}} className="mt-3">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" outerRadius={80} label>{pieData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}</Pie><Tooltip/></PieChart></ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded">
          <h4 className="font-medium">Trend (average score per day)</h4>
          <div style={{height:200}} className="mt-2">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="avg" stroke="#60a5fa" /></LineChart></ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <h4 className="font-medium">Recent Logs</h4>
          <div className="max-h-64 overflow-auto mt-2">{logs.map((l,i)=>(<div key={i} className="p-2 border-b border-slate-700">{new Date(l.ts||0).toLocaleString()} — <strong>{l.verdict}</strong> — {Math.round(l.score||0)}</div>))}</div>
        </div>
      </div>
    </div>
  );
}
