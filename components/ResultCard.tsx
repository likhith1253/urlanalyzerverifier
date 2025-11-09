export default function ResultCard({ result }: { result:any }) {
  return (
    <div className="bg-slate-800 p-6 rounded shadow">
      <h3 className="text-lg font-semibold">Result</h3>
      <p className="text-sm text-gray-400 mt-2">{result.summary}</p>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <h4 className="font-medium">Verdict</h4>
          <div className="text-2xl font-bold">{result.verdict}</div>
          <h4 className="mt-3 font-medium">Reasons</h4>
          <ul className="list-disc pl-5">{(result.reasons||[]).map((r:string,i:number)=>(<li key={i}>{r}</li>))}</ul>
        </div>
        <div>
          <h4 className="font-medium">Score & Heuristics</h4>
          <div className="text-2xl font-bold">{Math.round(result.score)}/100</div>
          <pre className="mt-3 text-sm bg-slate-900 p-3 rounded">{JSON.stringify(result.heuristics||{},null,2)}</pre>
        </div>
      </div>
    </div>
  );
}
