import { useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelected,
  accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected]);
  
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple: false
  });
  
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "border-2 border-dashed rounded-lg flex flex-col justify-center items-center py-12 text-center transition-colors duration-200",
        isDragActive ? "border-primary bg-blue-50" : "border-slate-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
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
        disabled={disabled}
      >
        Browse Files
      </Button>
      
      {fileRejections.length > 0 && (
        <div className="mt-4 text-sm text-red-500">
          {fileRejections[0].errors.map(e => (
            <p key={e.code}>{e.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
