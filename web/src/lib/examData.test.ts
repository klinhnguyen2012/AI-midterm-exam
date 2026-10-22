import { afterEach, describe, expect, it, vi } from 'vitest';
import raw from '../data/exam_bank_seed.json';
import { loadExamData } from './examData';
import { normalizeQuestionText, overlapRatio } from './examBank';
import type { ExamSet, Question } from './types';

const bank = raw as unknown as { questions: Question[]; examSets: ExamSet[] };
const { questions: examQuestions, examSets } = bank;

describe('provided exam bank', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the large local bank as a separate data request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(bank), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const loaded = await loadExamData();
    expect(fetchMock).toHaveBeenCalledWith('/dataset/05_data/exam_bank_seed.json');
    expect(loaded.examSets).toHaveLength(20);
    expect(loaded.questions).toHaveLength(examQuestions.length);
  });

  it('reports when the local bank asset cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(loadExamData()).rejects.toThrow(/ngân hàng đề/i);
  });

  it('contains 22 stable exam forms and gives each added form 85 questions with the requested mix', () => {
    expect(examSets).toHaveLength(20);
    expect(examSets.map(set => set.id)).toEqual(Array.from({ length: 20 }, (_, i) => `exam-${String(i + 1).padStart(2, '0')}`));
    const byId = new Map(examQuestions.map(question => [question.id, question]));
    for (const set of examSets.slice(2)) {
      expect(set).toMatchObject({ total: 85, mcqCount: 60, essayCount: 25 });
      expect(set.questionIds).toHaveLength(85);
      expect(set.questionIds.filter(id => byId.get(id)?.type === 'essay')).toHaveLength(25);
      expect(set.questionIds.filter(id => byId.get(id)?.type !== 'essay')).toHaveLength(60);
    }
  });

  it('keeps every pair of exam forms at or below 20 percent shared question IDs', () => {
    for (let i = 0; i < examSets.length; i++) {
      for (const other of examSets.slice(i + 1)) expect(overlapRatio(examSets[i], other)).toBeLessThanOrEqual(0.2);
    }
  });

  it('does not mix Phase 2 tracks inside any exam form', () => {
    const byId = new Map(examQuestions.map(question => [question.id, question]));
    for (const set of examSets) {
      const tracks = new Set(set.questionIds.flatMap(id => byId.get(id)?.sourceFiles ?? []).flatMap(source => {
        const match = source.match(/track_([123])_ai_(?:product|infrastructure|applications?)/i);
        return match ? [`track-${match[1]}`] : [];
      }));
      expect(tracks.size, `${set.id} contains ${[...tracks].join(', ')}`).toBeLessThanOrEqual(1);
      if (tracks.size === 1) expect(set.track).toBe([...tracks][0]);
    }
  });

  it('grounds all additional questions in local evidence and leaves generated essay grading manual', () => {
    const byId = new Map(examQuestions.map(question => [question.id, question]));
    for (const set of examSets.slice(2)) {
      for (const id of set.questionIds) {
        const question = byId.get(id)!;
        expect(question.sourceFiles.length).toBeGreaterThan(0);
        expect(question.evidenceQuote.trim().length).toBeGreaterThan(0);
        if (question.type === 'essay') expect(question.correctAnswers).toBeNull();
        else expect(question.verificationStatus).toBe('answer_proposed');
      }
    }
  });

  it('does not repeat a normalized question stem across the 20 added forms', () => {
    const addedIds = new Set(examSets.slice(2).flatMap(set => set.questionIds));
    const stems = examQuestions.filter(question => addedIds.has(question.id)).map(question => normalizeQuestionText(question.stem));
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('includes the two fixed 85-question forms with the requested balance', () => {
    const first = examSets.find(set => set.id === 'exam-01');
    const second = examSets.find(set => set.id === 'exam-02');
    expect(first).toMatchObject({ total: 85, sourceSets: ['middle_test', 'authored'] });
    expect(first?.essayCount).toBeGreaterThanOrEqual(25);
    expect(first?.essayCount).toBeLessThanOrEqual(35);
    expect(second).toMatchObject({ total: 85, mcqCount: 60, essayCount: 25 });
  });

  it('does not repeat the same normalized question stem inside a fixed exam', () => {
    const byId = new Map(examQuestions.map(question => [question.id, question]));
    for (const set of examSets.slice(0, 2)) {
      const stems = set.questionIds.map(id => normalizeQuestionText(byId.get(id)!.stem));
      expect(new Set(stems).size, `${set.id} repeats a question`).toBe(stems.length);
    }
  });

  it('provides proposed answers or response guidance for every question in Exam 01', () => {
    const first = examSets.find(set => set.id === 'exam-01')!;
    const byId = new Map(examQuestions.map(question => [question.id, question]));
    expect(first.questionIds.every(id => byId.has(id))).toBe(true);
    for (const id of first.questionIds) {
      const question = byId.get(id)!;
      expect(question.verificationStatus).toBe('answer_proposed');
      expect(question.explanation.trim().length).toBeGreaterThan(0);
      if (question.type === 'essay') expect(question.correctAnswers).toBeNull();
      else if (question.correctAnswers === null) expect(question.explanation).toMatch(/câu hỏi cá nhân hóa/i);
    }
    expect(first.questionIds.filter(id => byId.get(id)!.sourceFiles.some(path => path.includes('02_past_exam_images/middle_test/')))).toHaveLength(81);
  });

  it('keeps the exam forms from sharing the same question records', () => {
    const first = examSets.find(set => set.id === 'exam-01')!;
    const second = examSets.find(set => set.id === 'exam-02')!;
    expect(overlapRatio(first, second)).toBeLessThanOrEqual(0.2);
  });
});
