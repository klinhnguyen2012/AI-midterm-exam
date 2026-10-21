import type { Question } from './types';

type QuestionContext = Pick<Question, 'stem' | 'topic' | 'evidenceQuote' | 'sourceFiles' | 'sourcePages'> & { options: { id: string; text: string }[]; sourceLabel?: string };
export type QuizCoachRequest =
  | { action: 'hint'; question: QuestionContext; previousHints: string[] }
  | { action: 'explain'; question: QuestionContext; answer: { selectedTexts: string[]; answerText: string; correctAnswerText: string; explanation: string } };

export async function requestQuizCoach(payload: QuizCoachRequest): Promise<string> {
  const response = await fetch('/api/quiz-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { text?: string; error?: string };
  if (!response.ok || !result.text) throw new Error(result.error || 'Mascot chưa trả lời được. Thử lại nhé.');
  return result.text;
}
