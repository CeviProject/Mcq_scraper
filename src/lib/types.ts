import type { GenerateTestFeedbackOutput } from '@/ai/flows/test-feedback';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

// Represents a question as stored in the database
export type Question = {
  id: string;
  document_id: string;
  user_id: string;
  text: string;
  options?: string[];
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Not Set';
  solution: string | null;
  correct_option: string | null;
  sourceFile?: string; // This will be joined from the documents table
};

// Represents a document as stored in the database
export type Document = {
  id: string;
  user_id: string;
  source_file: string;
  theory: string | null;
  questions?: Question[]; // Populated via join
};

// Represents a test result as stored in the database
export type Test = {
    id: string;
    user_id: string;
    score: number;
    total: number;
    feedback: GenerateTestFeedbackOutput | null;
    created_at: string;
};

// Represents a user's answer for a specific question in a test
export type TestAttempt = {
    id: string;
    test_id: string;
    question_id: string;
    user_answer: string | null;
    is_correct: boolean;
};


// Transient type for UI representation of a completed test
export type TestResult = {
  id: string;
  date: string;
  questions: Question[];
  userAnswers: Record<string, string>; // questionId -> userAnswer
  feedback: GenerateTestFeedbackOutput | null;
  score: number;
  total: number;
};
