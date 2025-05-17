import { useRef, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  isUploading: boolean;
  uploadProgress: number;
  isAnalyzing: boolean;
  analysisProgress: number;
  analysisStatus: string;
  onFileUpload: (file: File) => void;
}

export default function UploadSection({
  isUploading,
  uploadProgress,
  isAnalyzing,
  analysisProgress,
  analysisStatus,
  onFileUpload
}: UploadSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "The maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }
    
    // Check file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, JPG, or PNG file",
        variant: "destructive"
      });
      return;
    }
    
    onFileUpload(file);
  }, [onFileUpload, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    disabled: isUploading || isAnalyzing,
    multiple: false
  });
  
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div id="upload-section" className="mb-16">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-slate-900">Upload Your Contract</h2>
          <p className="mt-2 text-slate-600">Upload your contract document to begin analysis. We support PDF, DOCX, and image files.</p>
          
          {/* Upload Component */}
          {!isUploading && !isAnalyzing && (
            <div 
              {...getRootProps()} 
              className={`mt-6 border-2 border-dashed ${isDragActive ? 'border-primary bg-blue-50' : 'border-slate-200'} rounded-lg flex flex-col justify-center items-center py-12 text-center transition-colors duration-200`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-600">Drag and drop your contract here, or click to browse</p>
              <p className="text-sm text-slate-500 mt-1">Supports PDF, DOCX, JPG, and PNG (Max 10MB)</p>
              <input {...getInputProps()} className="hidden" ref={fileInputRef} />
              <Button 
                onClick={handleBrowseClick}
                className="mt-4"
                type="button"
              >
                Browse Files
              </Button>
            </div>
          )}
          
          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-6">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">Uploading contract...</span>
                <span className="text-sm font-medium text-slate-700">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="mt-6">
              <div className="flex flex-col items-center py-6">
                <div className="animate-pulse mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Analyzing Your Contract</h3>
                <p className="text-slate-600 text-center max-w-md mb-4">Our AI is reviewing your document, identifying important clauses, and preparing suggestions.</p>
                <Progress value={analysisProgress} className="h-2 w-full max-w-md mb-2" />
                <div className="text-sm text-slate-500 mt-2">{analysisStatus}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
