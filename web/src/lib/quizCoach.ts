import type { AttemptReviewReport, EssayGrade, Question } from './types';
import { getAttemptReviewContent } from './attemptReview';

type QuestionContext = Pick<Question, 'stem' | 'topic' | 'evidenceQuote' | 'sourceFiles' | 'sourcePages'> & { options: { id: string; text: string }[]; sourceLabel?: string };
export type QuizCoachRequest =
  | { action: 'hint'; question: QuestionContext; previousHints: string[] }
  | { action: 'explain'; question: QuestionContext; answer: { selectedTexts: string[]; answerText: string; correctAnswerText: string; explanation: string } }
  | { action: 'grade_essay'; question: QuestionContext; answer: { answerText: string; referenceAnswer: string } }
  | { action: 'review_attempt'; items: (Pick<AttemptReviewReport['items'][number], 'questionId' | 'topic' | 'status' | 'diagnosis' | 'knowledgeToReview'> & { question: string; learnerAnswer: string; referenceAnswer: string; explanation: string })[] };

export async function requestQuizCoach(payload: QuizCoachRequest): Promise<string> {
  const response = await fetch('/api/quiz-coach', {
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

export async function reviewAttempt(report: AttemptReviewReport, questions: Question[], answers: Record<string, string[]>): Promise<AttemptReviewReport> {
  const eligible = report.items.filter(item => ['wrong', 'unanswered', 'partial'].includes(item.status));
  if (!eligible.length) return report;
  const text = await requestQuizCoach({ action: 'review_attempt', items: eligible.map(({ questionId, topic, status, diagnosis, knowledgeToReview }) => {
    const content = getAttemptReviewContent(questionId, questions, answers);
    return {
      questionId, topic: topic.slice(0, 200), status, question: content.question.slice(0, 1200),
      learnerAnswer: content.learnerAnswer.slice(0, 2200), referenceAnswer: content.referenceAnswer.slice(0, 1400),
      explanation: content.explanation.slice(0, 1200), diagnosis: diagnosis.slice(0, 700),
      knowledgeToReview: knowledgeToReview.slice(0, 5).map(item => item.slice(0, 180)),
    };
  }) });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Không đọc được báo cáo ôn tập từ AI.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Báo cáo ôn tập từ AI không hợp lệ.');
  const value = parsed as Record<string, unknown>;
  if (typeof value.summary !== 'string' || !Array.isArray(value.priorityTopics) || !Array.isArray(value.insights)) throw new Error('Báo cáo ôn tập từ AI thiếu nội dung cần thiết.');
  const allowedIds = new Set(eligible.map(item => item.questionId));
  const insights = value.insights.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const insight = item as Record<string, unknown>;
    if (typeof insight.questionId !== 'string' || !allowedIds.has(insight.questionId)) return [];
    return [{ questionId: insight.questionId, diagnosis: typeof insight.diagnosis === 'string' ? insight.diagnosis.slice(0, 1200) : '', knowledgeToReview: Array.isArray(insight.knowledgeToReview) ? insight.knowledgeToReview.filter((text): text is string => typeof text === 'string').slice(0, 5).map(text => text.slice(0, 240)) : [], practice: typeof insight.practice === 'string' ? insight.practice.slice(0, 600) : '' }];
  });
  const allowedTopics = new Set(report.items.map(item => item.topic));
  const priorityTopics = value.priorityTopics.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const topic = item as Record<string, unknown>;
    if (typeof topic.topic !== 'string' || !allowedTopics.has(topic.topic)) return [];
    return [{ topic: topic.topic.slice(0, 200), reason: typeof topic.reason === 'string' ? topic.reason.slice(0, 500) : '', practice: typeof topic.practice === 'string' ? topic.practice.slice(0, 600) : '' }];
  }).slice(0, 15);
  return {
    ...report, source: 'ai', summary: value.summary.slice(0, 1500),
    priorityTopics: priorityTopics.length ? priorityTopics : report.priorityTopics,
    items: report.items.map(item => {
      const insight = insights.find(entry => entry.questionId === item.questionId);
      return insight ? { ...item, diagnosis: insight.diagnosis || item.diagnosis, knowledgeToReview: insight.knowledgeToReview.length ? insight.knowledgeToReview : item.knowledgeToReview, practice: insight.practice || item.practice } : item;
    }),
  };
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
  return { score: Math.round(Math.max(0, Math.min(1, value.score)) * 10) / 10, maxScore: 1, feedback: value.feedback.slice(0, 1200) };
}

export async function gradeEssayBatch(questions: Question[], answers: Record<string, string[]>, onProgress?: (completed: number, total: number) => void): Promise<{ grades: Record<string, EssayGrade>; failedIds: string[] }> {
  const grades: Record<string, EssayGrade> = {};
  const pending: Question[] = [];
  for (const question of questions) {
    if (question.type !== 'essay') continue;
    const answer = answers[question.id]?.[0]?.trim();
    if (!answer) grades[question.id] = { score: 0, maxScore: 1, feedback: 'Chưa có câu trả lời nên câu này được 0 điểm.' };
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
