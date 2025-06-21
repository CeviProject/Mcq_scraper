'use client'

import React, { useState, useMemo, useCallback } from 'react';
import { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Wand2, ArrowRight, Loader2, CheckCircle, XCircle, BarChart, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateTestFeedbackAction } from '@/app/actions';
import type { GenerateTestFeedbackOutput } from '@/ai/flows/test-feedback';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

type TestStatus = 'configuring' | 'in-progress' | 'results';
const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard'];

function TestResults({
  test,
  userAnswers,
  feedback,
  onRestart,
  isLoadingFeedback,
}: {
  test: Question[];
  userAnswers: Record<string, string>;
  feedback: GenerateTestFeedbackOutput | null;
  onRestart: () => void;
  isLoadingFeedback: boolean;
}) {
  const { score, total, performanceByTopic } = useMemo(() => {
    let score = 0;
    const performance: Record<string, { correct: number; total: number }> = {};

    test.forEach(q => {
      const isCorrect = userAnswers[q.id] === q.correctOption;
      if (isCorrect) score++;

      if (!performance[q.topic]) {
        performance[q.topic] = { correct: 0, total: 0 };
      }
      performance[q.topic].total++;
      if (isCorrect) performance[q.topic].correct++;
    });

    const chartData = Object.entries(performance).map(([topic, data]) => ({
        name: topic,
        Correct: data.correct,
        Incorrect: data.total - data.correct,
    }));

    return { score, total: test.length, performanceByTopic: chartData };
  }, [test, userAnswers]);

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
                </CardHeader>
                <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={performanceByTopic} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}}/>
                            <Bar dataKey="Correct" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
                            <Bar dataKey="Incorrect" stackId="a" fill="hsl(var(--destructive) / 0.3)" radius={[4, 4, 4, 4]} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">AI Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingFeedback && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Generating feedback...</div>}
                    {feedback && (
                        <div className="space-y-4">
                           <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{feedback.overallFeedback}</ReactMarkdown>
                           <div>
                               <h4 className="font-semibold mb-2">Areas for Improvement:</h4>
                               <div className="flex flex-wrap gap-2">
                                   {feedback.areasOfWeakness.length > 0 ? feedback.areasOfWeakness.map(topic => <Badge key={topic} variant="destructive">{topic}</Badge>) : <p className="text-sm text-muted-foreground">Great job! No specific weaknesses found.</p>}
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
          {test.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="p-6">
                  <p className="font-semibold mb-2">{index + 1}. {q.text}</p>
                  <div className="space-y-2">
                      {q.options?.map((option, i) => {
                          const isCorrect = q.correctOption === option;
                          const isUserAnswer = userAnswers[q.id] === option;
                          return (
                              <div key={i} className={cn("flex items-center gap-3 p-2 rounded-md", isCorrect ? "bg-green-100 dark:bg-green-900/30" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30" : "")}>
                                  {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : isUserAnswer ? <XCircle className="h-5 w-5 text-red-600" /> : <div className="h-5 w-5 shrink-0" />}
                                  <span className={cn(isCorrect && "font-bold")}>{option}</span>
                              </div>
                          )
                      })}
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-md">
                      <h4 className="font-semibold mb-2 text-sm">Explanation:</h4>
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{q.solution}</ReactMarkdown>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}


export default function TestGeneratorTab({ questions }: { questions: Question[] }) {
  const [topicFilter, setTopicFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [numQuestions, setNumQuestions] = useState(10);
  
  const [status, setStatus] = useState<TestStatus>('configuring');
  const [generatedTest, setGeneratedTest] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<GenerateTestFeedbackOutput | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const { toast } = useToast();

  const availableTopics = useMemo(() => {
      const topics = new Set(questions.map(q => q.topic).filter(t => t && t !== 'Uncategorized'));
      return ['All', ...Array.from(topics)];
  }, [questions]);
  
  const questionsWithSolutions = useMemo(() => questions.filter(q => q.solution && q.solution !== 'No solution added yet.' && q.correctOption), [questions]);

  const handleGenerateTest = () => {
    const filtered = questionsWithSolutions.filter(q => {
      const topicMatch = topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      return topicMatch && difficultyMatch;
    });

    if (filtered.length < numQuestions) {
        toast({
            variant: "destructive",
            title: "Not Enough Questions",
            description: `Found only ${filtered.length} questions matching your criteria. Please broaden your search or reduce the number of questions.`,
        });
        return;
    }

    const shuffled = filtered.sort(() => 0.5 - Math.random());
    setGeneratedTest(shuffled.slice(0, numQuestions));
    setStatus('in-progress');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setFeedback(null);
  };
  
  const handleAnswerChange = (questionId: string, answer: string) => {
      setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleFinishTest = useCallback(async () => {
      setStatus('results');
      setIsLoadingFeedback(true);
      
      const resultsForAI = generatedTest.map(q => ({
          questionText: q.text,
          topic: q.topic,
          userAnswer: userAnswers[q.id] || "Not Answered",
          correctAnswer: q.correctOption,
          isCorrect: userAnswers[q.id] === q.correctOption,
      }));

      const feedbackResult = await generateTestFeedbackAction({ results: resultsForAI });
      if ('error' in feedbackResult) {
          toast({ variant: 'destructive', title: 'Feedback Error', description: feedbackResult.error });
      } else {
          setFeedback(feedbackResult);
      }
      setIsLoadingFeedback(false);

  }, [generatedTest, userAnswers, toast]);
  
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

  if (status === 'in-progress') {
    const currentQuestion = generatedTest[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / generatedTest.length) * 100;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Mock Test in Progress</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {generatedTest.length}</CardDescription>
                <Progress value={progress} className="w-full mt-2" />
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

  if (status === 'results') {
    return <TestResults test={generatedTest} userAnswers={userAnswers} feedback={feedback} onRestart={handleRestart} isLoadingFeedback={isLoadingFeedback} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Mock Test</CardTitle>
        <CardDescription>Set your criteria and generate a custom practice test. Only questions with generated solutions are available.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label>Available for test:</Label>
            <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">{questionsWithSolutions.length}</span> questions have solutions and can be used in tests.</p>
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
            max={questionsWithSolutions.length}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateTest} className="w-full" disabled={questionsWithSolutions.length === 0}>
          <Wand2 className="mr-2 h-4 w-4" /> Generate Test
        </Button>
      </CardFooter>
    </Card>
  );
}
