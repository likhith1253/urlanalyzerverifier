import fetch from 'cross-fetch';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

export async function analyzeWithGemini(key:string, url:string) {
  const prompt = `You are a security assistant. Analyze the following URL and return ONLY a JSON object with keys: verdict (safe/moderate/malicious), reasons (array), summary (one-line), category (one-word), confidence (0-100). URL: ${url}`;
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ content:[{type:'text', text:prompt}], max_output_tokens:512 })
  });
  const data = await resp.json();
  // best-effort extract text
  let text = null;
  if (data?.candidates?.length) text = data.candidates[0].content[0].text;
  else if (data?.output?.[0]?.content?.[0]?.text) text = data.output[0].content[0].text;
  else text = JSON.stringify(data);
  // attempt parse
  try { return JSON.parse(text); } catch(e){
    const m = text.match(/{[\s\S]*}/);
    if(m) try{ return JSON.parse(m[0]); }catch(e2){}
  }
  return { verdict:'unknown', reasons:[], summary:text, category:'unknown', confidence:50 };
}
