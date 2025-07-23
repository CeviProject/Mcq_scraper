
import type { GenerateTestFeedbackOutput } from '@/ai/flows/test-feedback';
import type { GenerateRevisionPlanOutput } from '@/ai/flows/revision-planner';
import type { User } from '@supabase/supabase-js';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

// Extends Supabase User to include profile data
export type AppUser = User & {
    profile: Profile;
};

// Represents the user profile stored in the 'profiles' table
export type Profile = {
    id: string;
    username: string;
    gemini_api_key?: string | null;
};

export type Session = import('@supabase/supabase-js').Session;


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
  is_bookmarked: boolean;
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


// Represents the AI-generated revision plan
export type RevisionPlan = GenerateRevisionPlanOutput;
