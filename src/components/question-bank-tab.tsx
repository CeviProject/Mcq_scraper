'use client'

import React, { useState, useMemo } from 'react';
import { Question, Document, ChatMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Sparkles, File, HelpCircle, Wand2, Loader2, BrainCircuit, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getSolutionAction, getTricksAction, askFollowUpAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn, normalizeOption } from '@/lib/utils';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface QuestionBankTabProps {
  questions: Question[];
  onQuestionUpdate: (question: Partial<Question> & {id: string}) => void;
  documents: Document[];
  questionUiState: Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>;
  setQuestionUiState: React.Dispatch<React.SetStateAction<Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>>>;
}

const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Not Set'];

function QuestionItem({ 
    question, 
    onQuestionUpdate, 
    theory, 
    uiState,
    setUiState
}: { 
    question: Question, 
    onQuestionUpdate: (question: Partial<Question> & { id: string }) => void, 
    theory?: string | null,
    uiState: { userSelectedOption?: string; chatHistory?: ChatMessage[] },
    setUiState: (questionId: string, newState: Partial<{ userSelectedOption?: string; chatHistory?: ChatMessage[] }>) => void
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSolutionDialogOpen, setIsSolutionDialogOpen] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [aiTricks, setAiTricks] = useState<string | null>(null);
  const [isGeneratingTricks, setIsGeneratingTricks] = useState(false);
  const { toast } = useToast();

  const isVerified = !!question.correct_option;

  const handleVerifyAnswer = async () => {
    if (!uiState.userSelectedOption) {
      toast({ variant: 'destructive', title: 'Please select an option first.' });
      return;
    }
    setIsVerifying(true);
    
    if (!question.solution) {
      const result = await getSolutionAction({ 
        questionText: question.text,
        options: question.options,
        theoryContext: theory || undefined 
      });

      if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
        setIsVerifying(false);
        return;
      }
      onQuestionUpdate({ 
        id: question.id,
        solution: result.solution, 
        correct_option: result.correctOption,
        difficulty: question.difficulty === 'Not Set' ? result.difficulty : question.difficulty,
      });
      setUiState(question.id, { chatHistory: [] });
    }

    setIsVerifying(false);
  };

  const handleAskFollowUp = async () => {
    if (!followUpQuery.trim()) return;
    setIsReplying(true);
    const currentQuery = followUpQuery;
    setFollowUpQuery('');

    const currentHistory = uiState.chatHistory || [];
    const newUserMessage = { role: 'user' as const, content: currentQuery };
    
    setUiState(question.id, { chatHistory: [...currentHistory, newUserMessage] });

    const result = await askFollowUpAction({
        questionText: question.text,
        options: question.options,
        solution: question.solution || "",
        theoryContext: theory || undefined,
        chatHistory: currentHistory,
        userQuery: currentQuery,
    });
    
    if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
        setUiState(question.id, { chatHistory: currentHistory });
    } else {
        const aiMessage = { role: 'model' as const, content: result.answer };
        setUiState(question.id, { chatHistory: [...currentHistory, newUserMessage, aiMessage] });
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
    setUiState(question.id, { userSelectedOption: option });
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <p className="text-foreground mb-4 whitespace-pre-wrap">{question.text}</p>
        {question.options && question.options.length > 0 && (
          <RadioGroup 
            className="mb-4 space-y-2" 
            value={uiState.userSelectedOption} 
            onValueChange={handleSelectOption}
            disabled={isVerified}
          >
            {question.options.map((option, index) => {
              const isCorrect = normalizeOption(question.correct_option || '') === normalizeOption(option);
              const isSelected = uiState.userSelectedOption === option;
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
                  <Label 
                    htmlFor={`${question.id}-option-${index}`}
                    className={cn(
                      "cursor-pointer flex items-center gap-2",
                      isVerified && isCorrect && "text-green-500 font-bold",
                      isVerified && isSelected && !isCorrect && "text-red-500 font-bold"
                    )}
                  >
                    {option}
                    {isVerified && isCorrect && <CheckCircle className="inline w-4 h-4" />}
                    {isVerified && isSelected && !isCorrect && <XCircle className="inline w-4 h-4" />}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary"><File className="w-3 h-3 mr-1"/>{question.sourceFile}</Badge>
          <Badge variant="outline">Topic: {question.topic}</Badge>
          <Badge variant="outline">{question.difficulty}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-4 items-center bg-muted/50 p-4 rounded-b-lg">
        <div className="flex-1 w-full flex items-center gap-4">
            <Select value={question.difficulty} onValueChange={(value) => onQuestionUpdate({id: question.id, difficulty: value as Question['difficulty']})}>
              <SelectTrigger id={`difficulty-${question.id}`} className="w-[120px]">
                <SelectValue placeholder="Set difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={question.topic} onChange={(e) => onQuestionUpdate({id: question.id, topic: e.target.value})} placeholder="e.g., Percentages" />
        </div>
        <div className="flex items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            {!isVerified ? (
              <Button onClick={handleVerifyAnswer} disabled={isVerifying || !uiState.userSelectedOption} className="w-full sm:w-auto">
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Answer
              </Button>
            ) : (
              <Dialog open={isSolutionDialogOpen} onOpenChange={setIsSolutionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto"><HelpCircle className="w-4 h-4 mr-2"/>Solution & Chat</Button>
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
                          </div>
                          <Separator />
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="font-semibold">Solution</h4>
                              </div>
                               <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{question.solution || ''}</ReactMarkdown>
                          </div>
                          
                          <Separator />
                          <div className="space-y-4">
                              <h4 className="font-semibold">Ask a Follow-up</h4>
                              <div className="space-y-4">
                                  {uiState.chatHistory?.map((msg, index) => (
                                      <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                          {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><BrainCircuit className="w-5 h-5 text-primary" /></div>}
                                          <div className={`rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
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
                      </div>
                  </ScrollArea>
                  <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Close</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog onOpenChange={(open) => { if (!open) setAiTricks(null) }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto"><Sparkles className="w-4 h-4 mr-2" />Tricks</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Tips & Tricks</DialogTitle>
                    <DialogDescription>General strategies for solving this type of problem.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                    <div className="py-4 pr-6 min-h-[250px] flex flex-col">
                        {isGeneratingTricks && <div className="flex items-center space-x-2 text-muted-foreground m-auto"><Loader2 className="animate-spin h-4 w-4" /><span>Finding the best strategies...</span></div>}
                        {aiTricks && <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{aiTricks}</ReactMarkdown>}
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


export default function QuestionBankTab({ questions, onQuestionUpdate, documents, questionUiState, setQuestionUiState }: QuestionBankTabProps) {
  const [topicFilter, setTopicFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sourceFileFilter, setSourceFileFilter] = useState<string[]>([]);

  const sourceFiles = useMemo(() => [...Array.from(new Set(questions.map(q => q.sourceFile)))], [questions]);
  const availableTopics = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.topic).filter(t => t && t !== 'Uncategorized')))], [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const topicMatch = topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      const sourceFileMatch = sourceFileFilter.length === 0 ? true : sourceFileFilter.includes(q.sourceFile!);
      return topicMatch && difficultyMatch && sourceFileMatch;
    }).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [questions, topicFilter, difficultyFilter, sourceFileFilter]);

  const handleSetUiState = (questionId: string, newState: Partial<{ userSelectedOption?: string; chatHistory?: ChatMessage[] }>) => {
    setQuestionUiState(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(questionId) || {};
        newMap.set(questionId, { ...currentState, ...newState });
        return newMap;
    });
  };

  if (questions.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full">
                    <ListChecks className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Your Question Bank is Empty</CardTitle>
                <CardDescription>Upload PDFs on the Upload tab. Questions will appear here.</CardDescription>
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label htmlFor="source-filter">Source PDF</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {sourceFileFilter.length === 0 ? 'All Sources' : sourceFileFilter.length === 1 ? sourceFileFilter[0] : `${sourceFileFilter.length} sources selected`}
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          {filteredQuestions.length} Question{filteredQuestions.length === 1 ? '' : 's'} Found
        </h3>
        {filteredQuestions.map(q => {
          const theory = documents.find(c => c.id === q.document_id)?.theory;
          const uiState = questionUiState.get(q.id) || {};
          return <QuestionItem key={q.id} question={q} onQuestionUpdate={onQuestionUpdate} theory={theory} uiState={uiState} setUiState={handleSetUiState} />
        })}
      </div>
    </div>
  );
}
