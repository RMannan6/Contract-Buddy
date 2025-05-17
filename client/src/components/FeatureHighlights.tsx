export default function FeatureHighlights() {
  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-start space-x-3 hover:border-slate-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <a href="#" className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true"></span>
              <p className="text-sm font-medium text-slate-900">Find Risky Clauses</p>
              <p className="text-sm text-slate-500">Our AI identifies problematic terms that could put you at risk.</p>
            </a>
          </div>
        </div>

        <div className="relative rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-start space-x-3 hover:border-slate-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <a href="#" className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true"></span>
              <p className="text-sm font-medium text-slate-900">Get Plain-English Explanations</p>
              <p className="text-sm text-slate-500">Understand complex legal terms without a law degree.</p>
            </a>
          </div>
        </div>

        <div className="relative rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-start space-x-3 hover:border-slate-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <a href="#" className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true"></span>
              <p className="text-sm font-medium text-slate-900">Improve Your Position</p>
              <p className="text-sm text-slate-500">Get alternative wording that better protects your interests.</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
