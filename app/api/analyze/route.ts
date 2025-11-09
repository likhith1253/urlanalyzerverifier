import { NextResponse } from 'next/server';

// Debug: Log environment variables at module load time
console.log('Environment variables at module load:', {
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  nodeEnv: process.env.NODE_ENV,
  allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_') || k.startsWith('GEMINI_'))
});

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

function validateUrl(url: string): string | null {
  try { 
    const parsed = new URL(url); 
    return /https?:/.test(parsed.protocol) ? parsed.href : null; 
  } catch { 
    return null; 
  }
}

function analyzeUrlHeuristics(url: string) {
  return {
    length: url.length,
    hasIP: /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(url),
    hasShortener: /\.(?:bit\.ly|goo\.gl|t\.co|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|adf\.ly|bit\.do|shorte\.st)\//i.test(url),
    hasSuspiciousKeywords: /(login|verify|secure|confirm|account|update|billing|payment|signin|signup|password|reset|wallet|crypto|banking)/i.test(url),
    hasSpecialChars: /[^a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]/.test(url.split('?')[0]),
    isHttps: url.startsWith('https://'),
    subdomainCount: (url.match(/\./g) || []).length - (url.startsWith('http') ? 2 : 0)
  };
}

export async function POST(req: Request) {
  console.log('Received request to analyze URL');
  
  try {
    const body = await req.json();
    const url = body?.url?.trim();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    const safeUrl = validateUrl(url);
    if (!safeUrl) {
      return NextResponse.json({ 
        error: 'Invalid URL',
        message: 'Please enter a valid URL including http:// or https://'
      }, { status: 400 });
    }

    const heuristics = analyzeUrlHeuristics(safeUrl);
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
      console.error('No GEMINI_API_KEY found in environment variables');
      return NextResponse.json({
        error: 'Server configuration error',
        message: 'API key is not configured',
        _debug: {
          hasKey: false,
          envKeys: Object.keys(process.env).filter(k => 
            k.startsWith('NEXT_') || k.startsWith('GEMINI_') || k === 'NODE_ENV'
          ),
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    try {
      const prompt = `Analyze this URL for security threats: ${safeUrl}
      
      Return a JSON object with:
      - verdict: 'safe', 'suspicious', or 'malicious'
      - reasons: array of strings explaining the verdict
      - summary: brief analysis summary
      - confidence: 'high', 'medium', or 'low'`;

      console.log('Sending request to Gemini API');
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API error:', data);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No response content from Gemini');
      }

      // Try to extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;
      const result = JSON.parse(jsonString);

      return NextResponse.json({
        url: safeUrl,
        verdict: result.verdict || 'unknown',
        reasons: Array.isArray(result.reasons) ? result.reasons : ['No analysis available'],
        summary: result.summary || 'No summary available',
        confidence: result.confidence || 'low',
        heuristics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to heuristic analysis
      const fallbackVerdict = heuristics.hasIP || heuristics.hasShortener || 
        (heuristics.hasSuspiciousKeywords && heuristics.hasSpecialChars) 
        ? 'suspicious' : 'likely_safe';
      
      const fallbackReasons = [
        heuristics.hasIP && 'Contains IP address',
        heuristics.hasShortener && 'Uses URL shortener',
        heuristics.hasSuspiciousKeywords && 'Contains suspicious keywords',
        heuristics.hasSpecialChars && 'Has unusual characters',
        !heuristics.isHttps && 'Not using HTTPS',
        heuristics.subdomainCount > 2 && 'Multiple subdomains detected'
      ].filter(Boolean);

      return NextResponse.json({
        url: safeUrl,
        verdict: fallbackVerdict,
        reasons: fallbackReasons,
        summary: fallbackReasons.length > 0 
          ? 'This URL shows several suspicious characteristics. Proceed with caution.'
          : 'This URL appears to be safe based on basic analysis.',
        confidence: fallbackReasons.length > 0 ? 'high' : 'medium',
        heuristics,
        timestamp: new Date().toISOString(),
        _fallback: true
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
