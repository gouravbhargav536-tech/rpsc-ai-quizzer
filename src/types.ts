export interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  teacherInsight?: string;
  videoUrl?: string;
  imageUrl?: string;
  patternYear?: string;
  extraFacts?: string[];
  wrongOptionsAnalysis?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export type Subject = 
  | 'Rajasthan GK'
  | 'Indian GK'
  | 'Mathematics'
  | 'Science'
  | 'Hindi'
  | 'English'
  | 'Reasoning'
  | 'Rajasthan Current Affairs'
  | 'National Current Affairs';

export type ExamPattern = '2012-2020' | '2021-Present';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Language = 'Hindi' | 'English' | 'Hinglish';

export interface QuizConfig {
  subject: Subject;
  difficulty: Difficulty;
  language: Language;
  questionCount: number;
  pattern: ExamPattern;
  topic?: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  questions: Question[];
  userAnswers: (string | null)[];
}

export type ThemeType = 'geometric' | 'rajasthan';

export interface User {
  name: string;
  email: string;
  isAdmin?: boolean;
}
