import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadContract, analyzeContract, getAnalysisResults } from "@/lib/contract-analysis";
import { useLocation } from "wouter";

export function useAnalysis() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Extracting text from document...");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const simulateProgress = (setter: React.Dispatch<React.SetStateAction<number>>, targetValue: number, intervalTime: number): NodeJS.Timeout => {
    return setInterval(() => {
      setter(prev => {
        const increment = Math.floor(Math.random() * 15) + 5;
        const newProgress = prev + increment;
        return newProgress < targetValue ? newProgress : targetValue;
      });
    }, intervalTime);
  };
  
  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress updates for upload
      const uploadProgressInterval = simulateProgress(setUploadProgress, 95, 100);
      
      // Upload the file
      const documentId = await uploadContract(file);
      
      // Clear interval and set final progress
      clearInterval(uploadProgressInterval);
      setUploadProgress(100);
      
      // Start analysis
      await startAnalysis(documentId);
      
    } catch (error) {
      setIsUploading(false);
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
      
      // Update status messages
      let messageIndex = 0;
      const statusInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % statusMessages.length;
        setAnalysisStatus(statusMessages[messageIndex]);
      }, 1500);
      
      // Simulate progress updates for analysis
      const analysisProgressInterval = simulateProgress(setAnalysisProgress, 95, 1000);
      
      // Start the analysis
      await analyzeContract(documentId);
      
      // Clear intervals and set final progress
      clearInterval(statusInterval);
      clearInterval(analysisProgressInterval);
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

  return {
    isUploading,
    uploadProgress,
    isAnalyzing,
    analysisProgress,
    analysisStatus,
    handleFileUpload
  };
}
