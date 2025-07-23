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

  const GLASS_CARD = 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/30 dark:border-zinc-800/40 shadow-2xl';

  return (
    <Card 
      className={`${GLASS_CARD} transition-all h-full flex flex-col ${dragActive ? "border-primary/80 ring-2 ring-primary/40 bg-primary/10" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-primary drop-shadow-sm">Upload Your PDFs</CardTitle>
        <CardDescription className="text-base text-muted-foreground">Drag and drop one or more aptitude test PDFs here, or click to select files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow flex flex-col justify-center">
        {isProcessing && processingProgress ? (
          <div className="space-y-4 text-center px-4">
            <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin mx-auto" />
            <Progress value={(processingProgress[0] / processingProgress[1]) * 100} className="w-full h-3 rounded-full bg-muted/40 animate-pulse" />
            <p className="text-base text-primary font-semibold">Processing file {processingProgress[0]} of {processingProgress[1]}...</p>
            <p className="text-xs text-muted-foreground">Please wait, this may take a moment.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-60 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${dragActive ? "border-primary/80 bg-primary/10 shadow-lg" : "border-muted/40 bg-white/30 dark:bg-zinc-900/30"} hover:bg-primary/5 hover:shadow-xl`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-14 h-14 mb-4 text-primary/80 animate-bounce-slow" />
                  <p className="mb-2 text-lg text-primary font-semibold"><span className="font-bold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">You can select multiple PDF files</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".pdf" multiple onChange={handleChange} disabled={isProcessing} />
              </label>
            </div>
            <div className="flex justify-center mt-4">
              <Button onClick={() => document.getElementById('dropzone-file')?.click()} disabled={isProcessing} className="px-6 py-2 text-base font-semibold rounded-full shadow-md bg-gradient-to-r from-primary to-indigo-500 hover:from-indigo-500 hover:to-primary/80 transition-all">
                Select Files
              </Button>
            </div>
            {/* Placeholder for file list: add here if you want to show uploaded files */}
            {/* <div className="mt-6">
              <ul className="space-y-2">
                {files.map(file => (
                  <li key={file.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-primary/10 transition-colors">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="truncate font-medium text-foreground">{file.name}</span>
                  </li>
                ))}
              </ul>
            </div> */}
          </>
        )}
      </CardContent>
    </Card>
  );
}
