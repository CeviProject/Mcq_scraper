'use client'

import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, HelpCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface DashboardTabProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
  pdfCount: number;
  questionCount: number;
}

export default function DashboardTab({ onUpload, isProcessing, pdfCount, questionCount }: DashboardTabProps) {
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
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploaded PDFs</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pdfCount}</div>
            <p className="text-xs text-muted-foreground">Total PDF documents processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Question Pool</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionCount}</div>
            <p className="text-xs text-muted-foreground">Total questions available for practice</p>
          </CardContent>
        </Card>
      </div>

      <Card 
        className={`transition-colors ${dragActive ? "border-primary bg-primary/10" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardHeader>
          <CardTitle>Upload Your PDFs</CardTitle>
          <CardDescription>Drag and drop your aptitude test PDFs here or click to select files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF files only</p>
              </div>
              <input id="dropzone-file" type="file" className="hidden" accept=".pdf" multiple onChange={handleChange} disabled={isProcessing} />
            </label>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => document.getElementById('dropzone-file')?.click()} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Select Files'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      {pdfCount === 0 && (
         <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg">
             <Image src="https://placehold.co/1200x400.png" alt="Student studying" layout="fill" objectFit="cover" data-ai-hint="learning study" />
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white p-4">
                    <h2 className="text-3xl font-bold font-headline">Turn PDFs into Power</h2>
                    <p className="mt-2 max-w-2xl">Upload your study materials to unlock a smarter, more organized way to prepare for your aptitude tests.</p>
                </div>
             </div>
         </div>
      )}
    </div>
  );
}
