import { NextResponse } from 'next/server';
import { analyzeWithGemini } from '../../../lib/ai';
import { heuristicScore } from '../../../lib/heuristics';

export async function POST(req:any){
  try{
    const { url } = await req.json();
    if(!url) return NextResponse.json({error:'No URL provided'},{status:400});
    try{ new URL(url); }catch{ return NextResponse.json({error:'Invalid URL'},{status:400}); }
    const heur = { length: url.length, hasIP: /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(url), suspiciousTokens:/(login|signin|verify|confirm|secure|update|account|bank)/i.test(url) };
    const hScore = heuristicScore(url);
    const key = process.env.GEMINI_API_KEY;
    let ai = { verdict:'unknown', reasons:[], summary:'', category:'unknown', confidence:50 };
    if(key){ ai = await analyzeWithGemini(key,url).catch(()=>ai); }
    let score = hScore;
    if(ai.verdict==='malicious') score = Math.max(score,70) + Math.round((ai.confidence||50)/10);
    else if(ai.verdict==='moderate') score = Math.max(score,45) + Math.round((ai.confidence||50)/20);
    else if(ai.verdict==='safe') score = Math.max(score,30);
    score = Math.min(99, Math.max(30, Math.round(score)));
    if(score<40) score = Math.max(35, score);
    return NextResponse.json({ url, heuristics:heur, verdict: ai.verdict|| (score>=70?'malicious':(score>=40?'moderate':'safe')), reasons: ai.reasons||[], summary: ai.summary||'', category: ai.category||'unknown', confidence: ai.confidence||50, score });
  }catch(e:any){ console.error(e); return NextResponse.json({error:'analysis_failed',detail:e.message||String(e)},{status:500}); }
}
