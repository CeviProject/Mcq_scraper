'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SegregatedContent } from '@/lib/types';
import { BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TheoryZoneTabProps {
  contents: SegregatedContent[];
}

export default function TheoryZoneTab({ contents }: TheoryZoneTabProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Theory Zone</CardTitle>
        <CardDescription>Review all the theoretical concepts from your uploaded documents in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {contents.map((content, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger>{content.sourceFile}</AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-72 w-full rounded-md border p-4">
                  <ReactMarkdown
                    className="prose prose-sm dark:prose-invert max-w-none"
                    remarkPlugins={[remarkGfm]}
                  >
                    {content.theory}
                  </ReactMarkdown>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
