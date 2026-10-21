import type { EssayGrade, Question } from './types';

type QuestionContext = Pick<Question, 'stem' | 'topic' | 'evidenceQuote' | 'sourceFiles' | 'sourcePages'> & { options: { id: string; text: string }[]; sourceLabel?: string };
export type QuizCoachRequest =
  | { action: 'hint'; question: QuestionContext; previousHints: string[] }
  | { action: 'explain'; question: QuestionContext; answer: { selectedTexts: string[]; answerText: string; correctAnswerText: string; explanation: string } }
  | { action: 'grade_essay'; question: QuestionContext; answer: { answerText: string; referenceAnswer: string } };

export async function requestQuizCoach(payload: QuizCoachRequest): Promise<string> {
  const response = await fetch('/api/quiz-coach.ts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Máy chủ chưa trả lời đúng định dạng. Hãy tải lại trang rồi thử lại nhé.');
  }
  const result = await response.json() as { text?: string; error?: string };
  if (!response.ok || !result.text) throw new Error(result.error || 'Mascot chưa trả lời được. Thử lại nhé.');
  return result.text;
}

export async function gradeEssayAnswer(question: Question, answerText: string): Promise<EssayGrade> {
  const text = await requestQuizCoach({
    action: 'grade_essay',
    question: {
      stem: question.stem,
      options: [],
      topic: question.topic,
      evidenceQuote: question.evidenceQuote,
      sourceFiles: question.sourceFiles,
      sourcePages: question.sourcePages,
      sourceLabel: question.sourceLabel,
    },
    answer: { answerText, referenceAnswer: question.explanation },
  });
  let grade: unknown;
  try {
    grade = JSON.parse(text);
  } catch {
    throw new Error('Chưa đọc được điểm chấm tự luận. Hãy thử chấm lại sau.');
  }
  if (!grade || typeof grade !== 'object') throw new Error('Kết quả chấm tự luận không hợp lệ.');
  const value = grade as Record<string, unknown>;
  if (typeof value.score !== 'number' || typeof value.feedback !== 'string') throw new Error('Kết quả chấm tự luận chưa có điểm hoặc nhận xét hợp lệ.');
  if (!Number.isFinite(value.score)) throw new Error('Điểm chấm tự luận không hợp lệ.');
  return { score: Math.round(Math.max(0, Math.min(10, value.score)) * 2) / 2, maxScore: 10, feedback: value.feedback.slice(0, 1200) };
}

export async function gradeEssayBatch(questions: Question[], answers: Record<string, string[]>, onProgress?: (completed: number, total: number) => void): Promise<{ grades: Record<string, EssayGrade>; failedIds: string[] }> {
  const grades: Record<string, EssayGrade> = {};
  const pending: Question[] = [];
  for (const question of questions) {
    if (question.type !== 'essay') continue;
    const answer = answers[question.id]?.[0]?.trim();
    if (!answer) grades[question.id] = { score: 0, maxScore: 10, feedback: 'Chưa có câu trả lời nên câu này được 0 điểm.' };
    else pending.push(question);
  }
  let next = 0;
  let completed = 0;
  const failedIds: string[] = [];
  const worker = async () => {
    while (next < pending.length) {
      const question = pending[next++];
      try { grades[question.id] = await gradeEssayAnswer(question, answers[question.id][0]); }
      catch { failedIds.push(question.id); }
      onProgress?.(++completed, pending.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
  return { grades, failedIds };
}
