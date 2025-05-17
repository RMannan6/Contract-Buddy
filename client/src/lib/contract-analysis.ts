import { NegotiationPoint } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Contract analysis interface
export interface ContractAnalysisResult {
  documentId: number;
  negotiationPoints: NegotiationPoint[];
}

// Upload a contract file and return the document ID
export async function uploadContract(file: File): Promise<number> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload contract');
  }
  
  const data = await response.json();
  return data.documentId;
}

// Analyze a contract document and return the analysis results
export async function analyzeContract(documentId: number): Promise<ContractAnalysisResult> {
  const response = await apiRequest('POST', `/api/analyze/${documentId}`);
  const data = await response.json();
  
  return {
    documentId,
    negotiationPoints: data.negotiationPoints
  };
}

// Get existing analysis results for a document
export async function getAnalysisResults(documentId: number): Promise<ContractAnalysisResult> {
  const response = await apiRequest('GET', `/api/analyze/${documentId}`);
  const data = await response.json();
  
  return {
    documentId,
    negotiationPoints: data.negotiationPoints
  };
}
