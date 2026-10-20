import { describe, expect, it } from 'vitest';
import { buildExamSet, overlapRatio } from './examBank';
import type { ExamSet, Question } from './types';

function makeQuestion(id: string, type: Question['type'], stem = id): Question {
  return {
    id, stem, type,
    options: type === 'essay' ? [] : [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
    correctAnswers: null, explanation: '', topic: 'AI', day: null, difficulty: 'medium',
    sourceFiles: [], sourcePages: [], evidenceQuote: '', verificationStatus: 'transcribed',
    reviewerNotes: '', createdAt: '', updatedAt: '',
  };
}

function pool(mcq: number, essay: number): Question[] {
  return [
    ...Array.from({ length: mcq }, (_, i) => makeQuestion(`m${i}`, 'single_choice')),
    ...Array.from({ length: essay }, (_, i) => makeQuestion(`e${i}`, 'essay')),
  ];
}

const fixed = (questions: Question[], id: string): ExamSet => ({
  id, title: id, questionIds: questions.map(question => question.id), total: questions.length,
  mcqCount: questions.filter(question => question.type !== 'essay').length,
  essayCount: questions.filter(question => question.type === 'essay').length,
  sourceSets: [], createdAt: '',
});

describe('exam bank generation', () => {
  it('builds a fixed 85-question form with 60 MCQ and 25 essay questions', () => {
    const questions = pool(60, 25);
    const result = buildExamSet(questions, { id: 'exam-01', title: 'Đề 01', total: 85, mcqCount: 60, essayCount: 25 });
    expect(result.questionIds).toHaveLength(85);
    expect(result.mcqCount).toBe(60);
    expect(result.essayCount).toBe(25);
  });

  it('does not select duplicate stems in one exam', () => {
    const questions = [...pool(60, 25), makeQuestion('duplicate', 'single_choice', '  M0!!! ')];
    const result = buildExamSet(questions, { id: 'exam-01', title: 'Đề 01', total: 85, mcqCount: 60, essayCount: 25 });
    expect(result.questionIds).toHaveLength(85);
    expect(result.questionIds).not.toContain('duplicate');
  });

  it('measures cross-exam overlap and rejects a form above its limit', () => {
    const first = pool(60, 25);
    const second = [
      ...first.slice(0, 18),
      ...Array.from({ length: 42 }, (_, i) => makeQuestion(`new-m${i}`, 'single_choice')),
      ...Array.from({ length: 25 }, (_, i) => makeQuestion(`new-e${i}`, 'essay')),
    ];
    expect(overlapRatio(fixed(first, 'one'), fixed(second, 'two'))).toBeCloseTo(18 / 85);
    expect(() => buildExamSet(first, { id: 'too-similar', title: 'Too similar', total: 85, mcqCount: 60, essayCount: 25 }, [fixed(first, 'first')], { maxOverlap: 0.2 })).toThrow(/trùng/i);
  });

  it('reports when the source pool cannot fill the requested question mix', () => {
    expect(() => buildExamSet(pool(20, 4), { id: 'short', title: 'Short', total: 85, mcqCount: 60, essayCount: 25 })).toThrow(/cần 60 MCQ và 25 tự luận/i);
  });
});
