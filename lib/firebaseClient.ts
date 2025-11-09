import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, get } from 'firebase/database';
import { getAnalytics, logEvent } from 'firebase/analytics';

export function initFirebase() {
  if (typeof window === 'undefined') return;
  if (getApps().length) return;
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
  try {
    initializeApp(config);
    try { getAnalytics(); } catch(e) {}
  } catch(e) {
    console.warn('firebase init failed', e);
  }
}

export function logAnalyzeEvent() {
  try {
    const analytics = getAnalytics();
    logEvent(analytics, 'analyze_url');
  } catch (e) { /* ignore */ }
}

export async function logToRealtimeDB(payload) {
  try {
    const db = getDatabase();
    await push(ref(db, 'analysis_logs'), payload);
  } catch (e) {
    console.warn('realtime write failed', e);
    throw e;
  }
}

export async function getAnalysisHistory(limit = 10) {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, 'analysis_logs'));
    if (snapshot.exists()) {
      const history = [];
      snapshot.forEach((child) => {
        history.push({
          id: child.key,
          ...child.val()
        });
      });
      // Return the most recent entries first, limited by the specified limit
      return history.reverse().slice(0, limit);
    }
    return [];
  } catch (e) {
    console.warn('Failed to fetch analysis history', e);
    throw e;
  }
}
