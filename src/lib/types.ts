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
  isUnique: boolean;
  solution: string;
  chatHistory?: ChatMessage[];
  sourceFile: string;
};

export type SegregatedContent = {
  theory: string;
  questions: Question[];
  sourceFile: string;
};
