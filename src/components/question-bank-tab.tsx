'use client'

import React, { useState, useMemo } from 'react';
import { Question, SegregatedContent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Sparkles, File, BookCopy, Wand2, Loader2, BrainCircuit, Check, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getSolutionAction, getTricksAction, askFollowUpAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface QuestionBankTabProps {
  questions: Question[];
  onQuestionUpdate: (question: Question) => void;
  segregatedContents: SegregatedContent[];
}

const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Not Set'];

function QuestionItem({ question, onQuestionUpdate, theory }: { question: Question, onQuestionUpdate: (question: Question) => void, theory?: string }) {
  const [topic, setTopic] = useState(question.topic);
  const [isSolutionDialogOpen, setIsSolutionDialogOpen] = useState(false);
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [aiTricks, setAiTricks] = useState<string | null>(null);
  const [isGeneratingTricks, setIsGeneratingTricks] = useState(false);
  const { toast } = useToast();

  const hasGeneratedSolution = question.solution && question.solution !== 'No solution added yet.';

  const handleGenerateSolution = async () => {
    setIsGeneratingSolution(true);
    const result = await getSolutionAction({ 
      questionText: question.text,
      options: question.options,
      theoryContext: theory 
    });
    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      onQuestionUpdate({ 
        ...question, 
        solution: result.solution, 
        correctOption: result.correctOption,
        difficulty: question.difficulty === 'Not Set' ? result.difficulty : question.difficulty,
        chatHistory: [] 
      });
    }
    setIsGeneratingSolution(false);
  };

  const handleAskFollowUp = async () => {
    if (!followUpQuery.trim()) return;
    setIsReplying(true);
    const currentQuery = followUpQuery;
    setFollowUpQuery('');

    const currentHistory = question.chatHistory || [];
    const newUserMessage = { role: 'user' as const, content: currentQuery };
    
    onQuestionUpdate({ ...question, chatHistory: [...currentHistory, newUserMessage] });

    const result = await askFollowUpAction({
        questionText: question.text,
        options: question.options,
        solution: question.solution,
        theoryContext: theory,
        chatHistory: currentHistory,
        userQuery: currentQuery,
    });
    
    if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
        onQuestionUpdate({ ...question, chatHistory: currentHistory });
    } else {
        const aiMessage = { role: 'model' as const, content: result.answer };
        onQuestionUpdate({ ...question, chatHistory: [...currentHistory, newUserMessage, aiMessage] });
    }
    setIsReplying(false);
  };

  const handleGenerateTricks = async () => {
    setIsGeneratingTricks(true);
    const result = await getTricksAction({ questionText: question.text });
    if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        setAiTricks(result.tricks);
    }
    setIsGeneratingTricks(false);
  };

  const handleSelectOption = (option: string) => {
    onQuestionUpdate({ ...question, userSelectedOption: option });
  };

  const answerVerified = question.correctOption && question.userSelectedOption;

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-foreground mb-4 whitespace-pre-wrap">{question.text}</p>
        {question.options && question.options.length > 0 && (
          <RadioGroup 
            className="mb-4 space-y-2" 
            value={question.userSelectedOption} 
            onValueChange={handleSelectOption}
            disabled={!!answerVerified}
          >
            {question.options.map((option, index) => {
              const isCorrect = question.correctOption === option;
              const isSelected = question.userSelectedOption === option;
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
                  <Label 
                    htmlFor={`${question.id}-option-${index}`}
                    className={cn(
                      "cursor-pointer",
                      answerVerified && isCorrect && "text-green-700 font-bold",
                      answerVerified && isSelected && !isCorrect && "text-red-700 font-bold line-through"
                    )}
                  >
                    {option}
                    {answerVerified && isCorrect && <Check className="inline w-4 h-4 ml-2 text-green-700" />}
                    {answerVerified && isSelected && !isCorrect && <X className="inline w-4 h-4 ml-2 text-red-700" />}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary"><File className="w-3 h-3 mr-1"/>{question.sourceFile}</Badge>
          <Badge variant="outline">Topic: {question.topic}</Badge>
          <Badge variant={question.isUnique ? "default" : "outline"}><Sparkles className="w-3 h-3 mr-1"/>{question.isUnique ? 'Unique' : 'Common'}</Badge>
          <Badge variant="outline">{question.difficulty}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-4 bg-muted/50 p-4 rounded-b-lg">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`topic-${question.id}`}>Topic</Label>
            <Input id={`topic-${question.id}`} value={topic} onChange={(e) => setTopic(e.target.value)} onBlur={() => onQuestionUpdate({...question, topic})} placeholder="e.g., Percentages" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`difficulty-${question.id}`}>Difficulty</Label>
            <Select value={question.difficulty} onValueChange={(value) => onQuestionUpdate({...question, difficulty: value as Question['difficulty']})}>
              <SelectTrigger id={`difficulty-${question.id}`}>
                <SelectValue placeholder="Set difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end gap-2 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <Switch id={`unique-${question.id}`} checked={question.isUnique} onCheckedChange={(checked) => onQuestionUpdate({...question, isUnique: checked})} />
              <Label htmlFor={`unique-${question.id}`}>Unique</Label>
            </div>
            <Dialog open={isSolutionDialogOpen} onOpenChange={setIsSolutionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><BookCopy className="w-4 h-4 mr-2"/>Solution</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Solution & Chat</DialogTitle>
                  <DialogDescription>Review the solution and ask follow-up questions.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                    <div className="py-4 pr-6 space-y-6">
                        <div>
                            <h4 className="font-semibold mb-2">Question:</h4>
                            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{question.text}</p>
                             {question.options && question.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {question.options.map((opt, i) => <p key={i} className="text-sm text-muted-foreground">{opt}</p>)}
                                </div>
                            )}
                        </div>
                        <Separator />
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">Solution</h4>
                                {!hasGeneratedSolution && (
                                    <Button onClick={handleGenerateSolution} size="sm" disabled={isGeneratingSolution}>
                                        {isGeneratingSolution ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                        Generate Solution
                                    </Button>
                                )}
                            </div>
                            {isGeneratingSolution ? (
                                <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /><span>Generating...</span></div>
                            ) : hasGeneratedSolution ? (
                                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{question.solution}</ReactMarkdown>
                            ) : (
                                  <p className="text-sm text-muted-foreground">Click the button to generate an AI-powered solution.</p>
                            )}
                        </div>
                        
                        {hasGeneratedSolution && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Ask a Follow-up</h4>
                                    <div className="space-y-4">
                                        {question.chatHistory?.map((msg, index) => (
                                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><BrainCircuit className="w-5 h-5 text-primary" /></div>}
                                                <div className={`rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isReplying && (
                                            <div className="flex items-start gap-3">
                                               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><BrainCircuit className="w-5 h-5 text-primary" /></div>
                                               <div className="rounded-lg p-3 text-sm bg-muted flex items-center space-x-2">
                                                   <Loader2 className="animate-spin h-4 w-4" /> <span>Thinking...</span>
                                               </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-2 pt-4">
                                        <Textarea 
                                            placeholder="Ask a question about the solution..." 
                                            value={followUpQuery}
                                            onChange={(e) => setFollowUpQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAskFollowUp();
                                                }
                                            }}
                                            disabled={isReplying}
                                            rows={1}
                                            className="min-h-0 resize-none"
                                        />
                                        <Button onClick={handleAskFollowUp} disabled={isReplying || !followUpQuery.trim()}>Send</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog onOpenChange={(open) => { if (!open) setAiTricks(null) }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Sparkles className="w-4 h-4 mr-2" />Tricks</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Tips & Tricks</DialogTitle>
                    <DialogDescription>General strategies for solving this type of problem.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                    <div className="py-4 pr-6 min-h-[250px] flex flex-col">
                        {isGeneratingTricks && <div className="flex items-center space-x-2 text-muted-foreground m-auto"><Loader2 className="animate-spin h-4 w-4" /><span>Finding the best strategies...</span></div>}
                        {aiTricks && <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{aiTricks}</ReactMarkdown>}
                        {!aiTricks && !isGeneratingTricks && (
                            <div className="flex flex-col items-center justify-center text-center m-auto">
                                <p className="text-muted-foreground mb-4">Click below to get general tips and tricks for this question's topic from AI.</p>
                                <Button onClick={handleGenerateTricks}>
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Generate Tricks
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function QuestionBankTab({ questions, onQuestionUpdate, segregatedContents }: QuestionBankTabProps) {
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [uniquenessFilter, setUniquenessFilter] = useState<'All' | 'Unique' | 'Common'>('All');
  const [sourceFileFilter, setSourceFileFilter] = useState('All');

  const sourceFiles = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.sourceFile)))], [questions]);
  const availableTopics = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.topic).filter(t => t && t !== 'Uncategorized')))], [questions]);

  const filteredQuestions = useMemo(() => {
    const filtered = questions.filter(q => {
      const topicMatch = topicFilter && topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      const uniquenessMatch = uniquenessFilter !== 'All' ? (uniquenessFilter === 'Unique' ? q.isUnique : !q.isUnique) : true;
      const sourceFileMatch = sourceFileFilter !== 'All' ? q.sourceFile === sourceFileFilter : true;
      return topicMatch && difficultyMatch && uniquenessMatch && sourceFileMatch;
    });

    return filtered.sort((a, b) => a.topic.localeCompare(b.topic));

  }, [questions, topicFilter, difficultyFilter, uniquenessFilter, sourceFileFilter]);

  if (questions.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full">
                    <ListChecks className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Your Question Bank is Empty</CardTitle>
                <CardDescription>Upload PDFs on the dashboard. Questions will appear here.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Questions</CardTitle>
          <CardDescription>Refine the question list to focus your practice.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="topic-filter">Topic</Label>
             <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger id="topic-filter"><SelectValue placeholder="Filter by topic..."/></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Topics</SelectItem>
                {availableTopics.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty-filter">Difficulty</Label>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger id="difficulty-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Difficulties</SelectItem>
                {difficultyOptions.filter(o => o !== 'Not Set').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uniqueness-filter">Uniqueness</Label>
            <Select value={uniquenessFilter} onValueChange={v => setUniquenessFilter(v as any)}>
              <SelectTrigger id="uniqueness-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Unique">Unique</SelectItem>
                <SelectItem value="Common">Common</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="source-filter">Source PDF</Label>
            <Select value={sourceFileFilter} onValueChange={setSourceFileFilter}>
              <SelectTrigger id="source-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sources</SelectItem>
                {sourceFiles.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          {filteredQuestions.length} Question{filteredQuestions.length === 1 ? '' : 's'} Found
        </h3>
        {filteredQuestions.map(q => {
          const theory = segregatedContents.find(c => c.sourceFile === q.sourceFile)?.theory;
          return <QuestionItem key={q.id} question={q} onQuestionUpdate={onQuestionUpdate} theory={theory} />
        })}
      </div>
    </div>
  );
}
