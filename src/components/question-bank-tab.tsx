'use client'

import React, { useState, useMemo } from 'react';
import { Question, Document, ChatMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ListChecks, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuestionItem } from './question-item';

interface QuestionBankTabProps {
  questions: Question[];
  onQuestionUpdate: (question: Partial<Question> & {id: string}) => void;
  documents: Document[];
  questionUiState: Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>;
  setQuestionUiState: React.Dispatch<React.SetStateAction<Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>>>;
}

const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Not Set'];

export default function QuestionBankTab({ questions, onQuestionUpdate, documents, questionUiState, setQuestionUiState }: QuestionBankTabProps) {
  const [topicFilter, setTopicFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [sourceFileFilter, setSourceFileFilter] = useState<string[]>([]);
  const [bookmarkedFilter, setBookmarkedFilter] = useState('All');

  const sourceFiles = useMemo(() => [...Array.from(new Set(questions.map(q => q.sourceFile)))], [questions]);
  const availableTopics = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.topic).filter(t => t && t !== 'Uncategorized')))], [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const topicMatch = topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      const sourceFileMatch = sourceFileFilter.length === 0 ? true : sourceFileFilter.includes(q.sourceFile!);
      const bookmarkedMatch = bookmarkedFilter === 'All' ? true : (bookmarkedFilter === 'Bookmarked' ? q.is_bookmarked : !q.is_bookmarked);
      return topicMatch && difficultyMatch && sourceFileMatch && bookmarkedMatch;
    }).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [questions, topicFilter, difficultyFilter, sourceFileFilter, bookmarkedFilter]);

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
            <Label htmlFor="source-filter">Source PDF</Label>
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
          <div className="space-y-2">
            <Label htmlFor="bookmarked-filter">Bookmarks</Label>
            <Select value={bookmarkedFilter} onValueChange={setBookmarkedFilter}>
              <SelectTrigger id="bookmarked-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Questions</SelectItem>
                <SelectItem value="Bookmarked">Bookmarked</SelectItem>
                <SelectItem value="Not Bookmarked">Not Bookmarked</SelectItem>
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
          const theory = documents.find(c => c.id === q.document_id)?.theory;
          const uiState = questionUiState.get(q.id) || {};
          return <QuestionItem key={q.id} question={q} onQuestionUpdate={onQuestionUpdate} theory={theory} uiState={uiState} setUiState={handleSetUiState} />
        })}
      </div>
    </div>
  );
}
