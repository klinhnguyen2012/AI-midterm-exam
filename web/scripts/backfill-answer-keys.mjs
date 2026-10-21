import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const repoRoot = resolve(webRoot, '..');
const envPath = resolve(repoRoot, '.env');
const bankPath = resolve(webRoot, 'src/data/exam_bank_seed.json');
const overlayPath = resolve(webRoot, 'content/answer-key-backfill.json');
const dryRun = process.argv.includes('--dry-run');

function readEnv() {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(readFileSync(envPath, 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
}

function outputText(result) {
  return result.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text?.trim() ?? '';
}

const format = {
  type: 'json_schema',
  name: 'proposed_question_answer_keys',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['answers'],
    properties: {
      answers: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['id', 'correctAnswers', 'explanation', 'confidence'],
        properties: {
          id: { type: 'string' },
          correctAnswers: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      } },
    },
  },
};

function readOverlay() {
  if (!existsSync(overlayPath)) return { model: '', generatedAt: '', answers: [] };
  const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'));
  if (!Array.isArray(overlay.answers)) throw new Error('Overlay hiện có không đúng định dạng; chưa gửi yêu cầu hoặc ghi tệp.');
  return overlay;
}

function validateBatch(responseAnswers, questions) {
  if (!Array.isArray(responseAnswers)) throw new Error('LLM không trả về danh sách đáp án hợp lệ.');
  const questionsById = new Map(questions.map(question => [question.id, question]));
  const seen = new Set();
  const validated = [];
  for (const answer of responseAnswers) {
    const question = questionsById.get(answer.id);
    if (!question || seen.has(answer.id)) throw new Error(`LLM trả ID câu hỏi không hợp lệ hoặc bị lặp: ${answer.id ?? '(trống)'}.`);
    seen.add(answer.id);
    const options = new Set(question.options.map(option => option.id));
    if (options.size !== question.options.length) throw new Error(`Các lựa chọn của ${answer.id} có ID bị lặp.`);
    if (!Array.isArray(answer.correctAnswers) || answer.correctAnswers.length === 0 || new Set(answer.correctAnswers).size !== answer.correctAnswers.length || answer.correctAnswers.some(id => !options.has(id))) {
      throw new Error(`Đáp án cho ${answer.id} không khớp các lựa chọn.`);
    }
    if ((question.type === 'single_choice' || question.type === 'true_false') && answer.correctAnswers.length !== 1) {
      throw new Error(`Câu ${answer.id} cần chính xác một lựa chọn đúng.`);
    }
    if (question.type === 'multiple_choice' && answer.correctAnswers.length < 1) throw new Error(`Câu ${answer.id} cần ít nhất một lựa chọn đúng.`);
    if (typeof answer.explanation !== 'string' || !answer.explanation.trim() || !Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
      throw new Error(`Giải thích hoặc độ tin cậy cho ${answer.id} không hợp lệ.`);
    }
    const selected = new Set(answer.correctAnswers);
    validated.push({
      id: answer.id,
      correctAnswers: question.options.map(option => option.id).filter(id => selected.has(id)),
      explanation: answer.explanation.trim(),
      confidence: answer.confidence,
    });
  }
  if (seen.size !== questions.length || questions.some(question => !seen.has(question.id))) {
    throw new Error('LLM thiếu câu trả lời cho một hoặc nhiều câu trong lô; overlay chưa được ghi.');
  }
  return validated;
}

