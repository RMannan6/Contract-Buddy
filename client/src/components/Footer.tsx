export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="text-primary h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xl font-bold text-secondary">ContractBuddy</span>
            </div>
            <p className="mt-4 text-sm text-slate-600">Making contracts work for you with AI-powered insights and suggestions.</p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-slate-800 tracking-wider uppercase">Product</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Features</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Pricing</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">API</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Enterprise</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-slate-800 tracking-wider uppercase">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Documentation</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Guides</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Blog</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-slate-800 tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">About</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Careers</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Privacy</a></li>
              <li><a href="#" className="text-sm text-slate-600 hover:text-primary">Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between">
          <p className="text-sm text-slate-500">&copy; 2023 ContractBuddy AI. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="text-slate-500 hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </a>
            <a href="#" className="text-slate-500 hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
              </svg>
            </a>
            <a href="#" className="text-slate-500 hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
