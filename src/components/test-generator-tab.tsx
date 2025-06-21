'use client'

import React, { useState, useMemo } from 'react';
import { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Wand2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

const difficultyOptions: Question['difficulty'][] = ['Easy', 'Medium', 'Hard'];

export default function TestGeneratorTab({ questions }: { questions: Question[] }) {
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [numQuestions, setNumQuestions] = useState(10);
  const [generatedTest, setGeneratedTest] = useState<Question[]>([]);

  const availableTopics = useMemo(() => {
      const topics = new Set(questions.map(q => q.topic).filter(t => t !== 'Uncategorized'));
      return ['All', ...Array.from(topics)];
  }, [questions]);

  const handleGenerateTest = () => {
    const filtered = questions.filter(q => {
      const topicMatch = topicFilter !== 'All' ? q.topic === topicFilter : true;
      const difficultyMatch = difficultyFilter !== 'All' ? q.difficulty === difficultyFilter : true;
      return topicMatch && difficultyMatch;
    });

    const shuffled = filtered.sort(() => 0.5 - Math.random());
    setGeneratedTest(shuffled.slice(0, numQuestions));
  };
  
  if (questions.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Test Generator is Waiting</CardTitle>
                <CardDescription>Upload PDFs and classify questions to start generating mock tests.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create a Mock Test</CardTitle>
            <CardDescription>Set your criteria and generate a custom practice test on the fly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              />
            </div>
          </CardContent>
          <CardContent>
            <Button onClick={handleGenerateTest} className="w-full" variant="default">
              <Wand2 className="mr-2 h-4 w-4" /> Generate Test
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="min-h-full">
          <CardHeader>
            <CardTitle>Your Custom Test</CardTitle>
            <CardDescription>
              {generatedTest.length > 0
                ? `Here is your test with ${generatedTest.length} question(s).`
                : "Your generated test will appear here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedTest.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {generatedTest.map((q, index) => (
                  <AccordionItem value={`item-${index}`} key={q.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2 text-left">
                        <span className="font-semibold">{index + 1}.</span>
                        <span>{q.text.substring(0, 80)}{q.text.length > 80 ? '...' : ''}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p className="font-semibold">{q.text}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Topic: {q.topic}</Badge>
                        <Badge variant="outline">Difficulty: {q.difficulty}</Badge>
                      </div>
                      <div className="mt-4 p-4 bg-muted/50 rounded-md">
                        <h4 className="font-semibold mb-2 text-sm">Solution:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.solution}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
                <div className="flex flex-col items-center justify-center text-center h-80 border-2 border-dashed rounded-lg">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Configure your test options and click "Generate Test".</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
