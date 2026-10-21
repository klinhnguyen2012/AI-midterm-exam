import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

type CoachAction = 'hint' | 'explain';
type CoachQuestion = {
  stem: string;
  options: { id: string; text: string }[];
  topic: string;
  evidenceQuote: string;
  sourceLabel?: string;
  sourceFiles: string[];
  sourcePages: number[];
};
type CoachRequest = {
  action: CoachAction;
  question: CoachQuestion;
  previousHints?: string[];
  answer?: { selectedTexts: string[]; answerText: string; correctAnswerText: string; explanation: string };
};

const MAX_BODY_BYTES = 24_000;
const MAX_TEXT_LENGTH = 12_000;

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY_BYTES) throw new Error('request_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max = MAX_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function parseRequest(value: unknown): CoachRequest | null {
  if (!isRecord(value) || (value.action !== 'hint' && value.action !== 'explain') || !isRecord(value.question)) return null;
  const q = value.question;
  if (typeof q.stem !== 'string' || !Array.isArray(q.options)) return null;
  const question: CoachQuestion = {
    stem: cleanText(q.stem),
    options: q.options.slice(0, 8).flatMap(option => isRecord(option) && typeof option.id === 'string' && typeof option.text === 'string'
      ? [{ id: cleanText(option.id, 20), text: cleanText(option.text, 1000) }]
      : []),
    topic: cleanText(q.topic, 300),
    evidenceQuote: cleanText(q.evidenceQuote, 4000),
    sourceLabel: cleanText(q.sourceLabel, 500),
    sourceFiles: Array.isArray(q.sourceFiles) ? q.sourceFiles.slice(0, 4).map(file => cleanText(file, 300)) : [],
    sourcePages: Array.isArray(q.sourcePages) ? q.sourcePages.slice(0, 8).filter(page => typeof page === 'number' && Number.isFinite(page)) : [],
  };
  const request: CoachRequest = { action: value.action, question };
  if (request.action === 'hint') {
    request.previousHints = Array.isArray(value.previousHints) ? value.previousHints.slice(-4).map(hint => cleanText(hint, 1000)) : [];
  }
  if (request.action === 'explain' && isRecord(value.answer)) {
    request.answer = {
      selectedTexts: Array.isArray(value.answer.selectedTexts) ? value.answer.selectedTexts.slice(0, 8).map(text => cleanText(text, 1000)) : [],
      answerText: cleanText(value.answer.answerText, 4000),
      correctAnswerText: cleanText(value.answer.correctAnswerText, 4000),
      explanation: cleanText(value.answer.explanation, 6000),
    };
  }
  if (!question.stem || question.stem.length > MAX_TEXT_LENGTH) return null;
  if (request.action === 'explain' && !request.answer) return null;
  return request;
}

function makePrompt(request: CoachRequest): string {
  const { question } = request;
  const source = [question.sourceLabel, question.sourceFiles.join(', '), question.sourcePages.length ? `trang ${question.sourcePages.join(', ')}` : ''].filter(Boolean).join(' · ');
  const evidence = question.evidenceQuote ? `Trích dẫn nguồn học:\n${question.evidenceQuote}` : 'Không có trích dẫn nguồn trong dữ liệu.';
  const context = `Chủ đề: ${question.topic || 'không rõ'}\nCâu hỏi: ${question.stem}\n${question.options.length ? `Các lựa chọn:\n${question.options.map(item => `${item.id}. ${item.text}`).join('\n')}\n` : ''}${source ? `Nguồn: ${source}\n` : ''}${evidence}`;
  if (request.action === 'hint') {
    return `Bạn là mascot gia sư thân thiện cho người mới học AI, nói tiếng Việt tự nhiên, ngắn gọn. Đưa đúng MỘT gợi ý tiếp theo, giúp người học tự suy luận; không nêu đáp án, không nói phương án đúng, không giải hộ. Nếu đã có gợi ý trước, đưa thêm một bước mới nhưng vẫn chưa bật mí. Nếu nguồn không đủ, hãy nói rõ và chỉ gợi ý cách suy nghĩ từ dữ kiện câu hỏi.\n\n${context}\nGợi ý trước: ${(request.previousHints ?? []).join(' | ') || '(chưa có)'}`;
  }
  const answer = request.answer!;
  return `Bạn là gia sư giải thích AI cho người không chuyên, nói tiếng Việt tự nhiên và súc tích. Trả lời tối đa 100 từ. Mở đầu bằng nhận xét ngắn về câu trả lời; giải thích ý chính bằng tối đa 3 ý ngắn; chỉ thêm một ví dụ đời thường nếu thực sự giúp hiểu bài. Không lặp lại đề bài hay kết luận dài dòng. Với tự luận, đây là góp ý học tập chứ không tuyên bố điểm số khách quan. Chỉ khẳng định điều được dữ liệu hoặc trích dẫn hỗ trợ; nếu thiếu bằng chứng thì nói rõ. Không bịa nội dung slide. Có thể dùng Markdown cơ bản (**đậm**, danh sách ngắn).\n\n${context}\nNgười học chọn: ${answer.selectedTexts.join(' | ') || '(không chọn phương án)'}\nCâu trả lời tự luận: ${answer.answerText || '(không có)'}\nĐáp án/gợi ý hiện có: ${answer.correctAnswerText || '(chưa có đáp án được ghi nhận)'}\nGiải thích hiện có: ${answer.explanation || '(chưa có)'}`;
}

export function quizCoachPlugin(env: Record<string, string>): Plugin {
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL || '';
  return {
    name: 'local-quiz-coach',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== '/api/quiz-coach') return next();
        if (req.method !== 'POST') return send(res, 405, { error: 'Phương thức không được hỗ trợ.' });
        if (!apiKey || apiKey === 'your_openai_api_key_here' || !model || model === 'your_openai_model_id_here') {
          return send(res, 503, { error: 'Chưa cấu hình OpenAI API key hoặc model trong .env.' });
        }
        try {
          const request = parseRequest(await readBody(req));
          if (!request) return send(res, 400, { error: 'Dữ liệu câu hỏi không hợp lệ.' });
          const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, store: false, max_output_tokens: request.action === 'hint' ? 220 : 900, input: makePrompt(request) }),
          });
          const result = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[]; error?: { message?: string } };
          if (!response.ok) {
            const status = response.status === 429 ? 429 : 502;
            return send(res, status, { error: response.status === 429 ? 'Đang có nhiều yêu cầu. Chờ chút rồi thử lại nhé.' : 'Mascot chưa lấy được phản hồi từ AI. Thử lại sau nhé.' });
          }
          const text = result.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text?.trim();
          if (!text) return send(res, 502, { error: 'AI chưa trả lời được lần này. Thử lại nhé.' });
          return send(res, 200, { text: text.slice(0, 6000) });
        } catch (error) {
          if (error instanceof Error && error.message === 'request_too_large') return send(res, 413, { error: 'Nội dung câu hỏi quá dài để gửi mascot.' });
          if (error instanceof SyntaxError) return send(res, 400, { error: 'Yêu cầu không đúng định dạng.' });
          return send(res, 502, { error: 'Không kết nối được với AI. Kiểm tra mạng rồi thử lại nhé.' });
        }
      });
    },
  };
}
