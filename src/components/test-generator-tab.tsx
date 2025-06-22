'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Question, TestResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Wand2, ArrowRight, Loader2, CheckCircle, XCircle, BarChart, RefreshCw, ChevronDown, Clock, Users, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { batchSolveQuestionsAction, generateTestFeedbackAction, getTopicBenchmarkAction, getWrongAnswerExplanationAction } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn, normalizeOption } from '@/lib/utils';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase';

type TestStatus = 'configuring' | 'in-progress' | 'finishing' | 'results';

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
        <Dialog onOpenChange={(open) => { if (open) { handleFetchExplanation(); }}}>
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


function TestResults({
  testResult,
  onRestart,
}: {
  testResult: TestResult;
  onRestart: () => void;
}) {
  const { score, total, feedback, questions: test, userAnswers } = testResult;
  const [benchmarks, setBenchmarks] = useState<Record<string, number>>({});
  const [isFetchingBenchmarks, setIsFetchingBenchmarks] = useState(true);

  const performanceByTopic = useMemo(() => {
    const performance: Record<string, { correct: number; total: number }> = {};

    test.forEach(q => {
      const isCorrect = normalizeOption(userAnswers[q.id] || '') === normalizeOption(q.correct_option || '');
      
      const topic = q.topic || 'Uncategorized';
      if (!performance[topic]) {
        performance[topic] = { correct: 0, total: 0 };
      }
      performance[topic].total++;
      if (isCorrect) performance[topic].correct++;
    });
    
    return Object.entries(performance).map(([topic, data]) => ({
        name: topic,
        accuracy: parseFloat(((data.correct / data.total) * 100).toFixed(1)),
    }));
  }, [test, userAnswers]);

  useEffect(() => {
    const fetchBenchmarks = async () => {
        setIsFetchingBenchmarks(true);
        const topics = performanceByTopic.map(p => p.name);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>You scored {score} out of {total}!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><BarChart className="h-5 w-5"/>Performance by Topic</CardTitle>
                     <CardDescription className="flex items-center gap-1.5 text-xs"><Users className="h-3 w-3" /> Compare your results with the peer average.</CardDescription>
                </CardHeader>
                <CardContent className="h-60">
                   {isFetchingBenchmarks && chartData.length > 0 ? (
                       <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           <span>Fetching peer data...</span>
                       </div>
                   ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <XAxis type="number" hide domain={[0, 100]}/>
                            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                                cursor={{fill: 'hsl(var(--muted))'}} 
                                contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}}
                                formatter={(value) => `${value}%`}
                            />
                            <Legend wrapperStyle={{fontSize: '0.8rem', paddingTop: '10px'}}/>
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
                    {!feedback && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Generating feedback...</div>}
                    {feedback && (
                        <div className="space-y-4">
                           <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{feedback.overallFeedback}</ReactMarkdown>
                           <div>
                               <h4 className="font-semibold mb-2">Areas for Improvement:</h4>
                               <div className="flex flex-wrap gap-2">
                                   {feedback.areasOfWeakness.length > 0 ? feedback.areasOfWeakness.map((topic, index) => <Badge key={`${topic}-${index}`} variant="destructive">{topic}</Badge>) : <p className="text-sm text-muted-foreground">Great job! No specific weaknesses found.</p>}
                               </div>
                           </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
          <div className="text-center pt-4">
              <Button onClick={onRestart}><RefreshCw className="mr-2 h-4 w-4" />Take Another Test</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
        <div className="space-y-4">
          {test.map((q, index) => {
            const userAnswer = userAnswers[q.id];
            const isCorrect = normalizeOption(userAnswer || '') === normalizeOption(q.correct_option || '');
            return (
                <Card key={q.id}>
                <CardContent className="p-6">
                    <p className="font-semibold mb-4">{index + 1}. {q.text}</p>
                    <div className="space-y-2">
                        {q.options?.map((option, i) => {
                            const isCorrectOption = normalizeOption(q.correct_option || '') === normalizeOption(option);
                            const isUserAnswer = normalizeOption(userAnswer || '') === normalizeOption(option);
                            return (
                                <div key={i} className={cn("flex items-center gap-3 p-2 rounded-md", isCorrectOption ? "bg-green-100 dark:bg-green-900/30" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30" : "")}>
                                    {isCorrectOption ? <CheckCircle className="h-5 w-5 text-green-600" /> : isUserAnswer ? <XCircle className="h-5 w-5 text-red-600" /> : <div className="h-5 w-5 shrink-0" />}
                                    <span className={cn(isCorrectOption && "font-bold")}>{option}</span>
                                </div>
                            )
                        })}
                    </div>
                    {!isCorrect && userAnswer && (
                        <div className="mt-4 text-right">
                           <WhyWrongDialog question={q} userAnswer={userAnswer} />
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


export default function TestGeneratorTab({ questions, onTestComplete, onQuestionsUpdate }: { questions: Question[], onTestComplete: (result: TestResult) => void; onQuestionsUpdate: (updates: (Partial<Question> & { id: string })[]) => void; }) {
  const [topicFilter, setTopicFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sourceFileFilter, setSourceFileFilter] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(60); // In seconds
  const [isAdaptive, setIsAdaptive] = useState(false);
  
  const [status, setStatus] = useState<TestStatus>('configuring');
  const [generatedTest, setGeneratedTest] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completedTest, setCompletedTest] = useState<TestResult | null>(null);

  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const difficultyOptions = ['Easy', 'Medium', 'Hard'];

  const handleFinishTest = useCallback(async () => {
      setStatus('finishing');
      
      let score = 0;
      generatedTest.forEach(q => {
          const isCorrect = normalizeOption(userAnswers[q.id] || '') === normalizeOption(q.correct_option || '');
          if (isCorrect) score++;
      });
      
      const resultsForFeedback = generatedTest.map(q => ({
          questionText: q.text,
          topic: q.topic,
          userAnswer: userAnswers[q.id] || "Not Answered",
          correctAnswer: q.correct_option || undefined,
          isCorrect: normalizeOption(userAnswers[q.id] || '') === normalizeOption(q.correct_option || ''),
      }));
      
      let testResult: TestResult = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        questions: generatedTest,
        userAnswers,
        feedback: null, 
        score,
        total: generatedTest.length,
      };

      setCompletedTest(testResult);
      setStatus('results');

      const feedbackResult = await generateTestFeedbackAction({ results: resultsForFeedback });
      
      if (!('error' in feedbackResult)) {
        const finalResult = {...testResult, feedback: feedbackResult};
        setCompletedTest(finalResult);
        onTestComplete(finalResult);
      } else {
         toast({ variant: 'destructive', title: 'Feedback Error', description: feedbackResult.error });
         onTestComplete(testResult);
      }
      

  }, [generatedTest, userAnswers, toast, onTestComplete]);

  useEffect(() => {
    if (status !== 'in-progress') return;

    if (timeLeft <= 0) {
      toast({
        title: "Time's Up!",
        description: "Your test has been automatically submitted.",
      });
      handleFinishTest();
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [status, timeLeft, handleFinishTest, toast]);
  

  const availableTopics = useMemo(() => {
      const topics = new Set(questions.map(q => q.topic).filter(t => t && t !== 'Uncategorized'));
      return ['All', ...Array.from(topics)];
  }, [questions]);
  
  const sourceFiles = useMemo(() => [...new Set(questions.map(q => q.sourceFile).filter(Boolean))], [questions]);
  
  const testableQuestions = useMemo(() => {
    return questions.filter(q => q.options && q.options.length > 0);
  }, [questions]);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    let filtered = testableQuestions.filter(q => {
      const topicMatch = topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      const sourceFileMatch = sourceFileFilter.length === 0 ? true : sourceFileFilter.includes(q.sourceFile!);
      return topicMatch && difficultyMatch && sourceFileMatch;
    });

    if (isAdaptive) {
        toast({ title: "Adaptive Test", description: "Analyzing your performance to find weak spots..." });
        const { data: performanceData, error } = await supabase.rpc('get_topic_performance');
        if (error || !performanceData) {
            toast({ variant: "destructive", title: "Could not get performance data.", description: "Switching to standard test." });
        } else {
            const weakTopics = performanceData.filter((p: any) => p.accuracy < 60).sort((a: any, b: any) => a.accuracy - b.accuracy).map((p: any) => p.topic);
            
            if (weakTopics.length > 0) {
                const weakQuestions = filtered.filter(q => weakTopics.includes(q.topic));
                const otherQuestions = filtered.filter(q => !weakTopics.includes(q.topic));

                const numWeak = Math.min(weakQuestions.length, Math.ceil(numQuestions * 0.7));
                const numOther = numQuestions - numWeak;

                const finalTestQuestions = [
                    ...weakQuestions.sort(() => 0.5 - Math.random()).slice(0, numWeak),
                    ...otherQuestions.sort(() => 0.5 - Math.random()).slice(0, numOther)
                ];

                if (finalTestQuestions.length >= numQuestions) {
                    filtered = finalTestQuestions;
                    toast({ title: "Adaptive test ready!", description: `Focusing on your weak areas: ${weakTopics.slice(0,3).join(', ')}.`});
                }
            }
        }
    }


    if (filtered.length < numQuestions) {
        toast({
            variant: "destructive",
            title: "Not Enough Questions",
            description: `Found only ${filtered.length} questions matching your criteria. Please broaden your search or reduce the number of questions.`,
        });
        setIsGenerating(false);
        return;
    }

    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const test = shuffled.slice(0, numQuestions);

    const questionsToSolve = test.filter(q => !q.solution);

    if (questionsToSolve.length > 0) {
        toast({
            title: "Preparing Your Test...",
            description: `Generating solutions for ${questionsToSolve.length} question(s). This may take a moment.`,
        });
        
        const questionsForAI = questionsToSolve.map(q => ({
            id: q.id,
            questionText: q.text,
            options: q.options,
        }));

        const result = await batchSolveQuestionsAction({ questions: questionsForAI });
        
        if ('error' in result) {
            toast({
                variant: "destructive",
                title: "Failed to Prepare Test",
                description: result.error,
            });
            setIsGenerating(false);
            return;
        }
        
        const updates = result.solvedQuestions.map(sq => ({
            id: sq.id,
            solution: sq.solution,
            correct_option: sq.correctOption,
            difficulty: sq.difficulty
        }));
        onQuestionsUpdate(updates);
        
        const solvedQuestionsMap = new Map(result.solvedQuestions.map(sq => [sq.id, {
            solution: sq.solution,
            correct_option: sq.correctOption,
            difficulty: sq.difficulty
        }]));

        const finalTest = test.map(q => {
            const solvedData = solvedQuestionsMap.get(q.id);
            return solvedData ? { ...q, ...solvedData } : q;
        });
        
        startTest(finalTest);
    } else {
        startTest(test);
    }
    setIsGenerating(false);
  };
  
  const startTest = (test: Question[]) => {
      setGeneratedTest(test);
      setTimeLeft(test.length * timePerQuestion);
      setStatus('in-progress');
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setCompletedTest(null);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
      setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleRestart = () => {
    setStatus('configuring');
    setGeneratedTest([]);
    setUserAnswers({});
  }

  if (questions.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full"><FileText className="h-12 w-12 text-muted-foreground" /></div>
                <CardTitle className="mt-4">Test Generator is Waiting</CardTitle>
                <CardDescription>Upload PDFs and generate solutions for questions to start creating mock tests.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (status === 'finishing') {
    return (
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <CardHeader>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <CardTitle className="mt-4">Generating Your Results...</CardTitle>
            <CardDescription>Please wait while we analyze your performance and generate AI feedback.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === 'in-progress') {
    const currentQuestion = generatedTest[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / generatedTest.length) * 100;
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Mock Test in Progress</CardTitle>
                        <CardDescription>Question {currentQuestionIndex + 1} of {generatedTest.length}</CardDescription>
                    </div>
                     <div className="flex items-center gap-2 text-lg font-mono text-right text-primary">
                        <Clock className="h-5 w-5" />
                        <span>{`${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`}</span>
                    </div>
                </div>
                <Progress value={progress} className="w-full mt-4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-lg font-semibold">{currentQuestion.text}</p>
                {currentQuestion.options && (
                    <RadioGroup value={userAnswers[currentQuestion.id]} onValueChange={(val) => handleAnswerChange(currentQuestion.id, val)} className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                            <Label key={index} htmlFor={`${currentQuestion.id}-option-${index}`} className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                                <RadioGroupItem value={option} id={`${currentQuestion.id}-option-${index}`} />
                                {option}
                            </Label>
                        ))}
                    </RadioGroup>
                )}
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(i => Math.max(0, i-1))} disabled={currentQuestionIndex === 0}>Previous</Button>
                {currentQuestionIndex < generatedTest.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex(i => Math.min(generatedTest.length - 1, i+1))}>Next</Button>
                ) : (
                    <Button onClick={handleFinishTest}>Finish Test <ArrowRight className="ml-2 h-4 w-4"/></Button>
                )}
            </CardFooter>
        </Card>
    )
  }

  if (status === 'results' && completedTest) {
    return <TestResults testResult={completedTest} onRestart={handleRestart} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Mock Test</CardTitle>
        <CardDescription>Set your criteria and generate a custom practice test.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2 col-span-full">
                <Label>Available Questions for Test</Label>
                <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">{testableQuestions.length}</span> questions are available. Tests are created from multiple-choice questions. Solutions will be generated on-the-fly if needed.</p>
            </div>
            <div className="space-y-2">
            <Label htmlFor="test-topic">Topic</Label>
            <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger id="test-topic"><SelectValue /></SelectTrigger>
                <SelectContent>
                {availableTopics.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
            <div className="space-y-2">
            <Label htmlFor="test-difficulty">Difficulty</Label>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger id="test-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                <SelectItem value="All">Any Difficulty</SelectItem>
                {difficultyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
            <div className="space-y-2">
            <Label htmlFor="test-num-questions">Number of Questions</Label>
            <Input
                id="test-num-questions"
                type="number"
                value={numQuestions}
                onChange={e => setNumQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                max={testableQuestions.length}
            />
            </div>
            <div className="space-y-2">
                <Label htmlFor="test-time">Time per Question</Label>
                <Select value={String(timePerQuestion)} onValueChange={(v) => setTimePerQuestion(Number(v))}>
                <SelectTrigger id="test-time"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2 col-span-full">
                <Label htmlFor="source-filter">Source PDF(s)</Label>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal">
                    <span className="truncate">
                        {sourceFileFilter.length === 0 ? 'All Sources' : sourceFileFilter.length === 1 ? sourceFileFilter[0] : `${sourceFileFilter.length} sources selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50 shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuLabel>Filter by Source File</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sourceFiles.map(file => (
                        <DropdownMenuCheckboxItem
                            key={file}
                            checked={sourceFileFilter.includes(file!)}
                            onCheckedChange={checked => {
                                setSourceFileFilter(prev => 
                                    checked ? [...prev, file!] : prev.filter(f => f !== file)
                                )
                            }}
                        >
                            {file}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className="flex items-center space-x-2 pt-6">
            <Switch id="adaptive-mode" checked={isAdaptive} onCheckedChange={setIsAdaptive} />
            <Label htmlFor="adaptive-mode" className="flex flex-col">
              <span>Focus on Weak Topics (Adaptive)</span>
              <span className="font-normal text-muted-foreground text-xs">AI will build a test targeting your areas for improvement.</span>
            </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateTest} className="w-full" disabled={testableQuestions.length === 0 || isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing Test...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Test
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
