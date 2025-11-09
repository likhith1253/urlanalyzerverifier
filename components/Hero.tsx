export default function Hero(){ return (
  <section className="glass p-8 border-slate-700">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <h1 className="text-3xl font-bold">LinkLens — AI-powered URL Risk Visualizer</h1>
        <p className="mt-2 text-gray-300">Analyze, visualize and monitor URL risk using AI and heuristic scoring. Built to impress recruiters.</p>
        <div className="mt-4 flex gap-3">
          <a href="#" className="btn bg-gradient-to-r from-violet-600 to-cyan-500 text-white">Get started</a>
          <a href="/dashboard" className="btn glass">View Analytics</a>
        </div>
      </div>
      <div className="w-full md:w-1/2">
        <div className="p-6 glass">
          <h4 className="font-medium">Why LinkLens?</h4>
          <ul className="mt-2 text-sm list-disc pl-5 text-gray-300">
            <li>Factual AI explanations (Gemini)</li>
            <li>Anonymized logging for privacy</li>
            <li>Batch mode & downloadable reports</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
); }
