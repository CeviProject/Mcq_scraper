'use client'

import React, { useState, useMemo, useCallback } from 'react';
import { BrainCircuit, BookOpen, ListChecks, FileText, LayoutDashboard } from 'lucide-react';
import { SegregatedContent, Question } from '@/lib/types';
import { segregateContentAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardTab from './dashboard-tab';
import TheoryZoneTab from './theory-zone-tab';
import QuestionBankTab from './question-bank-tab';
import TestGeneratorTab from './test-generator-tab';

export default function AptitudeAceClient() {
  const [segregatedContents, setSegregatedContents] = useState<SegregatedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleUpload = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    try {
      const newContents: SegregatedContent[] = [];
      await Promise.all(files.map(async (file) => {
        const reader = new FileReader();
        const promise = new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const pdfDataUri = reader.result as string;
              const result = await segregateContentAction({ pdfDataUri });

              if ('error' in result) {
                toast({
                  variant: "destructive",
                  title: `Error processing ${file.name}`,
                  description: result.error,
                });
                reject(new Error(result.error));
                return;
              }
              
              const questions = result.questions
                .filter(q => q.length > 5)
                .map((qText): Question => ({
                  id: crypto.randomUUID(),
                  text: qText,
                  topic: 'Uncategorized',
                  difficulty: 'Not Set',
                  isUnique: false,
                  solution: 'No solution added yet.',
                  sourceFile: file.name,
                }));

              newContents.push({
                theory: result.theory,
                questions: questions,
                sourceFile: file.name,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        await promise;
      }));

      setSegregatedContents(prev => [...prev, ...newContents]);
      toast({
        title: "Processing Complete",
        description: `${files.length} PDF(s) processed and added successfully.`,
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Something went wrong during PDF processing.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const allQuestions = useMemo(() => {
    return segregatedContents.flatMap(content => content.questions);
  }, [segregatedContents]);

  const handleQuestionUpdate = useCallback((updatedQuestion: Question) => {
    setSegregatedContents(prevContents => {
      const newContents = prevContents.map(content => {
        const questionIndex = content.questions.findIndex(q => q.id === updatedQuestion.id);
        if (questionIndex > -1) {
          const newQuestions = [...content.questions];
          newQuestions[questionIndex] = updatedQuestion;
          return { ...content, questions: newQuestions };
        }
        return content;
      });
      return newContents;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-10 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">Aptitude Ace</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="theory" className="gap-2" disabled={segregatedContents.length === 0}><BookOpen className="h-4 w-4" />Theory Zone</TabsTrigger>
            <TabsTrigger value="questions" className="gap-2" disabled={allQuestions.length === 0}><ListChecks className="h-4 w-4" />Question Bank</TabsTrigger>
            <TabsTrigger value="test-generator" className="gap-2" disabled={allQuestions.length === 0}><FileText className="h-4 w-4" />Test Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardTab onUpload={handleUpload} isProcessing={isProcessing} pdfCount={segregatedContents.length} questionCount={allQuestions.length} />
          </TabsContent>
          <TabsContent value="theory" className="mt-6">
            <TheoryZoneTab contents={segregatedContents} />
          </TabsContent>
          <TabsContent value="questions" className="mt-6">
            <QuestionBankTab questions={allQuestions} onQuestionUpdate={handleQuestionUpdate} />
          </TabsContent>
          <TabsContent value="test-generator" className="mt-6">
            <TestGeneratorTab questions={allQuestions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
