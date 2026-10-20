import type { ExamSet, Question } from './types';

export interface ExamData {
  questions: Question[];
  examSets: ExamSet[];
}

export async function loadExamData(): Promise<ExamData> {
  const response = await fetch('/dataset/05_data/exam_bank_seed.json');
  if (!response.ok) throw new Error('Không tải được ngân hàng đề cục bộ.');
  return await response.json() as ExamData;
}
