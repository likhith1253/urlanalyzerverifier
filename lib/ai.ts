import fetch from 'cross-fetch';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

export async function analyzeWithGemini(key:string, url:string){
  const prompt = `You are a factual security assistant. Analyze this URL and return ONLY a JSON object with keys: verdict (safe/moderate/malicious), reasons (array of short factual strings like "uses IP address", "login token present"), summary (one-line factual), category (one-word), confidence (0-100). URL: ${url}`;
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content:[{type:'text', text:prompt}], max_output_tokens:512 }) });
  const data = await resp.json();
  let text = null;
  if(data?.candidates?.length) text = data.candidates[0].content[0].text;
  else if(data?.output?.[0]?.content?.[0]?.text) text = data.output[0].content[0].text;
  else text = JSON.stringify(data);
  try{ return JSON.parse(text); }catch(e){ const m = text.match(/{[\s\S]*}/); if(m) try{return JSON.parse(m[0]);}catch(e2){} }
  return { verdict:'unknown', reasons:['no AI response parsed'], summary:text, category:'unknown', confidence:50 };
}
