import type { GenerateTestFeedbackOutput, GenerateTestFeedbackInput } from '@/ai/flows/test-feedback';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type Question = {
  id: string;
  text: string;
  options?: string[];
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Not Set';
  solution: string;
  chatHistory?: ChatMessage[];
  sourceFile: string;
  correctOption?: string;
  userSelectedOption?: string;
};

export type SegregatedContent = {
  theory: string;
  questions: Question[];
  sourceFile: string;
};

export type TestResult = {
  id: string;
  date: string; // ISO string
  questions: Question[];
  userAnswers: Record<string, string>;
  feedback: GenerateTestFeedbackOutput | null;
  score: number;
  total: number;
  results: GenerateTestFeedbackInput['results'];
};
