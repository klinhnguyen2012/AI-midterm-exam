import { describe, expect, it } from 'vitest';
import { calculateTopicAccuracy, gradeMultipleChoice, loadAttemptData, loadQuestions, parseCsv, parseQuestionBank, questionBankToCsv, saveAttempt, scoreAttempt, selectQuestions, shuffleOptionsWithoutLosingCorrectIds } from './quiz';
import { seedQuestions } from './seed';
import type { Question } from './types';

const q = (id: string, verified = true): Question => ({ id, type: 'single_choice', stem: id, options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }], correctAnswers: ['A'], explanation: 'evidence', topic: 'RAG', day: 1, difficulty: 'easy', sourceFiles: [], sourcePages: [], evidenceQuote: '', verificationStatus: verified ? 'expert_verified' : 'transcribed', reviewerNotes: '', createdAt: '', updatedAt: '' });

describe('quiz grading and selection', () => {
  it('excludes unverified questions from scored selection', () => {
    expect(selectQuestions([q('verified'), q('pending', false)], 10, { scoredOnly: true }).map(x => x.id)).toEqual(['verified']);
  });
  it('does not mark unanswered or unverified answers incorrect', () => {
    expect(scoreAttempt([q('a'), q('b', false)], {})).toMatchObject({ correct: 0, incorrect: 0, pending: 2 });
    expect(scoreAttempt([q('unverified', false)], { unverified: ['B'] })).toMatchObject({ correct: 0, incorrect: 0, pending: 1 });
  });
  it('can score proposed answers only in explicitly labeled mock practice', () => {
    expect(scoreAttempt([{ ...q('mock', false), verificationStatus: 'answer_proposed' }], { mock: ['A'] }, { allowProposed: true })).toMatchObject({ correct: 1, incorrect: 0, pending: 0 });
  });
  it('keeps the correct option ID stable when choices are shuffled', () => {
    const shuffled = shuffleOptionsWithoutLosingCorrectIds(q('x'), () => 0);
    expect(shuffled.correctAnswers).toEqual(['A']);
    expect(shuffled.options.map(x => x.id)).toContain('A');
  });
  it('uses exact set matching for multiple choice by default', () => {
    expect(gradeMultipleChoice(['A', 'B'], ['A'])).toBe(false);
    expect(gradeMultipleChoice(['A'], ['A', 'B'])).toBe(false);
    expect(gradeMultipleChoice(['B', 'A'], ['A', 'B'])).toBe(true);
  });
  it('scores answered questions and leaves the rest pending in a partial submission', () => {
    expect(scoreAttempt([q('one'),q('two'),q('three')],{one:['A'],two:['B']})).toMatchObject({correct:1,incorrect:1,pending:1,total:3,score:50});
  });
  it('drops duplicate IDs when loading an imported bank', () => {
    expect(loadQuestions([q('same'), q('same')])).toHaveLength(1);
  });
  it('rejects malformed imports instead of saving unsafe question shapes', () => {
    expect(() => parseQuestionBank([{ id: 'broken', stem: '<script>' }])).toThrow(/question/i);
  });
  it('accepts essay questions with no options and keeps their free-text answers pending manual review', () => {
    const essay = { ...q('essay', false), type: 'essay' as const, options: [], correctAnswers: null };
    expect(parseQuestionBank([essay])).toEqual([essay]);
    expect(scoreAttempt([essay], { essay: ['A complete written response'] })).toMatchObject({ correct: 0, incorrect: 0, pending: 1 });
  });
  it('round trips a question bank through CSV while preserving commas and quotes', () => {
    const question = { ...q('csv'), stem: 'What, if "quoted"?', topic: 'RAG', sourceFiles: ['slide.md'], evidenceQuote: 'source quote' };
    const csv = questionBankToCsv([question]);
    const row = parseCsv(csv)[0];
    expect(row.stem).toBe(question.stem);
    expect(parseQuestionBank([{
      ...row, options: JSON.parse(row.options), correctAnswers: JSON.parse(row.correctAnswers),
      sourceFiles: JSON.parse(row.sourceFiles), sourcePages: JSON.parse(row.sourcePages), evidenceQuote: row.evidenceQuote,
      day: null, difficulty: 'easy', verificationStatus: 'expert_verified',
    }])[0].stem).toBe(question.stem);
  });
  it('loads the ten mock questions and the top-p example has answer C (A+B+C)', () => {
    expect(seedQuestions).toHaveLength(10);
    expect(seedQuestions.find(question => question.id === 'mcq-005')?.correctAnswers).toEqual(['C']);
  });
  it('migrates legacy attempts into the current storage key', () => {
    const values = new Map([['k4-attempts', JSON.stringify([{ id: 'old' }])]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as unknown as Storage;
    expect(JSON.parse(loadAttemptData(storage))[0].id).toBe('old');
    expect(values.has('k4-attempts-v1')).toBe(true);
  });
  it('persists attempts and calculates topic accuracy from real submitted answers', () => {
    const values = new Map<string,string>();
    const storage = { getItem: (key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value)} } as unknown as Storage;
    const attempt={id:'a',startedAt:'',submittedAt:'now',questionIds:['q'],answers:{q:['A']},score:100,total:1,mode:'practice' as const};
    saveAttempt(attempt,storage);
    expect(JSON.parse(values.get('k4-attempts-v1')||'[]')[0].id).toBe('a');
    expect(calculateTopicAccuracy([q('q')],[attempt]).RAG.accuracy).toBe(100);
  });
});
