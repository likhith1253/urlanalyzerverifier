export default function ResultCard({ result }: { result:any }){
  return (
    <div className="glass p-6">
      <h3 className="text-xl font-semibold">Analysis</h3>
      <p className="text-sm text-gray-300 mt-2">{result.summary}</p>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <h4 className="font-medium">Verdict</h4>
          <div className="text-2xl font-bold mt-1">{result.verdict}</div>
          <h4 className="mt-3 font-medium">Reasons (factual)</h4>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-200">
            {(result.reasons && result.reasons.length>0) ? result.reasons.map((r:string,i:number)=>(<li key={i}>{r}</li>))
            : <li>No explicit reasons returned by AI — showing heuristic hints.</li>}
          </ul>
        </div>
        <div>
          <h4 className="font-medium">Score & Metadata</h4>
          <div className="text-2xl font-bold mt-1">{Math.round(result.score)}/100</div>
          <div className="mt-3 text-sm">Category: <strong>{result.category}</strong></div>
          <pre className="mt-3 text-sm bg-slate-900 p-3 rounded">{JSON.stringify(result.heuristics||{},null,2)}</pre>
        </div>
      </div>
    </div>
  );
}
