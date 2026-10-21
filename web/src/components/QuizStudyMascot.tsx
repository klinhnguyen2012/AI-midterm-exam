import { useEffect, useState } from 'react';
import { Bot, Lightbulb, LoaderCircle, MessageCircleQuestion, Sparkles, X } from 'lucide-react';
import type { Question } from '../lib/types';
import { requestQuizCoach } from '../lib/quizCoach';

export function QuizStudyMascot({ question, selectedTexts, answerText }: { question: Question; selectedTexts: string[]; answerText: string }) {
  const [open, setOpen] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<'hint' | 'explain'>('hint');
  const [busy, setBusy] = useState<'hint' | 'explain' | null>(null);
  const canExplain = selectedTexts.length > 0 || answerText.trim().length > 0;

  useEffect(() => {
    setHints([]);
    setExplanation('');
    setError('');
    setRetryAction('hint');
  }, [question.id]);

  async function ask(action: 'hint' | 'explain') {
    setBusy(action);
    setError('');
    setRetryAction(action);
    try {
      const context = {
        stem: question.stem,
        options: question.options.map(({ id, text }) => ({ id, text })),
        topic: question.topic,
        evidenceQuote: question.evidenceQuote,
        sourceLabel: question.sourceLabel,
        sourceFiles: question.sourceFiles,
        sourcePages: question.sourcePages,
      };
      if (action === 'hint') {
        const nextHint = await requestQuizCoach({ action, question: context, previousHints: hints });
        setHints(previous => [...previous, nextHint]);
        setRetryAction('hint');
      } else {
        const selected = question.options.filter(option => selectedTexts.includes(option.id)).map(option => `${option.id}. ${option.text}`);
        const correctAnswerText = question.correctAnswers?.length
          ? question.options.filter(option => question.correctAnswers?.includes(option.id)).map(option => `${option.id}. ${option.text}`).join('\n')
          : 'Chưa có đáp án được xác minh; hãy trình bày như một lời giải tham khảo, không kết luận đúng sai tuyệt đối.';
        const response = await requestQuizCoach({
          action,
          question: context,
          answer: { selectedTexts: selected, answerText, correctAnswerText, explanation: question.explanation },
        });
        setExplanation(response);
        setRetryAction('explain');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mascot chưa trả lời được. Thử lại nhé.');
    } finally {
      setBusy(null);
    }
  }

  return <div className="quiz-mascot">
    {open && <section className="quiz-mascot-panel" aria-label="Trợ lý học tập" aria-live="polite">
      <header className="quiz-mascot-header"><span className="mascot-avatar"><Bot size={20}/></span><div><strong>Trợ lý học tập</strong><small>Đang học cùng bạn</small></div><button className="icon-button" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}><X size={18}/></button></header>
      <div className="quiz-mascot-content">
        {!hints.length && !explanation && !error && <p className="mascot-welcome">Bạn muốn một gợi ý hay lời giải dễ hiểu cho câu này?</p>}
        {hints.map((hint, index) => <article className="mascot-message hint-message" key={`${question.id}-${index}`}><small>GỢI Ý {index + 1}</small><p>{hint}</p></article>)}
        {explanation && <article className="mascot-message explanation-message"><small>GIẢI THÍCH DỄ HIỂU</small><p>{explanation}</p></article>}
        {error && <div className="mascot-error" role="alert"><span>{error}</span><button className="btn-ghost" disabled={busy !== null} onClick={() => ask(retryAction)}>Thử lại</button></div>}
        {busy && <div className="mascot-loading"><LoaderCircle size={16} className="mascot-spinner"/>Đang suy nghĩ…</div>}
      </div>
      <footer className="quiz-mascot-actions">
        <button className="btn-ghost" disabled={busy !== null} onClick={() => ask('hint')}><Lightbulb size={16}/> Gợi ý</button>
        <button className="btn-primary" disabled={!canExplain || busy !== null} title={!canExplain ? 'Trả lời câu hỏi trước để xem giải thích' : undefined} onClick={() => ask('explain')}><Sparkles size={16}/> Giải thích dễ hiểu</button>
      </footer>
      {!canExplain && <small className="mascot-footnote">Trả lời câu hỏi trước để mở phần giải thích.</small>}
    </section>}
    <button className={`quiz-mascot-launcher ${open ? 'is-open' : ''}`} aria-label={open ? 'Đóng trợ lý học tập' : 'Mở trợ lý học tập'} aria-expanded={open} onClick={() => setOpen(value => !value)}><span className="mascot-face"><i/><i/></span><span className="mascot-launcher-label">AI</span><MessageCircleQuestion className="mascot-question-mark" size={14}/></button>
  </div>;
}
