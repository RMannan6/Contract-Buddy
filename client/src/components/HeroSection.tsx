import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
        Make Contracts Work <span className="text-primary">For You</span>
      </h1>
      <p className="mt-5 max-w-xl mx-auto text-xl text-slate-600">
        Upload your contract and get AI-powered insights and suggestions to negotiate better terms in minutes, not hours.
      </p>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-md shadow">
          <a href="#upload-section" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-blue-700">
            Analyze Your Contract
          </a>
        </div>
        <div className="ml-3 inline-flex">
          <a href="#how-it-works" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-slate-100">
            How It Works
          </a>
        </div>
      </div>
    </div>
  );
}
