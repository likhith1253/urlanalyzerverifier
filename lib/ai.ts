import fetch from 'cross-fetch';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface AISafetySetting {
  category: string;
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface AIAnalysisResult {
  verdict: 'safe' | 'moderate' | 'malicious' | 'unknown';
  reasons: string[];
  summary: string;
  category: string;
  confidence: number;
  riskScore: number;
  metadata?: {
    isPhishing?: boolean;
    isMalware?: boolean;
    isSuspicious?: boolean;
    reputationScore?: number;
  };
}

const SAFETY_SETTINGS: AISafetySetting[] = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_ONLY_HIGH',
  },
];

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    return fetchWithRetry(url, options, retries - 1);
  }
}

export async function analyzeWithGemini(key: string, url: string): Promise<AIAnalysisResult> {
  const systemPrompt = `You are a highly skilled cybersecurity analyst. Analyze the following URL thoroughly and provide a detailed security assessment.`;
  
  const prompt = `Analyze the security of this URL: ${url}

Provide a detailed security analysis including:
1. Verdict: One of 'safe', 'moderate', or 'malicious'
2. Risk Score: 0-100 (100 being most dangerous)
3. Category: Primary threat category (e.g., phishing, malware, scam)
4. Confidence: 0-100% confidence in the assessment
5. Detailed Reasons: Array of specific findings
6. Summary: One-line summary
7. Metadata: Additional security flags

Respond ONLY with a valid JSON object in this exact structure:
{
  "verdict": "string",
  "reasons": ["string"],
  "summary": "string",
  "category": "string",
  "confidence": number,
  "riskScore": number,
  "metadata": {
    "isPhishing": boolean,
    "isMalware": boolean,
    "isSuspicious": boolean,
    "reputationScore": number
  }
}`;

  try {
    const response = await fetchWithRetry(
      `${GEMINI_ENDPOINT}?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
          safetySettings: SAFETY_SETTINGS,
        })
      }
    );

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text || 
              response.output?.[0]?.content?.[0]?.text || 
              JSON.stringify(response);

    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }

    // Parse the response
    const result = JSON.parse(text) as AIAnalysisResult;
    
    // Ensure required fields exist
    return {
      verdict: result.verdict || 'unknown',
      reasons: Array.isArray(result.reasons) ? result.reasons : ['No specific reasons provided'],
      summary: result.summary || 'No summary available',
      category: result.category || 'unknown',
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
      riskScore: Math.min(100, Math.max(0, result.riskScore || 50)),
      metadata: {
        isPhishing: result.metadata?.isPhishing || false,
        isMalware: result.metadata?.isMalware || false,
        isSuspicious: result.metadata?.isSuspicious || false,
        reputationScore: Math.min(100, Math.max(0, result.metadata?.reputationScore || 50)),
      },
    };
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    return {
      verdict: 'unknown',
      reasons: ['Failed to analyze URL: ' + (error instanceof Error ? error.message : 'Unknown error')],
      summary: 'Analysis failed',
      category: 'error',
      confidence: 0,
      riskScore: 50,
      metadata: {
        isPhishing: false,
        isMalware: false,
        isSuspicious: true,
        reputationScore: 50,
      },
    };
  }
}

// Cache implementation (in-memory for now, can be replaced with Redis or similar)
const analysisCache = new Map<string, Promise<AIAnalysisResult>>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function getCachedAnalysis(url: string, key: string): Promise<AIAnalysisResult> {
  const cacheKey = `analysis:${url}`;
  const cached = analysisCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const analysisPromise = analyzeWithGemini(key, url);
  analysisCache.set(cacheKey, analysisPromise);
  
  // Clean up cache after TTL
  setTimeout(() => {
    analysisCache.delete(cacheKey);
  }, CACHE_TTL);

  return analysisPromise;
}
