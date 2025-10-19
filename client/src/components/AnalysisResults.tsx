import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RiskLevel, getRiskColor, getRiskBgColor, getRiskBorderColor, copyToClipboard, isValidEmail } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { NegotiationPoint } from "@shared/schema";

interface AnalysisResultsProps {
  negotiationPoints: NegotiationPoint[];
  documentId: number;
  onEmailReport: (email: string) => void;
  onDownloadPdf: () => void;
}

export default function AnalysisResults({ 
  negotiationPoints, 
  documentId,
  onEmailReport, 
  onDownloadPdf 
}: AnalysisResultsProps) {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  
  // Function to download a revised contract with all improvements
  const handleDownloadRevisedContract = () => {
    window.location.href = `/api/document/${documentId}/revised`;
    
    toast({
      title: "Downloading revised contract",
      description: "Your revised contract with all recommended changes is being downloaded."
    });
  };
  
  // Function to download a revised contract with tracked changes
  const handleDownloadTrackedChanges = () => {
    window.location.href = `/api/document/${documentId}/revised-with-changes`;
    
    toast({
      title: "Downloading contract with tracked changes",
      description: "Your contract with tracked changes and explanations is being downloaded."
    });
  };

  const handleCopySuggestion = async (suggestion: string) => {
    const success = await copyToClipboard(suggestion);
    
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Suggested text has been copied to your clipboard"
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEmailSubmit = () => {
    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    onEmailReport(email);
    setEmailDialogOpen(false);
    setEmail("");
  };

  // Group non-top 5 clauses by risk level
  const otherClauses = negotiationPoints.slice(5);
  
  return (
    <div id="analysis-results" className="mb-16">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Analysis Results</h2>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEmailDialogOpen(true)}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Report
              </Button>
              <Button 
                variant="outline" 
                onClick={onDownloadPdf}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadRevisedContract}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Revised Contract
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadTrackedChanges}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Download With Tracked Changes
              </Button>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Top 5 Terms to Negotiate</h3>
            <p className="text-slate-600 mb-6">Based on our analysis, these are the most important terms you should consider negotiating:</p>
            
            {negotiationPoints.slice(0, 5).map((point, index) => (
              <div key={index} className="mb-6 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-slate-900">{index + 1}. {point.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBgColor(point.riskLevel as RiskLevel)} ${getRiskColor(point.riskLevel as RiskLevel)}`}>
                      {point.riskLevel === 'high' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {point.riskLevel === 'medium' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {point.riskLevel === 'low' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {point.riskLevel.charAt(0).toUpperCase() + point.riskLevel.slice(1)} Risk
                    </span>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-2">Original Clause:</h5>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                      <p className="clause-highlight">{point.originalClause}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-2">Recommended Change:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                        <p className="font-semibold text-blue-900 mb-2">Suggested Clause:</p>
                        <p className="text-slate-700 leading-relaxed">{point.suggestion}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded border border-green-200 text-sm">
                        <p className="font-semibold text-green-900 mb-2">Why This Change:</p>
                        <p className="text-green-800 leading-relaxed">{point.explanation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleCopySuggestion(point.suggestion)}
                      className="flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Suggestion
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {otherClauses.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Other Contract Elements</h3>
              <p className="text-slate-600 mb-6">We've analyzed other components of your contract. While these didn't make our top 5 concerns, you may want to review them:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherClauses.map((clause, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-l-4 ${getRiskBgColor(clause.riskLevel as RiskLevel)} ${clause.riskLevel === 'high' ? 'border-red-500' : clause.riskLevel === 'medium' ? 'border-amber-500' : 'border-green-500'}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <span className={`h-4 w-4 rounded-full ${clause.riskLevel === 'high' ? 'bg-red-500' : clause.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'} flex items-center justify-center`}>
                          <span className="h-2 w-2 rounded-full bg-white"></span>
                        </span>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-slate-900">{clause.title}</h4>
                        <p className="mt-1 text-xs text-slate-600">{clause.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Analysis Report</DialogTitle>
            <DialogDescription>
              Enter your email address to receive a copy of this analysis report.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="your.email@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailSubmit}>Send Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
