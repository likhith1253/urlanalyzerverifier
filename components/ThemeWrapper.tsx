"use client";
import { ReactNode, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const [theme, setTheme] = useState<Theme>('dark');
  
  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
  }, []);

  // Apply theme class to root element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Save to localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div 
              className="text-2xl font-bold bg-clip-text text-transparent" 
              style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }}
            >
              LinkLens
            </div>
            <div className="text-sm opacity-80 hidden sm:inline">
              AI-powered URL Risk Visualizer
            </div>
          </div>
          
          <nav className="flex items-center gap-4">
            <a 
              href="/" 
              className="text-sm hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Analyze
            </a>
            <a 
              href="/batch" 
              className="text-sm hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Batch
            </a>
            <a 
              href="/dashboard" 
              className="text-sm hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Dashboard
            </a>
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
      
      <footer className="text-center p-4 text-sm text-gray-500 dark:text-gray-400 border-t border-slate-200 dark:border-slate-700">
        LinkLens © {new Date().getFullYear()} — Built with Gemini & Firebase
      </footer>
    </div>
  );
}
