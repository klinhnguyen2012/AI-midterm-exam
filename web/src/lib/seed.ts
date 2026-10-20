import raw from '../data/quiz_seed_mock_01.json';
import type { Question } from './types';

type SeedRow = { id: string; question: string; type: Question['type']; options: Question['options']; correct_option_ids: string[] | null; explanation: string; topic: string; difficulty: Question['difficulty'] };
const seedData = raw as unknown as { questions: SeedRow[] };
export const seedQuestions: Question[] = seedData.questions.map(question => ({
  id: question.id, stem: question.question, type: question.type, options: question.options,
  correctAnswers: question.correct_option_ids ?? null, explanation: question.explanation, topic: question.topic,
  day: null, difficulty: question.difficulty, sourceFiles: [], sourcePages: [],
  evidenceQuote: '', verificationStatus: 'answer_proposed',
  reviewerNotes: 'Câu mock do trợ lý soạn, đã rà soát khái niệm; không phải đề thật và chưa được chuyên gia xác minh.',
  createdAt: '', updatedAt: '', commonTraps: '', conceptToReview: '',
}));
