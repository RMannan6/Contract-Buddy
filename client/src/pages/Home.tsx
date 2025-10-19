import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeatureHighlights from "@/components/FeatureHighlights";
import UploadSection from "@/components/UploadSection";
import HowItWorks from "@/components/HowItWorks";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import { PartyIdentificationDialog } from "@/components/PartyIdentificationDialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Extracting text from document...");
  const [showPartyDialog, setShowPartyDialog] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
          }
          return newProgress < 100 ? newProgress : 100;
        });
      }, 100);
      
      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }
      
      const data = await response.json();
      
      // Store document ID and show party identification dialog
      setCurrentDocumentId(data.documentId);
      setShowPartyDialog(true);
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  const startAnalysis = async (documentId: number) => {
    try {
      setIsUploading(false);
      setIsAnalyzing(true);
      setAnalysisProgress(10);
      
      const statusMessages = [
        "Extracting text from document...",
        "Identifying contract clauses...",
        "Comparing to gold-standard terms...",
        "Generating recommendations...",
        "Preparing your report..."
      ];
      
      let messageIndex = 0;
      
      // Update status messages
      const statusInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % statusMessages.length;
        setAnalysisStatus(statusMessages[messageIndex]);
      }, 1500);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          const increment = Math.floor(Math.random() * 15) + 5;
          const newProgress = prev + increment;
          return newProgress < 95 ? newProgress : 95;
        });
      }, 1000);
      
      // Start the analysis
      const response = await fetch(`/api/analyze/${documentId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze document');
      }
      
      const data = await response.json();
      
      // Clear intervals and set final progress
      clearInterval(statusInterval);
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisStatus("Analysis complete!");
      
      // Wait a moment to show 100% progress
      setTimeout(() => {
        setIsAnalyzing(false);
        // Navigate to the analysis page
        setLocation(`/analysis/${documentId}`);
      }, 500);
      
    } catch (error) {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handlePartyDialogComplete = () => {
    if (currentDocumentId) {
      startAnalysis(currentDocumentId);
    }
  };

  return (
    <div className="bg-slate-50 font-sans antialiased text-slate-700 min-h-screen">
      <Header />
      
      {currentDocumentId && (
        <PartyIdentificationDialog
          open={showPartyDialog}
          onOpenChange={setShowPartyDialog}
          documentId={currentDocumentId}
          onComplete={handlePartyDialogComplete}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Banner */}
        <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <strong>Disclaimer:</strong> ContractBuddy is an AI tool designed to assist with contract review. The suggestions provided are not legal advice. Always consult with a qualified attorney for legal matters.
              </p>
            </div>
          </div>
        </div>
        
        <HeroSection />
        
        <FeatureHighlights />
        
        <UploadSection 
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          analysisStatus={analysisStatus}
          onFileUpload={handleFileUpload}
        />
        
        <HowItWorks />
        
        <FAQ />
      </div>
      
      <Footer />
    </div>
  );
}
