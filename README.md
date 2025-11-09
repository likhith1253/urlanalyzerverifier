LinkLens — AI-powered URL Risk Visualizer

Features:
- Single + batch URL analysis (CSV)
- Gemini 1.5 Pro integration for JSON outputs
- Heuristics + AI combined scoring with confidentiality bias toward 'moderate'
- Anonymized URL hashing (SHA-256) before logging to Firebase Realtime DB
- Analytics dashboard with pie chart, trend line, recent logs
- Tailwind responsive UI with dark default theme and light toggle

Local setup:
1. Copy .env.example to .env.local and fill GEMINI_API_KEY and Firebase config.
2. npm install
3. npm run dev
4. Visit http://localhost:3000

To apply the patch instead:
- Save the provided patch file to your repo root and run:
  git apply linklens_revamp.patch
