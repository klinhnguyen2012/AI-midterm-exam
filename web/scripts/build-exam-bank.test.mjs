import { describe, expect, it } from 'vitest';
import { assignStudyDays, buildAdditionalExams, inferExamTrack } from './build-exam-bank.mjs';

function facts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `source-${i}`,
    topic: `Topic ${i % 4}`,
    sourceFile: `04_extracted_slide_text/day-${i % 4}.md`,
    text: `The course source explains a distinct supported idea number ${i}, including its purpose and application in an AI product.`,
  }));
}

describe('additional exam builder', () => {
  it('fills missing past-exam topics from the inferred study day for useful review reports', () => {
    const questions = [
      { id: 'past', sourceType: 'past_exam_transcription', day: 3, topic: 'Chưa phân loại' },
      { id: 'roi', sourceType: 'past_exam_transcription', day: 3, topic: 'Chưa phân loại', stem: 'Tính ROI và khoản chi phí vận hành cho AI agent.' },
      { id: 'existing', sourceType: 'past_exam_transcription', day: 8, topic: 'RAG' },
      { id: 'authored', sourceType: 'authored', day: 3, topic: 'Chưa phân loại' },
    ];

    assignStudyDays(questions);

    expect(questions[0].topic).toMatch(/agent|tác tử/i);
    expect(questions[1]).toMatchObject({ day: 24, topic: 'Chi phí, hiệu quả đầu tư và định giá' });
    expect(questions[2].topic).toBe('RAG');
    expect(questions[3].topic).toBe('Chưa phân loại');
  });

  it('labels exams with one Phase 2 track while allowing shared Phase 1 questions', () => {
    const byId = new Map([
      ['core', { sourceFiles: ['04_extracted_slide_text/phase_1_day_01_15/day.md'] }],
      ['product', { sourceFiles: ['04_extracted_slide_text/track_1_ai_product_day_16_28/day.md'] }],
    ]);
    expect(inferExamTrack({ questionIds: ['core', 'product'] }, byId)).toBe('track-1');
  });

  it('rejects an exam that mixes questions from different Phase 2 tracks', () => {
    const byId = new Map([
      ['product', { sourceFiles: ['04_extracted_slide_text/track_1_ai_product_day_16_28/day.md'] }],
      ['infra', { sourceFiles: ['04_extracted_slide_text/track_2_ai_infrastructure/day.md'] }],
    ]);
    expect(() => inferExamTrack({ questionIds: ['product', 'infra'] }, byId)).toThrow(/trộn nhiều track/i);
  });

  it('creates fixed balanced forms with unique source-backed questions', () => {
    const result = buildAdditionalExams({
      existingQuestions: [], existingSets: [], facts: facts(24),
      options: { firstNumber: 3, formCount: 3, total: 3, mcqCount: 2, essayCount: 1, randomSeed: 31 },
    });
    expect(result.examSets.map(set => set.id)).toEqual(['exam-03', 'exam-04', 'exam-05']);
    for (const set of result.examSets) {
      expect(set.questionIds).toHaveLength(3);
      expect(set).toMatchObject({ total: 3, mcqCount: 2, essayCount: 1 });
      const selected = set.questionIds.map(id => result.questions.find(question => question.id === id));
      expect(selected.filter(question => question?.type === 'essay')).toHaveLength(1);
      expect(selected.every(question => question?.sourceFiles.length && question.evidenceQuote)).toBe(true);
      expect(selected.filter(question => question?.type === 'essay').every(question => question.correctAnswers === null)).toBe(true);
      const mcq = selected.filter(question => question?.type !== 'essay');
      expect(mcq.every(question => question.verificationStatus === 'answer_proposed')).toBe(true);
      expect(mcq.every(question => !question.options.some(option => option.text === question.topic))).toBe(true);
      expect(new Set(mcq.map(question => question.stem.split('\n')[0])).size).toBeGreaterThan(1);
    }
  });

  it('is deterministic for a fixed seed and keeps question IDs disjoint across new forms', () => {
    const input = { existingQuestions: [], existingSets: [], facts: facts(24), options: { firstNumber: 3, formCount: 3, total: 3, mcqCount: 2, essayCount: 1, randomSeed: 31 } };
    expect(buildAdditionalExams(input)).toEqual(buildAdditionalExams(input));
    const sets = buildAdditionalExams(input).examSets;
    const ids = sets.flatMap(set => set.questionIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects a source pool too small to make distinct forms', () => {
    expect(() => buildAdditionalExams({
      existingQuestions: [], existingSets: [], facts: facts(3),
      options: { firstNumber: 3, formCount: 3, total: 3, mcqCount: 2, essayCount: 1, randomSeed: 31 },
    })).toThrow(/nguồn|câu hỏi/i);
  });
});
