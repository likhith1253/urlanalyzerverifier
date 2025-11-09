import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
export const metadata = { title: 'LinkLens — AI-powered URL Risk Visualizer' };

export default function RootLayout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark'|'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
  });
  useEffect(()=> {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.remove('light'), root.classList.add('dark');
    else root.classList.remove('dark'), root.classList.add('light');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-800 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">LinkLens</div>
                <div className="text-sm opacity-80">AI-powered URL Risk Visualizer</div>
              </div>
              <nav className="flex items-center gap-4">
                <a href="/" className="text-sm hover:underline">Analyze</a>
                <a href="/batch" className="text-sm hover:underline">Batch</a>
                <a href="/dashboard" className="text-sm hover:underline">Dashboard</a>
                <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="px-3 py-1 rounded border">Toggle</button>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto p-6">{children}</main>
          <footer className="text-center p-4 text-xs text-gray-400">LinkLens © 2025 — Built with Gemini & Firebase</footer>
        </div>
      </body>
    </html>
  );
}
