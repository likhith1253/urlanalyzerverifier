export default function RiskBar({ score }: { score:number|null }) {
  const display = score==null?0:Math.max(0,Math.min(100,Math.round(score)));
  let color='bg-green-500',label='Unknown';
  if(score==null){label='No result yet'; color='bg-gray-500'}
  else if(display<40){label='Safe'; color='bg-green-500'}
  else if(display<70){label='Moderate'; color='bg-yellow-400'}
  else {label='Malicious'; color='bg-red-500'}
  return (
    <div className="bg-slate-800 p-4 rounded">
      <div className="flex justify-between"><div>Risk Score</div><div className="font-semibold">{score==null?'--':display+'/100'}</div></div>
      <div className="w-full h-4 bg-slate-700 rounded mt-2 overflow-hidden"><div className={`${color} h-4 rounded`} style={{width:`${display}%`, transition:'width 600ms'}}/></div>
      <div className="mt-2 text-sm text-gray-400">{label}</div>
    </div>
  );
}
