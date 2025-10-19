import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalysisResults from "@/components/AnalysisResults";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { NegotiationPoint } from "@shared/schema";

interface PartyInfo {
  userPartyType: string | null;
  party1Name: string | null;
  party2Name: string | null;
  userSelectedParty: string | null;
}

export default function Analysis() {
  const [, params] = useRoute<{ id: string }>("/analysis/:id");
  const { toast } = useToast();
  const documentId = params?.id ? parseInt(params.id) : null;

  const { data, isLoading, error } = useQuery<{ negotiationPoints: NegotiationPoint[] }>({
    queryKey: [`/api/analysis/${documentId}`],
    enabled: !!documentId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: partyInfo } = useQuery<PartyInfo>({
    queryKey: [`/api/document/${documentId}/party-info`],
    enabled: !!documentId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Analysis",
        description: error instanceof Error ? error.message : "Failed to load analysis results",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const sendReportByEmail = (email: string) => {
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Report Sent",
      description: `Analysis report has been sent to ${email}`,
    });
  };

  const downloadPdf = () => {
    // In a real implementation, this would generate and download a PDF
    toast({
      title: "Download Started",
      description: "Your PDF report is being generated and will download shortly",
    });
  };

  return (
    <div className="bg-slate-50 font-sans antialiased text-slate-700 min-h-screen">
      <Header />
      
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
        
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-8">
              <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-64" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              
              {Array(5).fill(null).map((_, i) => (
                <div key={i} className="mb-6">
                  <Skeleton className="h-6 w-full max-w-lg mb-4" />
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : data ? (
          <AnalysisResults 
            negotiationPoints={data.negotiationPoints as NegotiationPoint[]}
            documentId={documentId as number}
            partyInfo={partyInfo || null}
            onEmailReport={sendReportByEmail}
            onDownloadPdf={downloadPdf}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Analysis Results Found</h2>
            <p className="text-slate-600">We couldn't find analysis results for this document. Try uploading another contract.</p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
