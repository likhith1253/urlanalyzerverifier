import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, push, Database } from 'firebase/database';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';

interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  databaseURL: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
  measurementId: string | undefined;
}

interface AnalysisLog {
  urlHash: string | null;
  verdict: string;
  score: number;
  category: string;
  riskScore?: number;
  confidence?: number;
  timestamp?: number;
  metadata?: Record<string, any>;
  ts: number;
}

export function initFirebase(): void {
  if (typeof window === 'undefined') return;
  if (getApps().length) return;
  
  const config: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  try {
    const app: FirebaseApp = initializeApp(config);
    try {
      getAnalytics(app);
    } catch (e) {
      console.warn('Firebase Analytics initialization failed', e);
    }
  } catch (e) {
    console.warn('Firebase initialization failed', e);
  }
}

export function logAnalyzeEvent(): void {
  try {
    const analytics = getAnalytics();
    logEvent(analytics, 'analyze_url');
  } catch (e) {
    console.warn('Failed to log analytics event', e);
  }
}

export async function logToRealtimeDB(payload: AnalysisLog): Promise<void> {
  try {
    const db: Database = getDatabase();
    await push(ref(db, 'analysis_logs'), payload);
  } catch (e) {
    console.warn('Failed to write to Realtime Database', e);
    throw e;
  }
}

export async function hashUrl(url: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  try {
    const enc = new TextEncoder();
    const data = enc.encode(url);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    console.warn('Failed to hash URL', e);
    return '';
  }
}
