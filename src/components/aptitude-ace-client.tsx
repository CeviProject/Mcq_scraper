'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BrainCircuit, BookOpen, ListChecks, FileText, LayoutDashboard, Settings, Upload } from 'lucide-react';
import { SegregatedContent, Question, TestResult } from '@/lib/types';
import { segregateContentAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DashboardTab from './dashboard-tab';
import UploadTab from './upload-tab';
import TheoryZoneTab from './theory-zone-tab';
import QuestionBankTab from './question-bank-tab';
import TestGeneratorTab from './test-generator-tab';
import SettingsSheet from './settings-sheet';
import { Skeleton } from './ui/skeleton';

export default function AptitudeAceClient() {
  const [segregatedContents, setSegregatedContents] = useState<SegregatedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<[number, number] | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  
  const [username, setUsername] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Theme logic
    const storedTheme = localStorage.getItem('aptitude-ace-theme') || 'dark';
    setTheme(storedTheme);

    // Username logic
    const storedUsername = localStorage.getItem('aptitude-ace-username') || 'Guest';
    setUsername(storedUsername);
  }, []);

  useEffect(() => {
    if (isClient) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('aptitude-ace-theme', theme);
    }
  }, [theme, isClient]);
  
  const handleUsernameChange = (newName: string) => {
    const finalUsername = newName.trim() === '' ? 'Guest' : newName.trim();
    setUsername(finalUsername);
    localStorage.setItem('aptitude-ace-username', finalUsername);
  };


  const { toast } = useToast();

  const handleTestComplete = useCallback((result: TestResult) => {
    setTestHistory(prev => [...prev, result]);
    toast({
        title: "Test Saved",
        description: "Your test results have been saved to your dashboard.",
    });
  }, [toast]);

  const handleUpload = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress([0, files.length]);
    const newContents: SegregatedContent[] = [];
    let processedCount = 0;

    try {
      for (const file of files) {
        const reader = new FileReader();
        const promise = new Promise<SegregatedContent | null>((resolve, reject) => {
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
                // Resolve with null to not break the loop for other files
                resolve(null); 
                return;
              }
              
              const questions = result.questions
                .filter(q => q.questionText && q.questionText.length > 5)
                .map((q): Question => ({
                  id: crypto.randomUUID(),
                  text: q.questionText,
                  options: q.options,
                  topic: q.topic || 'Uncategorized',
                  difficulty: 'Not Set',
                  solution: '',
                  chatHistory: [],
                  sourceFile: file.name,
                }));

              resolve({
                theory: result.theory,
                questions: questions,
                sourceFile: file.name,
              });
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        const content = await promise;
        if (content) {
            newContents.push(content);
        }
        processedCount++;
        setProcessingProgress([processedCount, files.length]);
      }

      setSegregatedContents(prev => [...prev, ...newContents]);
      
      if (newContents.length > 0) {
        toast({
            title: "Processing Complete",
            description: `${newContents.length} of ${files.length} PDF(s) processed and added.`,
        });
      }

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description: "Something went wrong during PDF processing.",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
    }
  }, [toast]);

  const allQuestions = useMemo(() => {
    return segregatedContents.flatMap(content => content.questions);
  }, [segregatedContents]);

  const sourceFiles = useMemo(() => segregatedContents.map(c => c.sourceFile), [segregatedContents]);

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
  
  const handleQuestionsUpdate = useCallback((updates: (Partial<Question> & { id: string })[]) => {
    const updatesMap = new Map(updates.map(u => [u.id, u]));
    
    setSegregatedContents(prevContents => {
      return prevContents.map(content => {
        let contentHasChanged = false;
        const newQuestions = content.questions.map(q => {
          if (updatesMap.has(q.id)) {
            contentHasChanged = true;
            return { ...q, ...updatesMap.get(q.id)! };
          }
          return q;
        });

        return contentHasChanged ? { ...content, questions: newQuestions } : content;
      });
    });
  }, []);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Aptitude Ace</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {isClient ? (
                <span className="text-sm text-muted-foreground hidden md:block">Welcome, {username}</span>
            ) : (
                <Skeleton className="h-5 w-24 hidden md:block" />
            )}
            <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
      </header>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" />Upload</TabsTrigger>
            <TabsTrigger value="theory" className="gap-2" disabled={segregatedContents.length === 0}><BookOpen className="h-4 w-4" />Theory Zone</TabsTrigger>
            <TabsTrigger value="questions" className="gap-2" disabled={allQuestions.length === 0}><ListChecks className="h-4 w-4" />Question Bank</TabsTrigger>
            <TabsTrigger value="test-generator" className="gap-2" disabled={allQuestions.length === 0}><FileText className="h-4 w-4" />Test Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardTab 
              sourceFiles={sourceFiles}
              questionCount={allQuestions.length} 
              testHistory={testHistory}
            />
          </TabsContent>
          <TabsContent value="upload" className="mt-6">
            <UploadTab 
              onUpload={handleUpload} 
              isProcessing={isProcessing}
              processingProgress={processingProgress}
            />
          </TabsContent>
          <TabsContent value="theory" className="mt-6">
            <TheoryZoneTab contents={segregatedContents} />
          </TabsContent>
          <TabsContent value="questions" className="mt-6">
            <QuestionBankTab questions={allQuestions} onQuestionUpdate={handleQuestionUpdate} segregatedContents={segregatedContents} />
          </TabsContent>
          <TabsContent value="test-generator" className="mt-6">
            <TestGeneratorTab 
              questions={allQuestions} 
              onTestComplete={handleTestComplete} 
              onQuestionsUpdate={handleQuestionsUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
       <SettingsSheet
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        theme={theme}
        setTheme={setTheme}
        username={username}
        setUsername={handleUsernameChange}
      />
    </div>
  );
}
