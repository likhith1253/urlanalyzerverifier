# URL Analyzer — Next.js + Firebase Realtime DB + Analytics + Gemini 2.5 Pro

This project analyzes URLs using Gemini 2.5 Pro and logs results to Firebase Realtime Database.
It also emits Firebase Analytics events ("analyze_url") for each analysis.

## Quick setup

1. Regenerate your Gemini API key (do NOT share publicly) and copy it.
2. In Firebase Console (project urlanalyzer-de27e):
   - Enable **Realtime Database** (Build → Realtime Database → Create Database → start in test mode).
   - Register a **Web app** and copy the config values.

3. Download/unzip this project, then:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and paste GEMINI_API_KEY and NEXT_PUBLIC_FIREBASE_* values
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 — enter a URL and click Analyze.

## Deployment (Vercel)
- Push to GitHub, create a Vercel project connecting the repo.
- Add environment variables in Vercel (GEMINI_API_KEY and NEXT_PUBLIC_FIREBASE_*).
- Deploy.

## Notes
- The server uses the Gemini 2.5 Pro endpoint:
  https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent
  The API key is sent as a query parameter in the request URL.
- The server asks Gemini to return strict JSON with keys: verdict, reasons[], summary.
- Realtime DB is in test mode (open rules). After testing, tighten security rules.
