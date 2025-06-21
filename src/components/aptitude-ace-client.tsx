'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BrainCircuit, BookOpen, ListChecks, FileText, LayoutDashboard, Settings, Upload, Loader2 } from 'lucide-react';
import { Document, Question, TestResult, ChatMessage, Test } from '@/lib/types';
import { segregateContentAction, batchSolveQuestionsAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DashboardTab from './dashboard-tab';
import UploadTab from './upload-tab';
import TheoryZoneTab from './theory-zone-tab';
import QuestionBankTab from './question-bank-tab';
import TestGeneratorTab from './test-generator-tab';
import SettingsSheet from './settings-sheet';
import { createClient } from '@/lib/supabase';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

// Create the Supabase client once at the module level
// It's safe to assume config is valid here because page.tsx checks it.
const supabase: SupabaseClient = createClient();

export default function AptitudeAceClient({ session, profile }: { session: Session | null, profile: { username: string } | null }) {

  const [documents, setDocuments] = useState<Document[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testHistory, setTestHistory] = useState<Test[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<[number, number] | null>(null);
  
  const [questionUiState, setQuestionUiState] = useState<Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>>(new Map());

  const [username, setUsername] = useState('Guest');
  const [theme, setTheme] = useState('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { toast } = useToast();

  // Initial data fetch and subscription setup
  useEffect(() => {
    const fetchData = async () => {
      if (!session) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      
      const [docsRes, questionsRes, testsRes] = await Promise.all([
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('questions').select('*, documents(source_file)').order('created_at', { ascending: false }),
        supabase.from('tests').select('*').order('created_at', { ascending: false })
      ]);
      
      if (docsRes.error || testsRes.error || questionsRes.error) {
        toast({ variant: 'destructive', title: 'Error fetching data', description: docsRes.error?.message || testsRes.error?.message || questionsRes.error?.message });
      } else {
        setDocuments(docsRes.data || []);
        
        const questionsWithSourceFile = questionsRes.data?.map(q => ({
          ...q,
          // @ts-ignore
          sourceFile: q.documents.source_file
        })) || [];
        // @ts-ignore
        setQuestions(questionsWithSourceFile);
        
        setTestHistory(testsRes.data || []);
      }
      setIsLoading(false);
    };

    fetchData();

  }, [session, toast]);
  
  useEffect(() => {
    // Theme logic from localStorage
    const storedTheme = localStorage.getItem('aptitude-ace-theme') || 'dark';
    setTheme(storedTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(storedTheme);
  }, []);

  useEffect(() => {
    // Set username from profile passed from server
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
      setTheme(newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      localStorage.setItem('aptitude-ace-theme', newTheme);
  };
  

  const handleTestComplete = useCallback(async (result: TestResult) => {
    if (!session) return;
    
    // 1. Insert into 'tests' table
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .insert({
        user_id: session.user.id,
        score: result.score,
        total: result.total,
        feedback: result.feedback,
      })
      .select()
      .single();

    if (testError || !testData) {
      toast({ variant: 'destructive', title: 'Error saving test result', description: testError?.message });
      return;
    }
    
    // 2. Prepare and insert into 'test_attempts'
    const attempts = result.questions.map(q => {
      const isCorrect = normalizeOption(result.userAnswers[q.id] || '') === normalizeOption(q.correct_option || '');
      return {
        test_id: testData.id,
        question_id: q.id,
        user_answer: result.userAnswers[q.id] || null,
        is_correct: isCorrect,
      };
    });

    const { error: attemptsError } = await supabase.from('test_attempts').insert(attempts);
    if(attemptsError) {
       toast({ variant: 'destructive', title: 'Error saving test attempts', description: attemptsError?.message });
       // Note: might want to delete the parent 'test' record here for consistency
    }

    setTestHistory(prev => [testData, ...prev]);

    toast({
        title: "Test Saved",
        description: "Your test results have been saved to your dashboard.",
    });
  }, [session, toast]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!session) {
        toast({ variant: "destructive", title: "You must be logged in to upload files." });
        return;
    }
    setIsProcessing(true);
    setProcessingProgress([0, files.length]);
    let processedCount = 0;

    for (const file of files) {
      try {
        const pdfDataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const segResult = await segregateContentAction({ pdfDataUri });

        if ('error' in segResult) {
          toast({ variant: "destructive", title: `Error processing ${file.name}`, description: segResult.error });
          continue; // Skip to next file
        }
        
        // Save document to DB
        const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({ user_id: session.user.id, source_file: file.name, theory: segResult.theory })
            .select('id, source_file, theory')
            .single();
        
        if (docError) throw new Error(`Failed to save document: ${docError.message}`);
        
        // Save questions to DB
        const questionsToInsert = segResult.questions
          .filter(q => q.questionText && q.questionText.length > 5)
          .map(q => ({
            document_id: docData.id,
            user_id: session.user.id,
            text: q.questionText,
            options: q.options,
            topic: q.topic || 'Uncategorized',
          }));

        if (questionsToInsert.length > 0) {
            const { data: newQuestionsData, error: qError } = await supabase.from('questions').insert(questionsToInsert).select();
            if (qError) throw new Error(`Failed to save questions: ${qError.message}`);
             // @ts-ignore
            setQuestions(prev => [...newQuestionsData.map(q => ({...q, sourceFile: docData.source_file})), ...prev]);
        }
        
        // @ts-ignore
        setDocuments(prev => [{...docData, questions: []}, ...prev]);

      } catch (error: any) {
        toast({ variant: "destructive", title: `Error processing ${file.name}`, description: error.message });
      } finally {
        processedCount++;
        setProcessingProgress([processedCount, files.length]);
      }
    }

    setIsProcessing(false);
    setProcessingProgress(null);
  }, [session, toast]);

  const handleQuestionUpdate = useCallback(async (updatedQuestion: Partial<Question> & { id: string }) => {
    const { id, ...updateData } = updatedQuestion;
    const { error } = await supabase.from('questions').update(updateData).eq('id', id);

    if (error) {
        toast({ variant: 'destructive', title: 'Error updating question', description: error.message });
    } else {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updateData } : q));
    }
  }, [toast]);
  
  const handleQuestionsUpdate = useCallback(async (updates: (Partial<Question> & { id: string })[]) => {
    const { error } = await supabase.from('questions').upsert(updates);
    
    if (error) {
        toast({ variant: 'destructive', title: 'Error batch updating questions', description: error.message });
    } else {
        const updatesMap = new Map(updates.map(u => [u.id, u]));
        setQuestions(prev => prev.map(q => updatesMap.has(q.id) ? { ...q, ...updatesMap.get(q.id)! } : q));
    }
  }, [toast]);

  const handleUsernameChange = (newName: string) => {
    setUsername(newName);
  };
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Aptitude Ace</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">Welcome, {username}</span>
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
            <TabsTrigger value="theory" className="gap-2" disabled={documents.length === 0}><BookOpen className="h-4 w-4" />Theory Zone</TabsTrigger>
            <TabsTrigger value="questions" className="gap-2" disabled={questions.length === 0}><ListChecks className="h-4 w-4" />Question Bank</TabsTrigger>
            <TabsTrigger value="test-generator" className="gap-2" disabled={questions.length === 0}><FileText className="h-4 w-4" />Test Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardTab 
              sourceFiles={documents.map(d => d.source_file)}
              questionCount={questions.length} 
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
            <TheoryZoneTab documents={documents} />
          </TabsContent>
          <TabsContent value="questions" className="mt-6">
            <QuestionBankTab 
                questions={questions} 
                onQuestionUpdate={handleQuestionUpdate} 
                documents={documents}
                questionUiState={questionUiState}
                setQuestionUiState={setQuestionUiState}
            />
          </TabsContent>
          <TabsContent value="test-generator" className="mt-6">
            <TestGeneratorTab 
              questions={questions} 
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
        setTheme={handleThemeChange}
        username={username}
        setUsername={handleUsernameChange}
        supabase={supabase}
      />
    </div>
  );
}

function normalizeOption(str: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
