"use client";
import { ReactNode, useEffect, useState } from 'react';

export default function ThemeWrapper({ children }: { children: ReactNode }){
  const [theme,setTheme] = useState<'dark'|'light'>(()=>{
    if(typeof window==='undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
  });
  useEffect(()=>{
    const root = document.documentElement;
    if(theme==='dark'){ root.classList.remove('light'); root.classList.add('dark'); }
    else { root.classList.remove('dark'); root.classList.add('light'); }
    localStorage.setItem('theme', theme);
  },[theme]);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold bg-clip-text text-transparent" style={{background: 'linear-gradient(90deg,#7c3aed,#06b6d4)'}}>LinkLens</div>
            <div className="text-sm opacity-80">AI-powered URL Risk Visualizer</div>
          </div>
          <nav className="flex items-center gap-3">
            <a href="/" className="text-sm hover:underline">Analyze</a>
            <a href="/batch" className="text-sm hover:underline">Batch</a>
            <a href="/dashboard" className="text-sm hover:underline">Dashboard</a>
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="btn glass">Toggle</button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto p-6">{children}</main>
      <footer className="text-center p-4 text-sm text-gray-400">LinkLens © {new Date().getFullYear()} — Built with Gemini & Firebase</footer>
    </div>
  );
}
