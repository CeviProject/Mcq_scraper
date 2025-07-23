
'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { Question, Test, TestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Loader2, CheckCircle, XCircle, BarChart, Users, Lightbulb, Info } from 'lucide-react';
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
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, PieChart, Pie, Cell as PieCell, RadialBarChart, RadialBar } from 'recharts';
import { Tooltip as RechartsTooltip, Legend as RechartsLegend, Bar as RechartsBar } from 'recharts';


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
            'Global Average': benchmarks[p.name] || 0,
        }));
    }, [performanceByTopic, benchmarks]);

  return (
    <div className="space-y-6 pt-2 pb-4 px-4 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><BarChart className="h-5 w-5"/>Performance by Topic</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                        <Users className="h-3 w-3" />
                        <span>Compare your results with the global average.</span>
                         <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p>The "Global Average" is the average score of all users on this platform for each topic, giving you a benchmark of your performance.</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                   {chartData.length === 0 ? (
                       <div className="flex items-center justify-center h-full text-muted-foreground">
                           <p>No topic data for this test.</p>
                       </div>
                   ) : isFetchingBenchmarks ? (
                       <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           <span>Fetching benchmark data...</span>
                       </div>
                   ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <XAxis type="number" hide domain={[0, 100]}/>
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: 'hsl(var(--muted))'}} 
                                contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}}
                                formatter={(value) => `${value}%`}
                            />
                            <Legend wrapperStyle={{fontSize: '0.8rem', paddingTop: '10px'}} verticalAlign="bottom" />
                            <Bar dataKey="Your Accuracy" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} barSize={12} />
                            <Bar dataKey="Global Average" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 4, 4]} barSize={12}/>
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
  
  const GLASS_CARD = 'bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-white/30 dark:border-zinc-800/40 shadow-xl transition-all duration-300';
  const MODERN_COLORS = ['#6366F1', '#06B6D4', '#F59E42', '#F43F5E', '#10B981', '#A21CAF'];

  // --- Overall Stats Data ---
  // Score trend (line chart)
  const scoreTrend = testHistory.map(test => ({
    date: test.created_at ? format(new Date(test.created_at), 'MMM d') : '',
    score: Math.round((test.score / test.total) * 100),
  }));
  // Topic distribution (pie chart)
  const topicCounts: Record<string, number> = {};
  testHistory.forEach(test => {
    test.test_attempts.forEach(attempt => {
      const q = allQuestions.find(q => q.id === attempt.question_id);
      if (q && q.topic) topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    });
  });
  const topicDist = Object.entries(topicCounts).map(([name, value]) => ({ name, value }));
  // High score completion (radial bar)
  const highScorePct = testHistory.length > 0 ? Math.round((testHistory.filter(t => t.score / t.total >= 0.7).length / testHistory.length) * 100) : 0;
  // Average score
  const avgScore = testHistory.length > 0 ? Math.round(testHistory.reduce((acc, t) => acc + (t.score / t.total), 0) / testHistory.length * 100) : 0;

  // --- More Analytics ---
  // Average accuracy per topic (bar chart)
  const topicAccuracy: { name: string, accuracy: number }[] = [];
  const topicCorrect: Record<string, { correct: number, total: number }> = {};
  testHistory.forEach(test => {
    test.test_attempts.forEach(attempt => {
      const q = allQuestions.find(q => q.id === attempt.question_id);
      if (q && q.topic) {
        if (!topicCorrect[q.topic]) topicCorrect[q.topic] = { correct: 0, total: 0 };
        topicCorrect[q.topic].total++;
        if (attempt.is_correct) topicCorrect[q.topic].correct++;
      }
    });
  });
  for (const topic in topicCorrect) {
    topicAccuracy.push({ name: topic, accuracy: Math.round((topicCorrect[topic].correct / topicCorrect[topic].total) * 100) });
  }

  if (testHistory.length === 0) {
    return (
        <Card className={`${GLASS_CARD} flex flex-col items-center justify-center py-20 text-center`}> 
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full shadow-lg"><History className="h-12 w-12 text-primary" /></div>
                <CardTitle className="mt-4 text-2xl font-bold text-primary drop-shadow">No Test History Found</CardTitle>
                <CardDescription className="text-base text-muted-foreground">Complete a mock test from the "Mock Test" tab to see your history and analytics here.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-gradient-to-br from-white/40 via-background/60 to-primary/10 dark:from-zinc-900/40 dark:to-background/60 rounded-2xl p-6 shadow-inner">
        {/* Score Trend Line Chart */}
        <div className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}>
          <h3 className="text-lg font-bold text-primary mb-2">Score Trend</h3>
          <LineChart width={220} height={120} data={scoreTrend} className="w-full">
            <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={900} />
            <RechartsTooltip contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} labelStyle={{color:'#a5b4fc'}} itemStyle={{color:'#fff'}} />
            <RechartsLegend wrapperStyle={{fontSize: '0.9rem'}} />
          </LineChart>
        </div>
        {/* Topic Distribution Pie Chart */}
        <div className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}>
          <h3 className="text-lg font-bold text-primary mb-2">Topic Distribution</h3>
          <PieChart width={180} height={180} className="w-full">
            <Pie data={topicDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} isAnimationActive animationDuration={900} >
              {topicDist.map((entry, idx) => (
                <PieCell key={`cell-${idx}`} fill={MODERN_COLORS[idx % MODERN_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(v, n) => [`${v}`, n]} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
            <RechartsLegend wrapperStyle={{fontSize: '0.9rem'}} />
          </PieChart>
        </div>
        {/* High Score Completion Radial Bar */}
        <div className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center relative`}>
          <h3 className="text-lg font-bold text-primary mb-2">High Score Completion</h3>
          <RadialBarChart width={120} height={120} innerRadius="80%" outerRadius="100%" data={[{ name: 'Completion', value: highScorePct }]} startAngle={90} endAngle={-270} >
            <RadialBar minAngle={15} background clockWise dataKey="value" fill="#10B981" cornerRadius={20} isAnimationActive animationDuration={900} label={{ position: 'center', fill: '#10B981', fontSize: 24, fontWeight: 700, formatter: () => `${highScorePct}%` }} />
            <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
          </RadialBarChart>
          <p className="text-xs text-muted-foreground mt-2">Tests with ≥70% score</p>
        </div>
        {/* Average Accuracy by Topic Bar Chart */}
        <div className={`${GLASS_CARD} p-4 flex flex-col items-center justify-center`}>
          <h3 className="text-lg font-bold text-primary mb-2">Avg. Accuracy by Topic</h3>
          <RechartsBarChart width={220} height={120} data={topicAccuracy} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 8, border: '1px solid #334155'}} />
            <RechartsLegend wrapperStyle={{fontSize: '0.9rem'}} />
            <RechartsBar dataKey="accuracy" fill="#6366F1" radius={[8, 8, 8, 8]} barSize={18} isAnimationActive animationDuration={900} />
          </RechartsBarChart>
        </div>
      </div>
      {/* Test History Accordion */}
      <Card className={`${GLASS_CARD}`}> 
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary drop-shadow">Test History</CardTitle>
          <CardDescription className="text-base text-muted-foreground">Review your past performance. Click on any test to see a detailed breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-2 md:p-4">
            <Accordion type="single" collapsible className="w-full">
            {testHistory.map(test => (
                <AccordionItem value={test.id} key={test.id} className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-white/40 via-background/60 to-primary/10 dark:from-zinc-900/40 dark:to-background/60 shadow-inner">
                    <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-primary/10 rounded-md transition-all">
                        <div className="flex justify-between items-center w-full">
                            <div>
                                <h4 className="font-semibold text-base text-left text-primary">Test from {format(new Date(test.created_at), 'MMMM d, yyyy')}</h4>
                                <p className="text-sm text-muted-foreground font-normal text-left">{formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}</p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                 <p className="text-lg font-bold">{test.score}/{test.total}</p>
                                <Badge variant={test.score/test.total >= 0.7 ? "default" : "destructive"} className="text-base px-3 py-1 rounded-full">
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

    