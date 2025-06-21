'use client'

import React, { useState, useMemo } from 'react';
import { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Tag, Sparkles, ChevronDown, ChevronUp, File, BookCopy } from 'lucide-react';

interface QuestionBankTabProps {
  questions: Question[];
  onQuestionUpdate: (question: Question) => void;
}

const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Not Set'];

function QuestionItem({ question, onQuestionUpdate }: { question: Question, onQuestionUpdate: (question: Question) => void }) {
  const [topic, setTopic] = useState(question.topic);
  const [solution, setSolution] = useState(question.solution);

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-foreground mb-4 whitespace-pre-wrap">{question.text}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary"><File className="w-3 h-3 mr-1"/>{question.sourceFile}</Badge>
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
        <div className="flex items-end gap-4 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <Switch id={`unique-${question.id}`} checked={question.isUnique} onCheckedChange={(checked) => onQuestionUpdate({...question, isUnique: checked})} />
              <Label htmlFor={`unique-${question.id}`}>Unique</Label>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline"><BookCopy className="w-4 h-4 mr-2"/>Solution</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Solution & Notes</DialogTitle>
                  <DialogDescription>Add or view the solution and any tips for this question.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <h4 className="font-semibold mb-2">Question:</h4>
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{question.text}</p>
                  <Label htmlFor={`solution-${question.id}`} className="font-semibold">Your Solution/Notes</Label>
                  <Textarea id={`solution-${question.id}`} value={solution} onChange={(e) => setSolution(e.target.value)} className="mt-2 min-h-[150px]" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" onClick={() => onQuestionUpdate({...question, solution})}>Save changes</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function QuestionBankTab({ questions, onQuestionUpdate }: QuestionBankTabProps) {
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [uniquenessFilter, setUniquenessFilter] = useState<'All' | 'Unique' | 'Common'>('All');
  const [sourceFileFilter, setSourceFileFilter] = useState('All');

  const sourceFiles = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.sourceFile)))], [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const topicMatch = topicFilter ? q.topic.toLowerCase().includes(topicFilter.toLowerCase()) : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      const uniquenessMatch = uniquenessFilter !== 'All' ? (uniquenessFilter === 'Unique' ? q.isUnique : !q.isUnique) : true;
      const sourceFileMatch = sourceFileFilter !== 'All' ? q.sourceFile === sourceFileFilter : true;
      return topicMatch && difficultyMatch && uniquenessMatch && sourceFileMatch;
    });
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
            <Input id="topic-filter" placeholder="Filter by topic..." value={topicFilter} onChange={e => setTopicFilter(e.target.value)} />
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
        {filteredQuestions.map(q => <QuestionItem key={q.id} question={q} onQuestionUpdate={onQuestionUpdate} />)}
      </div>
    </div>
  );
}