async function requestBatch(questions, model, apiKey) {
  const prompt = {
    instructions: 'Bạn là chuyên gia ra đề và giảng dạy AI cho người mới học. Với từng câu trắc nghiệm, suy luận đáp án đúng từ câu hỏi, tất cả lựa chọn, giải thích hiện có và bằng chứng học liệu. Trả về mã ID gốc của lựa chọn, không tự đổi nhãn. Với câu multiple_choice, chọn đầy đủ và chỉ các lựa chọn đúng. Ưu tiên bằng chứng được cung cấp; nếu dữ kiện chưa đủ, nêu rõ sự không chắc chắn trong giải thích và đặt confidence thấp. Viết giải thích ngắn, bằng tiếng Việt dễ hiểu cho người không chuyên. Không khẳng định đáp án là chính thức hoặc đã được chuyên gia xác minh.',
    questions: questions.map(question => ({
      id: question.id,
      type: question.type,
      stem: question.stem,
      options: question.options.map(option => ({ id: option.id, text: option.text })),
      topic: question.topic,
      source: question.sourceLabel || '',
      sourceFiles: question.sourceFiles || [],
      sourcePages: question.sourcePages || [],
      evidenceQuote: question.evidenceQuote || '',
      existingExplanation: question.explanation || '',
    })),
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 12000,
      input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(prompt) }] }],
      text: { format },
    }),
  });
  const body = await response.text();
  let result;
  try { result = JSON.parse(body); }
  catch { throw new Error(`OpenAI API trả về nội dung không đọc được (HTTP ${response.status}); overlay chưa được ghi.`); }
  if (!response.ok) throw new Error(`OpenAI API trả HTTP ${response.status}: ${result.error?.message ?? 'lỗi không rõ'}; overlay chưa được ghi.`);
  const text = outputText(result);
  if (!text) throw new Error('OpenAI API không trả nội dung đáp án; overlay chưa được ghi.');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('LLM trả nội dung không đúng JSON; overlay chưa được ghi.'); }
  return validateBatch(parsed.answers, questions);
}

async function run() {
  if (!existsSync(bankPath)) throw new Error('Chưa có ngân hàng đã chuẩn bị. Chạy npm run prepare:data trước.');
  const bank = JSON.parse(readFileSync(bankPath, 'utf8'));
  const overlay = readOverlay();
  const savedIds = new Set(overlay.answers.map(answer => answer.id));
  const targets = bank.questions.filter(question => question.type !== 'essay' && !question.correctAnswers?.length && !savedIds.has(question.id));
  if (dryRun) {
    console.log(`Số câu trắc nghiệm thiếu đáp án sẽ được gửi một lần: ${targets.length}`);
    for (const question of targets) console.log(question.id);
    return;
  }
  if (targets.length === 0) {
    console.log('Không còn câu trắc nghiệm thiếu đáp án để backfill.');
    return;
  }

  const env = readEnv();
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL;
  if (!apiKey || apiKey === 'your_openai_api_key_here') throw new Error('Thiếu OPENAI_API_KEY trong root .env hoặc môi trường. Không có yêu cầu nào được gửi.');
  if (!model || model === 'your_openai_model_id_here') throw new Error('Thiếu OPENAI_MODEL trong root .env hoặc môi trường. Không có yêu cầu nào được gửi.');

  console.log(`Đang gửi một yêu cầu suy luận cho ${targets.length} câu trắc nghiệm.`);
  const generated = await requestBatch(targets, model, apiKey);

  const currentBank = JSON.parse(readFileSync(bankPath, 'utf8'));
  const currentById = new Map(currentBank.questions.map(question => [question.id, question]));
  const currentOverlay = readOverlay();
  const currentOverlayIds = new Set(currentOverlay.answers.map(answer => answer.id));
  for (const answer of generated) {
    const question = currentById.get(answer.id);
    if (!question || question.type === 'essay' || question.correctAnswers?.length || currentOverlayIds.has(answer.id)) {
      throw new Error(`Câu ${answer.id} đã thay đổi trong lúc chạy; overlay chưa được ghi.`);
    }
  }
  const finalOverlay = {
    model,
    generatedAt: new Date().toISOString(),
    answers: [...currentOverlay.answers, ...generated],
  };
  const temporaryPath = `${overlayPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(finalOverlay, null, 2)}\n`, { flag: 'wx' });
  renameSync(temporaryPath, overlayPath);
  console.log(`Đã lưu ${generated.length} đáp án đề xuất trong content/answer-key-backfill.json. Không gọi LLM khi tải trang.`);
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : 'Không thể hoàn tất backfill.');
  process.exitCode = 1;
});
