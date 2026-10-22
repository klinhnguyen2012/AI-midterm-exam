import { afterEach, describe, expect, it, vi } from 'vitest';
import { gradeEssayAnswer } from './quizCoach';
import type { Question } from './types';

const essay: Question = {
  id: 'essay', type: 'essay', stem: 'Giải thích ý chính.', options: [], correctAnswers: null,
  explanation: 'Nêu hai ý chính.', topic: 'AI', day: 1, difficulty: 'easy', sourceFiles: [], sourcePages: [],
  evidenceQuote: '', verificationStatus: 'answer_proposed', reviewerNotes: '', createdAt: '', updatedAt: '',
};

afterEach(() => vi.unstubAllGlobals());

describe('essay grading', () => {
  it('uses a one-point maximum and accepts partial tenths', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '{"score":0.6,"feedback":"Thiếu một ý."}' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })));
    await expect(gradeEssayAnswer(essay, 'Một ý đúng.')).resolves.toEqual({ score: 0.6, maxScore: 1, feedback: 'Thiếu một ý.' });
  });

  it('clamps proposed grading to one point', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '{"score":8,"feedback":"Đủ ý."}' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })));
    await expect(gradeEssayAnswer(essay, 'Đủ ý.')).resolves.toMatchObject({ score: 1, maxScore: 1 });
  });
});
