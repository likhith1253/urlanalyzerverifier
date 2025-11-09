import { NextResponse } from 'next/server';
import fetch from 'cross-fetch';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

export async function POST(req:any){
  try{
    const { urls } = await req.json();
    if(!urls || !urls.length) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    const prompt = `You are a security analyst. Given the following list of URLs, find common patterns and summarize clusters (common tokens, categories, suspicious tokens). Return a JSON with keys: summary (one paragraph), clusters (array of { token, count, sampleUrls }). List top 5 tokens.` + "\n\n" + urls.slice(0,50).map((u:any,i:number)=>(${`u` + ' /* ' + i + ' */'})).join('\n');
    const key = process.env.GEMINI_API_KEY;
    if(!key) return NextResponse.json({ summary: 'No GEMINI key configured' });
    const resp = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content:[{ type:'text', text:prompt }], max_output_tokens:512 }) });
    const data = await resp.json();
    let text = null;
    if(data?.candidates?.length) text = data.candidates[0].content[0].text;
    else if(data?.output?.[0]?.content?.[0]?.text) text = data.output[0].content[0].text;
    else text = JSON.stringify(data);
    try{ const parsed = JSON.parse(text); return NextResponse.json(parsed); }catch(e){ return NextResponse.json({ summary: text }); }
  }catch(e:any){ console.error(e); return NextResponse.json({ error: 'batch_summary_failed', detail: e.message || String(e) }, { status: 500 }); }
}
