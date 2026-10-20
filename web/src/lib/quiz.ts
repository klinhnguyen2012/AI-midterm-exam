import type { Attempt, Question } from './types';

export function selectQuestions(questions: Question[], count: number, filters: { topic?: string; day?: number | 'all'; difficulty?: string; scoredOnly?: boolean } = {}): Question[] {
  const filtered = questions.filter(q => (!filters.scoredOnly || (q.correctAnswers !== null && q.verificationStatus === 'expert_verified')) && (!filters.topic || filters.topic === 'all' || q.topic === filters.topic) && (filters.day === undefined || filters.day === 'all' || q.day === filters.day) && (!filters.difficulty || filters.difficulty === 'all' || q.difficulty === filters.difficulty));
  return [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count));
}

export function shuffleOptionsWithoutLosingCorrectIds(question: Question, random = Math.random): Question {
  const options = [...question.options];
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { ...question, options };
}

export function gradeMultipleChoice(selected: string[], correct: string[]): boolean {
  return selected.length === correct.length && new Set(selected).size === new Set(correct).size && correct.every(id => selected.includes(id));
}

export function scoreAttempt(questions: Question[], answers: Record<string, string[]>, options: { allowProposed?: boolean } = {}): { correct: number; incorrect: number; pending: number; total: number; score: number } {
  let correct = 0, incorrect = 0, pending = 0;
  for (const question of questions) {
    const given = answers[question.id];
    const eligible = question.verificationStatus === 'expert_verified' || (options.allowProposed && question.verificationStatus === 'answer_proposed');
    if (!question.correctAnswers || !eligible || !given?.length) { pending++; continue; }
    if (gradeMultipleChoice(given, question.correctAnswers)) correct++; else incorrect++;
  }
  const scored = correct + incorrect;
  return { correct, incorrect, pending, total: questions.length, score: scored ? Math.round(correct / scored * 100) : 0 };
}

export function saveAttempt(attempt: Attempt, storage: Storage = localStorage): void {
  const key = 'k4-attempts-v1';
  const existing = JSON.parse(storage.getItem(key) || '[]') as Attempt[];
  storage.setItem(key, JSON.stringify([attempt, ...existing.filter(item => item.id !== attempt.id)]));
}

export function loadAttemptData(storage: Storage = localStorage): string {
  const current = storage.getItem('k4-attempts-v1');
  if (current) return current;
  const legacy = storage.getItem('k4-attempts') || '[]';
  storage.setItem('k4-attempts-v1', legacy);
  return legacy;
}

export function loadQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter(question => {
    if (!question.id || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

const statuses = new Set(['untranscribed', 'transcribed', 'answer_proposed', 'expert_verified']);
const types = new Set(['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'ordering', 'numeric', 'essay']);
export function parseQuestionBank(input: unknown): Question[] {
  const rows = Array.isArray(input) ? input : (input && typeof input === 'object' && 'questions' in input && Array.isArray(input.questions) ? input.questions : null);
  if (!rows) throw new Error('Tệp cần chứa mảng questions hợp lệ.');
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw new Error('Mỗi question phải là một object.');
    const q = row as Record<string, unknown>;
    if (typeof q.id !== 'string' || !q.id.trim() || typeof q.stem !== 'string' || !q.stem.trim() || !types.has(String(q.type)) || !Array.isArray(q.options) || !Array.isArray(q.sourceFiles) || !Array.isArray(q.sourcePages) || !statuses.has(String(q.verificationStatus)) || !(q.correctAnswers === null || Array.isArray(q.correctAnswers))) throw new Error('Question thiếu ID, nội dung, loại, lựa chọn, nguồn hoặc trạng thái hợp lệ.');
    if ((q.options as unknown[]).some(option => !option || typeof option !== 'object' || typeof (option as Record<string, unknown>).id !== 'string' || typeof (option as Record<string, unknown>).text !== 'string')) throw new Error('Mỗi question cần options có id và text dạng chuỗi.');
    if (q.correctAnswers !== null && (q.correctAnswers as unknown[]).some(answer => typeof answer !== 'string')) throw new Error('correctAnswers phải là mảng ID hoặc null.');
    const optionIds = new Set((q.options as { id: string }[]).map(option => option.id));
    if (optionIds.size !== (q.options as { id: string }[]).length || (q.correctAnswers as string[] | null)?.some(answer => !optionIds.has(answer))) throw new Error('ID phương án phải duy nhất và đáp án phải tham chiếu phương án có thật.');
    if (q.verificationStatus === 'expert_verified' && (!(q.correctAnswers as string[] | null)?.length || !(q.sourceFiles as unknown[]).length || typeof q.evidenceQuote !== 'string' || !q.evidenceQuote.trim())) throw new Error('Câu chuyên gia xác minh cần đáp án, nguồn và trích dẫn chứng cứ.');
  }
  return loadQuestions(rows as Question[]);
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

export function questionBankToCsv(questions: Question[]): string {
  const fields: (keyof Question)[] = ['id','stem','type','options','correctAnswers','explanation','topic','day','difficulty','sourceFiles','sourcePages','evidenceQuote','verificationStatus','reviewerNotes','commonTraps','conceptToReview','createdAt','updatedAt'];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"','""')}"`;
  return [fields.join(','), ...questions.map(question => fields.map(field => quote(Array.isArray(question[field]) || (question[field] && typeof question[field] === 'object') ? JSON.stringify(question[field]) : question[field])).join(','))].join('\n');
}

export function calculateTopicAccuracy(questions: Question[], attempts: Attempt[]): Record<string, { correct: number; total: number; accuracy: number }> {
  const results: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const attempt of attempts) for (const id of attempt.questionIds) {
    const q = questions.find(item => item.id === id);
    const response = attempt.answers[id];
    if (!q || !q.correctAnswers || !['expert_verified', 'answer_proposed'].includes(q.verificationStatus) || !response?.length) continue;
    results[q.topic] ??= { correct: 0, total: 0, accuracy: 0 };
    results[q.topic].total++;
    if (gradeMultipleChoice(response, q.correctAnswers)) results[q.topic].correct++;
  }
  for (const item of Object.values(results)) item.accuracy = Math.round(item.correct / item.total * 100);
  return results;
}
