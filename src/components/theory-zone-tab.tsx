'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SegregatedContent } from '@/lib/types';
import { BookOpen, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TheoryZoneTabProps {
  contents: SegregatedContent[];
}

export default function TheoryZoneTab({ contents }: TheoryZoneTabProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(contents.length > 0 ? contents[0].sourceFile : null);

  const selectedContent = contents.find(c => c.sourceFile === selectedFile);

  if (contents.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Your Theory Zone is Empty</CardTitle>
                <CardDescription>Upload some PDFs on the dashboard to see theory content here.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="h-[75vh] flex flex-col">
        <CardHeader>
            <CardTitle>Theory Zone</CardTitle>
            <CardDescription>Browse the theory content extracted from your uploaded PDFs.</CardDescription>
        </CardHeader>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-0 border-t overflow-hidden">
            <ScrollArea className="md:col-span-1 h-full border-r">
                <div className="p-2">
                    <h4 className="font-semibold text-sm p-2">Source Files</h4>
                    <div className="flex flex-col gap-1">
                        {contents.map((content) => (
                            <Button 
                                key={content.sourceFile}
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-left h-auto p-2", 
                                    selectedFile === content.sourceFile && "bg-muted font-semibold"
                                )}
                                onClick={() => setSelectedFile(content.sourceFile)}
                            >
                                <FileText className="w-4 h-4 mr-2 shrink-0" />
                                <span className="truncate">{content.sourceFile}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
            <ScrollArea className="md:col-span-3 h-full">
                <div className="p-6">
                  {selectedContent ? (
                    <ReactMarkdown
                        className="prose prose-sm dark:prose-invert max-w-none"
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                    >
                        {selectedContent.theory}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <BookOpen className="w-12 h-12 mb-4"/>
                        <p>Select a file to view its theory content.</p>
                    </div>
                  )}
                </div>
            </ScrollArea>
        </div>
    </Card>
  );
}
