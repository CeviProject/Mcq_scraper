'use client'

import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';

interface UploadTabProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
  processingProgress: [number, number] | null;
}

export default function UploadTab({ onUpload, isProcessing, processingProgress }: UploadTabProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <Card 
        className={`transition-colors h-full flex flex-col ${dragActive ? "border-primary bg-primary/10" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
    >
        <CardHeader>
            <CardTitle>Upload Your PDFs</CardTitle>
            <CardDescription>Drag and drop one or more aptitude test PDFs here, or click to select files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow flex flex-col justify-center">
        {isProcessing && processingProgress ? (
          <div className="space-y-3 text-center px-4">
            <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin mx-auto" />
            <Progress value={(processingProgress[0] / processingProgress[1]) * 100} className="w-full" />
            <p className="text-sm text-muted-foreground">Processing file {processingProgress[0]} of {processingProgress[1]}...</p>
            <p className="text-xs text-muted-foreground">Please wait, this may take a moment.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-60 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground">You can select multiple PDF files</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".pdf" multiple onChange={handleChange} disabled={isProcessing} />
                </label>
            </div>
            <div className="flex justify-center">
                <Button onClick={() => document.getElementById('dropzone-file')?.click()} disabled={isProcessing}>
                  Select Files
                </Button>
            </div>
          </>
        )}
        </CardContent>
    </Card>
  );
}
