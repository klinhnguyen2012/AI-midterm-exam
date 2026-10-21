export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'ordering' | 'numeric' | 'essay';
export type VerificationStatus = 'untranscribed' | 'transcribed' | 'answer_proposed' | 'expert_verified';
export interface Option { id: string; text: string; explanation?: string; }
export interface Question {
  id: string; stem: string; type: QuestionType; options: Option[]; correctAnswers: string[] | null;
  explanation: string; topic: string; day: number | null; difficulty: 'easy' | 'medium' | 'hard';
  sourceFiles: string[]; sourcePages: number[]; evidenceQuote: string; sourceLabel?: string; verificationStatus: VerificationStatus;
  reviewerNotes: string; createdAt: string; updatedAt: string; commonTraps?: string; conceptToReview?: string;
  sourceType?: 'past_exam_transcription' | 'generated_variant' | 'assistant_authored' | 'user_added';
  rawOcrText?: string;
}
export interface EssayGrade { score: number; maxScore: number; feedback: string; }
export interface Attempt { id: string; startedAt: string; submittedAt: string; questionIds: string[]; answers: Record<string, string[]>; score: number; total: number; mode: 'practice' | 'exam'; examSetId?: string; essayGrades?: Record<string, EssayGrade>; }
export interface ExamSet {
  id: string; title: string; questionIds: string[]; total: number; mcqCount: number; essayCount: number;
  sourceSets: string[]; createdAt: string;
}
