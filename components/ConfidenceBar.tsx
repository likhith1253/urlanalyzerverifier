export default function ConfidenceBar({ confidence }: { confidence:number|null }){
  const val = confidence==null?0:Math.max(0,Math.min(100,Math.round(confidence)));
  return (
    <div className="glass p-3">
      <div className="flex justify-between"><div className="text-sm">AI Confidence</div><div className="font-semibold">{confidence==null?'--':val + '%'}</div></div>
      <div className="w-full h-3 bg-slate-800 rounded mt-2 overflow-hidden"><div className="bg-blue-500 h-3 rounded" style={{width:`${val}%`}}/></div>
    </div>
  );
}
