export function heuristicScore(url:string){
  let score=30;
  if(/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(url)) score+=30;
  if(/(login|signin|verify|confirm|secure|update|account|bank)/i.test(url)) score+=25;
  if(url.length>100) score+=10;
  if(/[^\x00-\x7F]/.test(url)) score+=10;
  return Math.min(95,score);
}
