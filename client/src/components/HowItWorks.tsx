export default function HowItWorks() {
  return (
    <div id="how-it-works" className="mb-16">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">How ContractBuddy Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
            <div className="text-xl font-bold">1</div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Your Contract</h3>
          <p className="text-slate-600">Simply upload your contract in PDF, DOCX, or image format. Our OCR technology will extract all the text automatically.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
            <div className="text-xl font-bold">2</div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">AI-Powered Analysis</h3>
          <p className="text-slate-600">Our AI compares your contract against thousands of "gold standard" clauses to identify areas of concern and opportunities for improvement.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
            <div className="text-xl font-bold">3</div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Get Actionable Insights</h3>
          <p className="text-slate-600">Receive a plain-English report highlighting the top terms to negotiate, why they matter, and specific suggestions for improvement.</p>
        </div>
      </div>
    </div>
  );
}
