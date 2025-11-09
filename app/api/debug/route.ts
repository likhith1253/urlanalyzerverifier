import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    envKeys: Object.keys(process.env).filter(k => 
      k.startsWith('NEXT_') || 
      k.startsWith('GEMINI_') ||
      k === 'NODE_ENV'
    ).reduce((acc, key) => ({
      ...acc,
      [key]: key.includes('KEY') ? '***REDACTED***' : process.env[key]
    }), {}),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
