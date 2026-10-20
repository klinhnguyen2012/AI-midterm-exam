import { describe, expect, it } from 'vitest';
import { buildAdditionalExams } from './build-exam-bank.mjs';

function facts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `source-${i}`,
    topic: `Topic ${i % 7}`,
    sourceFile: `04_extracted_slide_text/day-${i % 7}.md`,
    text: `The course source explains a distinct supported idea number ${i}, including its purpose and application in an AI product.`,
  }));
}

describe('additional exam builder', () => {
  it('creates fixed balanced forms with unique source-backed questions', () => {
    const result = buildAdditionalExams({
      existingQuestions: [], existingSets: [], facts: facts(18),
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
    const input = { existingQuestions: [], existingSets: [], facts: facts(18), options: { firstNumber: 3, formCount: 3, total: 3, mcqCount: 2, essayCount: 1, randomSeed: 31 } };
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
