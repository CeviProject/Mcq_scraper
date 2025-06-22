'use client'

import React from 'react';
import { Question, Document, ChatMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';
import { QuestionItem } from './question-item';

interface ReviewTabProps {
  questions: Question[];
  onQuestionUpdate: (question: Partial<Question> & {id: string}) => void;
  documents: Document[];
  questionUiState: Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>;
  setQuestionUiState: React.Dispatch<React.SetStateAction<Map<string, { userSelectedOption?: string; chatHistory?: ChatMessage[] }>>>;
}

export default function ReviewTab({ questions, onQuestionUpdate, documents, questionUiState, setQuestionUiState }: ReviewTabProps) {

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
                    <Bookmark className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Bookmarked Questions</CardTitle>
                <CardDescription>You can bookmark questions from the Question Bank tab to review them later.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Bookmarks</CardTitle>
          <CardDescription>Here are all the questions you've marked for review.</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {questions.map(q => {
          const theory = documents.find(c => c.id === q.document_id)?.theory;
          const uiState = questionUiState.get(q.id) || {};
          return <QuestionItem key={q.id} question={q} onQuestionUpdate={onQuestionUpdate} theory={theory} uiState={uiState} setUiState={handleSetUiState} />
        })}
      </div>
    </div>
  );
}
