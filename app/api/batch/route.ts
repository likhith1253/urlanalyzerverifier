import { NextResponse } from 'next/server';
import { analyzeWithGemini } from '../../../lib/ai';
import { heuristicScore } from '../../../lib/heuristics';

export async function POST(req:any){
  try{
    const { url } = await req.json();
    if(!url) return NextResponse.json({error:'No URL provided'},{status:400});
    try { new URL(url); } catch { return NextResponse.json({error:'Invalid URL'},{status:400}); }
    const hScore = heuristicScore(url);
    const key = process.env.GEMINI_API_KEY;
    let ai = { verdict:'unknown', reasons:[], summary:'', category:'unknown', confidence:50 };
    if(key) ai = await analyzeWithGemini(key,url).catch(()=>ai);
    let score = hScore;
    if(ai.verdict==='malicious') score = Math.max(score,70) + (ai.confidence?Math.round(ai.confidence/10):0);
    else if(ai.verdict==='moderate') score = Math.max(score,45) + (ai.confidence?Math.round(ai.confidence/20):0);
    else if(ai.verdict==='safe') score = Math.max(score,30) + 0;
    score = Math.min(99, Math.max(30, Math.round(score)));
    if(score<40) score = Math.max(35, score);
    return NextResponse.json({ verdict: ai.verdict|| (score>=70?'malicious':(score>=40?'moderate':'safe')), reasons: ai.reasons||[], summary: ai.summary||'', category:ai.category||'unknown', confidence: ai.confidence||50, score });
  }catch(e:any){ console.error(e); return NextResponse.json({error:'batch_failed',detail:e.message||String(e)},{status:500}); }
}
