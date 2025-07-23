
'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { Question, Test, TestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Loader2, CheckCircle, XCircle, BarChart, Users, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTopicBenchmarkAction, getWrongAnswerExplanationAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn, normalizeOption } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

function WhyWrongDialog({ question, userAnswer }: { question: Question, userAnswer: string }) {
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleFetchExplanation = async () => {
        setIsLoading(true);
        setExplanation('');
        const result = await getWrongAnswerExplanationAction({
            questionText: question.text,
            options: question.options,
            correctOption: question.correct_option || undefined,
            userSelectedOption: userAnswer
        });

        if ('error' in result) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            setExplanation(result.explanation);
        }
        setIsLoading(false);
    };

    return (
        <Dialog onOpenChange={(open) => { if (open && !explanation) { handleFetchExplanation(); }}}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-auto py-1 px-2 text-xs">
                    <Lightbulb className="h-3 w-3" />
                    Why was this wrong?
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Analyzing Your Answer</DialogTitle>
                    <DialogDescription>Let's break down why your answer might not be correct.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div>
                        <p className="font-semibold text-sm">Your Answer</p>
                        <p className="text-sm p-2 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md mt-1">{userAnswer}</p>
                    </div>
                     <div>
                        <p className="font-semibold text-sm">Explanation</p>
                        <div className="text-sm p-2 bg-muted rounded-md mt-1 min-h-[6rem]">
                           {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Thinking...</span></div>}
                           {explanation && <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{explanation}</ReactMarkdown>}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TestResultDetails({ test, allQuestions }: { test: Test & { test_attempts: TestAttempt[] }, allQuestions: Question[] }) {
    const { feedback, test_attempts } = test;
    const [benchmarks, setBenchmarks] = useState<Record<string, number>>({});
    const [isFetchingBenchmarks, setIsFetchingBenchmarks] = useState(true);

    const testQuestions = useMemo(() => {
        const questionMap = new Map(allQuestions.map(q => [q.id, q]));
        return test_attempts.map(attempt => {
            const question = questionMap.get(attempt.question_id);
            return { ...question, ...attempt };
        }).filter(item => item.id); // Filter out any attempts where the question doesn't exist anymore
    }, [test_attempts, allQuestions]);


    const performanceByTopic = useMemo(() => {
        const performance: Record<string, { correct: number; total: number }> = {};
        
        testQuestions.forEach(q => {
            const topic = q.topic || 'Uncategorized';
            if (!performance[topic]) {
                performance[topic] = { correct: 0, total: 0 };
            }
            performance[topic].total++;
            if (q.is_correct) performance[topic].correct++;
        });
        
        return Object.entries(performance).map(([topic, data]) => ({
            name: topic,
            accuracy: parseFloat(((data.correct / data.total) * 100).toFixed(1)),
        }));
    }, [testQuestions]);

    useEffect(() => {
        const fetchBenchmarks = async () => {
            setIsFetchingBenchmarks(true);
            const topics = performanceByTopic.map(p => p.name);
            if (topics.length === 0) {
                setIsFetchingBenchmarks(false);
                return;
            }
            const benchmarkPromises = topics.map(topic => getTopicBenchmarkAction({ topic }));
            const results = await Promise.all(benchmarkPromises);
            
            const newBenchmarks: Record<string, number> = {};
            results.forEach((res, index) => {
                if (!('error' in res)) {
                    newBenchmarks[topics[index]] = parseFloat(res.benchmark.toFixed(1));
                }
            });

            setBenchmarks(newBenchmarks);
            setIsFetchingBenchmarks(false);
        }
        if (performanceByTopic.length > 0) {
            fetchBenchmarks();
        } else {
            setIsFetchingBenchmarks(false);
        }
    }, [performanceByTopic]);

    const chartData = useMemo(() => {
        return performanceByTopic.map(p => ({
            name: p.name,
            'Your Accuracy': p.accuracy,
            'Peer Average': benchmarks[p.name] || 0,
        }));
    }, [performanceByTopic, benchmarks]);

  return (
    <div className="space-y-6 pt-2 pb-4 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><BarChart className="h-5 w-5"/>Performance by Topic</CardTitle>
                     <CardDescription className="flex items-center gap-1.5 text-xs"><Users className="h-3 w-3" /> Compare your results with the peer average.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                   {chartData.length === 0 ? (
                       <div className="flex items-center justify-center h-full text-muted-foreground">
                           <p>No topic data for this test.</p>
                       </div>
                   ) : isFetchingBenchmarks ? (
                       <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           <span>Fetching peer data...</span>
                       </div>
                   ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <XAxis type="number" hide domain={[0, 100]}/>
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: 'hsl(var(--muted))'}} 
                                contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}}
                                formatter={(value) => `${value}%`}
                            />
                            <Legend wrapperStyle={{fontSize: '0.8rem', paddingTop: '10px'}} verticalAlign="bottom" />
                            <Bar dataKey="Your Accuracy" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} barSize={12} />
                            <Bar dataKey="Peer Average" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 4, 4]} barSize={12}/>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                   )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">AI Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    {feedback ? (
                        <div className="space-y-4">
                           <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{feedback.overallFeedback}</ReactMarkdown>
                           <div>
                               <h4 className="font-semibold mb-2">Areas for Improvement:</h4>
                               <div className="flex flex-wrap gap-2">
                                   {feedback.areasOfWeakness.length > 0 ? feedback.areasOfWeakness.map((topic, index) => <Badge key={`${topic}-${index}`} variant="destructive">{topic}</Badge>) : <p className="text-sm text-muted-foreground">Great job! No specific weaknesses found.</p>}
                               </div>
                           </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No AI feedback was generated for this test.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Answers</h3>
        <div className="space-y-4">
          {testQuestions.map((q, index) => {
            return (
                <Card key={q.id}>
                    <CardContent className="p-6">
                        <p className="font-semibold mb-4">{index + 1}. {q.text}</p>
                        <div className="space-y-2">
                            {q.options?.map((option, i) => {
                                const isCorrectOption = normalizeOption(q.correct_option || '') === normalizeOption(option);
                                const isUserAnswer = normalizeOption(q.user_answer || '') === normalizeOption(option);
                                return (
                                    <div key={i} className={cn("flex items-center gap-3 p-2 rounded-md", isCorrectOption ? "bg-green-100 dark:bg-green-900/30" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30" : "")}>
                                        {isCorrectOption ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : isUserAnswer ? <XCircle className="h-5 w-5 text-red-600 shrink-0" /> : <div className="h-5 w-5 shrink-0" />}
                                        <span className={cn(isCorrectOption && "font-bold")}>{option}</span>
                                    </div>
                                )
                            })}
                        </div>
                        {!q.is_correct && q.user_answer && (
                            <div className="mt-4 text-right">
                               <WhyWrongDialog question={q as Question} userAnswer={q.user_answer} />
                            </div>
                        )}
                        {q.solution && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-md">
                                <h4 className="font-semibold mb-2 text-sm">Explanation:</h4>
                                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{q.solution}</ReactMarkdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}


export default function TestHistoryTab({ allQuestions, testHistory }: { allQuestions: Question[], testHistory: (Test & { test_attempts: TestAttempt[] })[] }) {
  
  if (testHistory.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full"><History className="h-12 w-12 text-muted-foreground" /></div>
                <CardTitle className="mt-4">No Test History Found</CardTitle>
                <CardDescription>Complete a mock test from the "Mock Test" tab to see your history and analytics here.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>Review your past performance. Click on any test to see a detailed breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-2 md:p-4">
            <Accordion type="single" collapsible className="w-full">
            {testHistory.map(test => (
                <AccordionItem value={test.id} key={test.id}>
                    <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/50 rounded-md">
                        <div className="flex justify-between items-center w-full">
                            <div>
                                <h4 className="font-semibold text-base text-left">Test from {format(new Date(test.created_at), 'MMMM d, yyyy')}</h4>
                                <p className="text-sm text-muted-foreground font-normal text-left">{formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}</p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                 <p className="text-lg font-bold">{test.score}/{test.total}</p>
                                <Badge variant={test.score/test.total >= 0.7 ? "default" : "destructive"} className="text-base">
                                    {((test.score / test.total) * 100).toFixed(0)}%
                                </Badge>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <TestResultDetails test={test} allQuestions={allQuestions} />
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
