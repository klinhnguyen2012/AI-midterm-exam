import type { ExamSet, Question } from './types';

export interface ExamBuildOptions {
  id: string;
  title: string;
  total: number;
  mcqCount: number;
  essayCount: number;
  sourceSets?: string[];
}

export function normalizeQuestionText(text: string): string {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd').replaceAll('Đ', 'd')
    .toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function overlapRatio(first: ExamSet, second: ExamSet): number {
  const firstIds = new Set(first.questionIds);
  const shared = new Set(second.questionIds.filter(id => firstIds.has(id)));
  const denominator = Math.min(first.questionIds.length, second.questionIds.length);
  return denominator ? shared.size / denominator : 0;
}

export function buildExamSet(
  questions: Question[],
  options: ExamBuildOptions,
  existingSets: ExamSet[] = [],
  limits: { maxOverlap?: number; random?: () => number } = {},
): ExamSet {
  const { id, title, total, mcqCount, essayCount } = options;
  if (mcqCount + essayCount !== total) throw new Error('Tổng MCQ và tự luận phải bằng tổng số câu.');

  const seenStems = new Set<string>();
  const unique = questions.filter(question => {
    const stem = normalizeQuestionText(question.stem);
    if (!stem || seenStems.has(stem)) return false;
    seenStems.add(stem);
    return true;
  });
  const shuffle = <T,>(items: T[]) => [...items].sort(() => (limits.random ?? Math.random)() - 0.5);
  const mcq = shuffle(unique.filter(question => question.type !== 'essay' && question.options.length > 0));
  const essay = shuffle(unique.filter(question => question.type === 'essay'));
  if (mcq.length < mcqCount || essay.length < essayCount) {
    throw new Error(`Không đủ câu khác nhau: cần ${mcqCount} MCQ và ${essayCount} tự luận, hiện có ${mcq.length} MCQ và ${essay.length} tự luận.`);
  }
  const selected = [...mcq.slice(0, mcqCount), ...essay.slice(0, essayCount)];
  const result: ExamSet = {
    id, title, questionIds: selected.map(question => question.id), total,
    mcqCount, essayCount, sourceSets: options.sourceSets ?? [], createdAt: new Date().toISOString(),
  };
  const maxOverlap = limits.maxOverlap ?? 0.2;
  const conflict = existingSets.find(set => overlapRatio(result, set) > maxOverlap);
  if (conflict) throw new Error(`Đề trùng quá nhiều với ${conflict.title}; hãy thêm câu hỏi khác hoặc tăng giới hạn trùng.`);
  return result;
}
