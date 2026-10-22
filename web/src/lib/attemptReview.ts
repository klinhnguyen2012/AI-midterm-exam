import type { Attempt, AttemptReviewItem, AttemptReviewReport, EssayGrade, Question } from './types';
import { gradeMultipleChoice } from './quiz';

const hasScorableKey = (question: Question) => Boolean(question.correctAnswers?.length)
  && ['expert_verified', 'answer_proposed'].includes(question.verificationStatus);

function answerText(question: Question, answer: string[] | undefined): string {
  if (question.type === 'essay') return answer?.[0]?.trim() || 'Chưa trả lời';
  return answer?.length
    ? question.options.filter(option => answer.includes(option.id)).map(option => `${option.id}. ${option.text}`).join('\n')
    : 'Chưa trả lời';
}

function referenceText(question: Question): string {
  if (question.type === 'essay') return question.explanation || 'Chưa có đáp án tham khảo.';
  if (!question.correctAnswers?.length) return 'Chưa có đáp án được xác minh.';
  return question.options.filter(option => question.correctAnswers?.includes(option.id)).map(option => `${option.id}. ${option.text}`).join('\n');
}

export function createAttemptReview(
  questions: Question[], answers: Record<string, string[]>, essayGrades: Record<string, EssayGrade>,
): AttemptReviewReport {
  const items: AttemptReviewItem[] = [];
  for (const [questionIndex, question] of questions.entries()) {
    const given = answers[question.id];
    const hasAnswer = Boolean(given?.some(value => value.trim()));
    let status: AttemptReviewItem['status'] | null = null;
    let diagnosis = '';
    if (question.type === 'essay') {
      const grade = essayGrades[question.id];
      if (!hasAnswer) {
        status = 'unanswered';
        diagnosis = 'Bạn chưa viết câu trả lời; hãy xem lại yêu cầu và thử tự trình bày các ý chính.';
      } else if (!grade) {
        status = 'ungraded';
        diagnosis = 'Câu trả lời đang chờ chấm nên chưa thể xác định phần nào cần cải thiện.';
      } else if (grade.score < grade.maxScore) {
        status = 'partial';
        diagnosis = grade.feedback || `Bạn đạt ${grade.score}/${grade.maxScore} điểm; còn thiếu một số ý theo rubric.`;
      }
    } else if (!hasScorableKey(question)) {
      status = 'unverified';
      diagnosis = 'Câu này chưa có đáp án đủ tin cậy để kết luận đúng hay sai.';
    } else if (!hasAnswer) {
      status = 'unanswered';
      diagnosis = 'Bạn chưa chọn đáp án; hãy ôn lại khái niệm cốt lõi của câu này.';
    } else if (!gradeMultipleChoice(given ?? [], question.correctAnswers ?? [])) {
      status = 'wrong';
      diagnosis = question.commonTraps || 'Lựa chọn của bạn chưa khớp với đáp án. Hãy so sánh điều kiện trong đề với đáp án tham khảo.';
    }
    if (!status) continue;
    const knowledgeToReview = [question.conceptToReview, question.topic].filter((value): value is string => Boolean(value?.trim()));
    items.push({
      questionId: question.id, questionNumber: questionIndex + 1, topic: question.topic || 'Chưa phân loại', status, diagnosis,
      knowledgeToReview: [...new Set(knowledgeToReview)],
      practice: question.conceptToReview ? `Ôn lại ${question.conceptToReview} rồi thử giải lại câu này.` : `Ôn chủ đề “${question.topic || 'nội dung câu hỏi'}” và tự giải thích vì sao đáp án tham khảo phù hợp.`,
    });
  }
  const topics = new Map<string, AttemptReviewItem[]>();
  for (const item of items) {
    if (item.status === 'unverified' || item.status === 'ungraded') continue;
    topics.set(item.topic, [...(topics.get(item.topic) ?? []), item]);
  }
  const priorityTopics = [...topics.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([topic, group]) => ({
      topic,
      reason: `${group.length} câu cần xem lại (${group.filter(item => item.status === 'wrong').length} sai, ${group.filter(item => item.status === 'unanswered').length} bỏ trống, ${group.filter(item => item.status === 'partial').length} tự luận chưa đủ điểm).`,
      practice: group.find(item => item.practice)?.practice ?? `Luyện thêm các câu thuộc chủ đề “${topic}”.`,
    }));
  const needsWork = items.filter(item => !['unverified', 'ungraded'].includes(item.status)).length;
  const ungradedCount = items.filter(item => item.status === 'ungraded').length;
  const summary = needsWork
    ? `Có ${items.filter(item => item.status === 'wrong').length} câu sai, ${items.filter(item => item.status === 'unanswered').length} câu bỏ trống và ${items.filter(item => item.status === 'partial').length} câu tự luận cần cải thiện.${ungradedCount ? ` ${ungradedCount} câu tự luận đang chờ chấm.` : ''}`
    : ungradedCount ? `${ungradedCount} câu tự luận đang chờ chấm; các câu chưa có đáp án xác minh được ghi chú riêng.`
      : items.length ? 'Một số câu chưa thể đánh giá vì thiếu đáp án xác minh.' : 'Bạn đã hoàn thành tốt các câu có thể chấm trong phiên này.';
  return { generatedAt: new Date().toISOString(), source: 'fallback', summary, priorityTopics, items };
}

export function createAttemptWithReview(
  attempt: Attempt, questions: Question[], answers: Record<string, string[]>, essayGrades: Record<string, EssayGrade> = {},
): Attempt {
  return { ...attempt, answers, reviewReport: createAttemptReview(questions, answers, essayGrades) };
}

export function getAttemptReviewContent(
  questionId: string, questions: Question[], answers: Record<string, string[]>,
): { question: string; learnerAnswer: string; referenceAnswer: string; explanation: string } {
  const question = questions.find(item => item.id === questionId);
  if (!question) return { question: 'Câu hỏi không còn trong ngân hàng hiện tại.', learnerAnswer: '—', referenceAnswer: '—', explanation: '' };
  return {
    question: question.stem,
    learnerAnswer: answerText(question, answers[questionId]),
    referenceAnswer: referenceText(question),
    explanation: question.explanation,
  };
}

export function mergeAttemptReview(
  fallback: AttemptReviewReport,
  generated: { summary: string; priorityTopics: AttemptReviewReport['priorityTopics']; insights: { questionId: string; diagnosis: string; knowledgeToReview: string[]; practice: string }[] },
): AttemptReviewReport {
  const byId = new Map(generated.insights.map(insight => [insight.questionId, insight]));
  return {
    ...fallback, source: 'ai', summary: generated.summary.trim() || fallback.summary,
    priorityTopics: generated.priorityTopics.length ? generated.priorityTopics : fallback.priorityTopics,
    items: fallback.items.map(item => {
      const insight = byId.get(item.questionId);
      if (!insight) return item;
      return { ...item, diagnosis: insight.diagnosis || item.diagnosis,
        knowledgeToReview: insight.knowledgeToReview.length ? insight.knowledgeToReview : item.knowledgeToReview,
        practice: insight.practice || item.practice };
    }),
  };
}
