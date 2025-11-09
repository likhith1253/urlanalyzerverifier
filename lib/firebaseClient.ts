import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';
import { getAnalytics, logEvent } from 'firebase/analytics';

export function initFirebase(){ if(typeof window==='undefined') return; if(getApps().length) return;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
  try{ initializeApp(config); try{ getAnalytics(getApp()); }catch(e){} }catch(e){ console.warn('firebase init failed',e); }
}

export function logAnalyzeEvent(){ try{ const a = getAnalytics(); logEvent(a,'analyze_url'); }catch(e){} }

export async function logToRealtimeDB(payload:any){ try{ const db = getDatabase(); await push(ref(db,'analysis_logs'), payload); }catch(e){ console.warn('realtime write failed',e); throw e; } }

export async function hashUrl(url:string){ if(typeof window==='undefined') return ''; const enc=new TextEncoder(); const data = enc.encode(url); const hash = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
