import { describe, expect, it } from 'vitest';
import { createAttemptWithReview } from './attemptReview';
import type { Attempt, EssayGrade, Question } from './types';

const attempt: Attempt = {
  id: 'attempt-1', startedAt: '2026-10-22T00:00:00.000Z', submittedAt: '2026-10-22T00:10:00.000Z',
  questionIds: ['wrong-mcq', 'essay'], answers: { 'wrong-mcq': ['B'], essay: ['My partial answer'] },
  score: 0, total: 2, mode: 'practice',
};

const questions: Question[] = [
  {
    id: 'wrong-mcq', stem: 'What does TNR measure?', type: 'single_choice',
    options: [{ id: 'A', text: 'Correctly rejecting bad outputs' }, { id: 'B', text: 'Accepting bad outputs' }],
    correctAnswers: ['A'], explanation: 'TNR measures correct rejection of bad outputs.', topic: 'Evaluation', day: 1,
    difficulty: 'medium', sourceFiles: [], sourcePages: [], evidenceQuote: '', verificationStatus: 'answer_proposed',
    reviewerNotes: '', createdAt: '', updatedAt: '', conceptToReview: 'True negative rate',
  },
  {
    id: 'essay', stem: 'Explain how to improve evaluation.', type: 'essay', options: [], correctAnswers: null,
    explanation: 'A complete answer names a metric and explains its use.', topic: 'Evaluation', day: 1,
    difficulty: 'medium', sourceFiles: [], sourcePages: [], evidenceQuote: '', verificationStatus: 'transcribed',
    reviewerNotes: '', createdAt: '', updatedAt: '',
  },
];

describe('attempt review snapshot', () => {
  it('attaches a durable preliminary report immediately, before essay grading finishes', () => {
    const savedAttempt = createAttemptWithReview(attempt, questions, attempt.answers);

    expect(savedAttempt.reviewReport?.items.map(item => [item.questionId, item.status])).toEqual([
      ['wrong-mcq', 'wrong'], ['essay', 'ungraded'],
    ]);
    expect(savedAttempt.reviewReport?.items[0].knowledgeToReview).toContain('True negative rate');
  });

  it('replaces pending essay items with rubric feedback and study guidance after grading', () => {
    const grades: Record<string, EssayGrade> = {
      essay: { score: 5, maxScore: 10, feedback: 'Thiếu giải thích cách chọn metric và cách áp dụng.' },
    };
    const gradedAttempt = createAttemptWithReview(attempt, questions, attempt.answers, grades);
    const essayItem = gradedAttempt.reviewReport?.items.find(item => item.questionId === 'essay');

    expect(essayItem).toMatchObject({
      status: 'partial',
      diagnosis: 'Thiếu giải thích cách chọn metric và cách áp dụng.',
      knowledgeToReview: ['Evaluation'],
    });
    expect(essayItem?.practice).toContain('Evaluation');
  });

});
