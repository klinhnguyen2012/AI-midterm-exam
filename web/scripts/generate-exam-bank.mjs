import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const repoRoot = resolve(webRoot, '..');
const sourceRoot = resolve(repoRoot, 'AI_Thuc_Chien_K4_Midterm');
const envPath = resolve(repoRoot, '.env');
const outputPath = resolve(webRoot, 'content/authored-exam-bank.json');
const checkpointPath = resolve(webRoot, 'content/.authored-exam-bank-progress.json');
const sourceData = resolve(sourceRoot, '05_data/knowledge_chunks.jsonl');

function readEnv() {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(readFileSync(envPath, 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
}

const env = readEnv();
const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL;
if (!apiKey || apiKey === 'your_openai_api_key_here') {
  console.error('OPENAI_API_KEY chưa được điền trong .env. Không có dữ liệu nào được gửi hoặc thay đổi.');
  process.exit(1);
}
if (!model) {
  console.error('Hãy đặt OPENAI_MODEL trong .env thành model bạn muốn dùng.');
  process.exit(1);
}
if (!existsSync(sourceData)) {
  console.error('Không tìm thấy bộ slide đã giải nén tại AI_Thuc_Chien_K4_Midterm/05_data.');
  process.exit(1);
}

const examDays = [
  [1, 4], [5, 8], [9, 12], [13, 15],
  [16, 18], [19, 21], [22, 24], [25, 28],
];
const allDaysMode = process.argv.includes('--all-days');
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.split('=').at(1);
const examStart = Number(argument('start-exam') ?? 3);
const examCount = Number(argument('count') ?? examDays.length);
if (!Number.isInteger(examStart) || examStart < 3 || !Number.isInteger(examCount) || examCount < 1) {
  console.error('Tham số đề không hợp lệ. Dùng --start-exam=N --count=N.');
  process.exit(1);
}
const requestedExamNumbers = Array.from({ length: examCount }, (_, index) => examStart + index);
const allDaysBatches = [[1, 6], [7, 12], [13, 18], [19, 23], [24, 28]];
let allSourcePages;
const batches = Array.from({ length: 5 }, (_, index) => ({ mcq: 12, essay: 5, index }));

function dayQuota(startDay, endDay) {
  const days = Array.from({ length: endDay - startDay + 1 }, (_, index) => startDay + index);
  const quota = Object.fromEntries(days.map(day => [day, 3]));
  let remainder = 17 - days.length * 3;
  if (remainder < 0) {
    for (let index = days.length - 1; remainder < 0; index--) { quota[days[index]]--; remainder++; }
  } else {
    for (let index = 0; remainder > 0; index++, remainder--) quota[days[index]]++;
  }
  return quota;
}

function dayVariants(chunk) {
  const day = Number(chunk.day);
  const variants = [{ ...chunk, day }];
  // The provided file is named Day 23, but its slide title explicitly says Day 26.
  if (day === 23 && /(?:^|\/)Day 23 - AI-Product-Growth\.pdf$/i.test(chunk.source_file ?? '')) {
    variants.push({ ...chunk, day: 26 });
  }
  return variants;
}
const format = {
  type: 'json_schema',
  name: 'source_backed_exam_questions',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['questions'],
    properties: {
      questions: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['type', 'stem', 'options', 'correctIndex', 'answer', 'explanation', 'topic', 'day', 'difficulty', 'sourceFile', 'sourcePage', 'evidenceQuote'],
        properties: {
          type: { type: 'string', enum: ['single_choice', 'essay'] },
          stem: { type: 'string' }, options: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' }, answer: { type: 'string' }, explanation: { type: 'string' },
          topic: { type: 'string' }, day: { type: 'integer' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          sourceFile: { type: 'string' }, sourcePage: { type: 'integer' }, evidenceQuote: { type: 'string' },
        },
      } },
    },
  },
};

function normalize(text) {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isGroundedQuote(sourceText, quote) {
  const sourceWords = normalize(sourceText).split(/\s+/).filter(Boolean);
  const quoteWords = normalize(quote).split(/\s+/).filter(Boolean);
  const compactSource = normalize(sourceText).replaceAll(' ', '');
  const compactQuote = normalize(quote).replaceAll(' ', '');
  if (compactQuote.length >= 15 && compactSource.includes(compactQuote)) return true;
  if (quoteWords.length < 3) return quote.length >= 15 && Math.max(...quoteWords.map(word => word.length), 0) >= 8 && quoteWords.every(word => sourceWords.includes(word));
  const sourceSet = new Set(sourceWords);
  const matched = quoteWords.filter(word => sourceSet.has(word)).length;
  if (matched / quoteWords.length >= 0.6) return true;
  if (compactQuote.length < 30) return false;
  let previous = new Array(compactQuote.length + 1).fill(0);
  let bestDistance = compactQuote.length;
  for (const character of compactSource) {
    const current = new Array(compactQuote.length + 1);
    current[0] = 0;
    for (let index = 1; index <= compactQuote.length; index++) {
      const substitution = previous[index - 1] + (character === compactQuote[index - 1] ? 0 : 1);
      current[index] = Math.min(previous[index] + 1, current[index - 1] + 1, substitution);
    }
    previous = current;
    bestDistance = Math.min(bestDistance, current[compactQuote.length]);
  }
  return 1 - bestDistance / compactQuote.length >= 0.65;
}

function loadAllSourcePages() {
  if (allSourcePages) return allSourcePages;
  const chunks = readFileSync(sourceData, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const grouped = new Map();
  for (const original of chunks) {
    if (!original.text?.trim()) continue;
    for (const chunk of dayVariants(original)) {
      const key = `${chunk.day}\t${chunk.source_file}\t${chunk.page}`;
      if (!grouped.has(key)) grouped.set(key, { day: Number(chunk.day), file: chunk.source_file.replace(/^03_drive_slides\//, '04_extracted_slide_text/').replace(/\.pdf$/i, '.md'), page: Number(chunk.page), texts: [] });
      grouped.get(key).texts.push(chunk.text.trim());
    }
  }
  allSourcePages = [...grouped.values()].map(item => ({ ...item, text: item.texts.join('\n') }));
  return allSourcePages;
}

function findSourcePageForQuote(raw, startDay, endDay) {
  const quote = normalize(raw.evidenceQuote);
  const compactQuote = quote.replaceAll(' ', '');
  return loadAllSourcePages()
    .filter(page => page.day >= startDay && page.day <= endDay && isGroundedQuote(page.text, raw.evidenceQuote))
    .map(page => {
      const pageWords = new Set(normalize(page.text).split(/\s+/));
      const quoteWords = quote.split(/\s+/).filter(Boolean);
      const coverage = quoteWords.filter(word => pageWords.has(word)).length / Math.max(quoteWords.length, 1);
      const exact = compactQuote.length >= 15 && normalize(page.text).replaceAll(' ', '').includes(compactQuote);
      return { page, score: (exact ? 1 : coverage) + (page.file === raw.sourceFile ? 0.01 : 0) };
    })
    .sort((a, b) => b.score - a.score)[0]?.page;
}

function getExamSources(startDay, endDay, batchNumber) {
  const chunks = readFileSync(sourceData, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const relevant = chunks.flatMap(dayVariants).filter(chunk => Number(chunk.day) >= startDay && Number(chunk.day) <= endDay && chunk.text?.trim());
  const grouped = new Map();
  for (const chunk of relevant) {
    const key = `${chunk.day}\t${chunk.source_file}\t${chunk.page}`;
    if (!grouped.has(key)) grouped.set(key, { day: Number(chunk.day), source: chunk.source_file, page: Number(chunk.page), chunks: [] });
    grouped.get(key).chunks.push(chunk);
  }
  const pages = [...grouped.values()].map(item => {
    const text = item.chunks.sort((a, b) => a.chunk_index - b.chunk_index).map(chunk => chunk.text.trim()).join('\n').slice(0, 1800);
    const words = text.split(/\s+/).length;
    const normalized = normalize(text);
    let score = Math.min(text.length, 1400) / 100;
    if (/(example|vi du|case|scenario|trade off|precision|recall|latency|cost|risk|baseline|formula|threshold|pipeline|agent|retrieval|token|context|evaluation)/i.test(normalized)) score += 5;
    if (/(agenda|noi dung bai hoc|muc tieu|instructor|giang vien|vinuni|deliverable|break|giai lao|qr code|thank you)/i.test(normalized)) score -= 8;
    return { day: item.day, file: item.source.replace(/^03_drive_slides\//, '04_extracted_slide_text/').replace(/\.pdf$/i, '.md'), page: item.page, text, words, score };
  }).filter(page => page.words >= 22 && page.score > 0);
  const selected = [];
  for (let day = startDay; day <= endDay; day++) {
    const ranked = pages.filter(page => page.day === day).sort((a, b) => b.score - a.score);
    const offset = ((batchNumber - 1) * 5) % Math.max(ranked.length, 1);
    const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
    selected.push(...rotated.slice(0, 6));
  }
  return selected.sort((a, b) => a.day - b.day || a.file.localeCompare(b.file) || a.page - b.page);
}

function makePrompt(sources, mcqCount, essayCount, priorStems, startDay, endDay, dailyDistribution = null) {
  return `Bạn là giảng viên soạn đề giữa kỳ môn AI Thực Chiến K4. Viết chính xác ${mcqCount} câu trắc nghiệm 4 lựa chọn và ${essayCount} câu tự luận, bằng tiếng Việt, chỉ dựa trên nội dung slide bên dưới. Đây là đề cho người học làm độc lập, không được giả định họ biết câu nào nằm ở slide nào.

TIÊU CHUẨN BẮT BUỘC
- Mỗi câu hỏi phải kiểm tra kiến thức hoặc khả năng áp dụng. Đưa đủ bối cảnh cần thiết ngay trong đề; có thể dùng tình huống sản phẩm, dữ liệu, quyết định kỹ thuật hoặc trade-off thực tế.
- Tuyệt đối không hỏi đoán chủ đề, tên ngày/slide, nguồn, trích đoạn, giảng viên, hay nhận diện “nội dung này thuộc phần nào”. Không dùng câu kiểu “trong bài học, khái niệm nào được đề cập”.
- MCQ có đúng 4 phương án hợp lý, chỉ một đáp án đúng. Phương án nhiễu cùng loại và có vẻ hợp lý; tránh phương án vô nghĩa hoặc lấy nguyên đoạn không liên quan từ bài khác.
- Với mọi câu, cung cấp đáp án. MCQ: answer phải chép nguyên văn phương án đúng; correctIndex là vị trí 0–3. Tự luận: correctIndex=-1, options=[], answer là bài giải mẫu rõ ý, explanation nêu tiêu chí chấm.
- Giải thích vì sao đáp án đúng và, với MCQ, vì sao các lựa chọn cạnh tranh sai trong tình huống.
- Giữ lời giải mẫu tự luận khoảng 80–130 từ; phần giải thích MCQ khoảng 2–4 câu để dành đủ dung lượng cho toàn bộ lô.
- Chỉ chọn sourceFile và sourcePage từ đúng các cặp FILE/PAGE trong danh sách nguồn ngay bên dưới. Chép chính xác đường dẫn FILE và số PAGE trong tiêu đề khối; không dùng số trang in ở chân slide (số này khác số trang PDF). evidenceQuote phải lấy từ nội dung ngay dưới đúng tiêu đề FILE/PAGE đã chọn. Bản OCR đôi khi mất dấu hoặc dính chữ; được phép khôi phục dấu/cách từ nhưng giữ nguyên chuỗi thuật ngữ và thứ tự ý. day là ngày trong tiêu đề DAY tương ứng, trong phạm vi ${startDay}–${endDay}. Không bịa, đổi hoặc đoán file/trang/ngày.
- Stem, đáp án và giải thích phải tự đủ nghĩa; người làm không phải mở slide để hiểu câu hỏi. Giữ thuật ngữ tiếng Anh chuẩn khi hữu ích, nhưng giải nghĩa tiếng Việt.
- Tạo câu hỏi mới, tránh lặp ý với các câu trước hoặc câu đã có trong đề khác.
${dailyDistribution ? `- Phân bổ chính xác câu hỏi theo ngày của slide trong lô này: ${Object.entries(dailyDistribution).map(([day, count]) => `Day ${day}: ${count} câu`).join('; ')}. Mỗi ngày trong danh sách phải có đúng số câu yêu cầu; trường day và sourceFile/sourcePage phải khớp trang nguồn.` : ''}

Không dùng lại các ý/câu hỏi này: ${priorStems.slice(-80).join(' | ') || '(chưa có)'}

NGUỒN SLIDE:
${sources.map(source => `--- DAY ${source.day} · FILE ${source.file} · PAGE ${source.page} ---\n${source.text}`).join('\n\n')}`;
}

async function requestQuestions(sources, mcqCount, essayCount, priorStems, startDay, endDay, dailyDistribution = null) {
  let parseFailure;
  for (let attempt = 0; attempt < 5; attempt++) {
    let response;
    let result;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, store: false, max_output_tokens: 20000,
          input: [{ role: 'user', content: [{ type: 'input_text', text: makePrompt(sources, mcqCount, essayCount, priorStems, startDay, endDay, dailyDistribution) }] }],
          text: { format },
        }),
      });
      const body = await response.text();
      try { result = JSON.parse(body); }
      catch {
        if (attempt === 4) throw new Error(`OpenAI API trả nội dung không phải JSON (HTTP ${response.status}).`);
        console.log(`Phản hồi API không phải JSON (HTTP ${response.status}); thử lại ${attempt + 1}/4.`);
        await new Promise(resolveDelay => setTimeout(resolveDelay, 1500 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        const message = `OpenAI API trả ${response.status}: ${result.error?.message ?? 'lỗi không rõ'}`;
        if (response.status === 429 || response.status >= 500) {
          if (attempt === 4) throw new Error(message);
          console.log(`${message}; thử lại ${attempt + 1}/4.`);
          await new Promise(resolveDelay => setTimeout(resolveDelay, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(message);
      }
    } catch (error) {
      if (/^OpenAI API trả \d+/.test(error.message) || /không phải JSON/.test(error.message)) throw error;
      if (attempt === 4) throw error;
      console.log(`Lỗi kết nối API; thử lại ${attempt + 1}/4.`);
      await new Promise(resolveDelay => setTimeout(resolveDelay, 1500 * (attempt + 1)));
      continue;
    }
    const output = result.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text;
    if (!output) throw new Error(`Responses API không trả về nội dung JSON (${result.status ?? 'unknown'}).`);
    try { return JSON.parse(output).questions; }
    catch (error) {
      parseFailure = error;
      if (attempt < 4) console.log(`Phản hồi JSON bị cắt/lỗi định dạng; thử lại ${attempt + 1}/4.`);
    }
  }
  throw new Error(`Không đọc được JSON sau lần thử lại: ${parseFailure?.message ?? 'lỗi không rõ'}`);
}

function prepareQuestions(rawQuestions, examNumber, batchNumber, sources, seenStems, startDay, endDay) {
  const sourceByPage = new Map(sources.map(source => [`${source.file}\t${source.page}`, source.text]));
  return rawQuestions.map((raw, index) => {
    let source = sources.find(item => item.file === raw.sourceFile && item.page === raw.sourcePage);
    let sourceText = sourceByPage.get(`${raw.sourceFile}\t${raw.sourcePage}`);
    if (!sourceText || !source || !isGroundedQuote(sourceText, raw.evidenceQuote)) {
      source = findSourcePageForQuote(raw, startDay, endDay);
      if (!source) throw new Error(`Đề ${examNumber}, batch ${batchNumber}: không tìm thấy trích dẫn trong slide Day ${startDay}–${endDay} (${raw.sourceFile}, trang ${raw.sourcePage}).`);
      raw.sourceFile = source.file;
      raw.sourcePage = source.page;
      sourceText = source.text;
    }
    const stemKey = normalize(raw.stem);
    if (!stemKey || seenStems.has(stemKey)) throw new Error(`Câu trùng hoặc rỗng: ${raw.stem}`);
    seenStems.add(stemKey);
    const isMcq = raw.type === 'single_choice';
    if (isMcq && (raw.options.length !== 4 || raw.correctIndex < 0 || raw.correctIndex > 3)) throw new Error(`MCQ không hợp lệ: ${raw.stem}`);
    if (isMcq && normalize(raw.answer) !== normalize(raw.options[raw.correctIndex])) throw new Error(`Đáp án và phương án đúng không khớp: ${raw.stem}`);
    if (!isMcq && (raw.options.length !== 0 || raw.correctIndex !== -1 || raw.answer.length < 80)) throw new Error(`Tự luận thiếu bài giải mẫu: ${raw.stem}`);
    if (/(?:chon|choose|select)\s+(?:(?:mot|the)\s+)?(?:chu de|topic)\b|(?:chu de nao|which topic|which source|nguon cua doan trich)|(?:trich doan|doan trich|excerpt).{0,70}(?:thuoc|gan voi|duoc xep|belongs to|classified as).{0,45}(?:chu de|topic|slide|nguon|source)|trong (?:noi dung|bai hoc).{0,80}khai niem duoc de cap/i.test(normalize(raw.stem))) {
      throw new Error(`Câu hỏi nhận diện chủ đề/nguồn bị chặn: ${raw.stem}`);
    }
    const serial = (batchNumber - 1) * 17 + index + 1;
    return {
      id: `authored-exam-${String(examNumber).padStart(2, '0')}-${String(serial).padStart(3, '0')}`,
      stem: raw.stem.trim(), type: raw.type,
      options: raw.options.map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text: text.trim() })),
      correctAnswers: isMcq ? [String.fromCharCode(65 + raw.correctIndex)] : null,
      explanation: `${raw.explanation.trim()}\n\nGợi ý đáp án: ${raw.answer.trim()}`,
      topic: raw.topic.trim(), day: source.day, difficulty: raw.difficulty,
      sourceFiles: [raw.sourceFile], sourcePages: [raw.sourcePage], evidenceQuote: raw.evidenceQuote,
      sourceLabel: `Day ${source.day} · ${raw.topic.trim()}`, verificationStatus: 'answer_proposed',
      reviewerNotes: 'Đáp án đề xuất được soạn từ slide đã trích dẫn; cần người học rà soát trước khi xem là đáp án chính thức.',
      sourceType: 'assistant_authored', rawOcrText: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  });
}

async function main() {
  const questions = [];
  const examSets = [];
  const completedBatches = new Set();
  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8'));
    questions.push(...(checkpoint.questions ?? []));
    examSets.push(...(checkpoint.examSets ?? []));
    for (const key of checkpoint.completedBatches ?? []) completedBatches.add(key);
    console.log(`Tiếp tục từ checkpoint: ${completedBatches.size}/${requestedExamNumbers.length * batches.length} batch đã hoàn tất.`);
  }
  const seenStems = new Set();
  const priorStems = questions.map(question => question.stem);
  for (const question of questions) seenStems.add(normalize(question.stem));
  for (const examNumber of requestedExamNumbers) {
    const legacyRange = examDays[examNumber - 3];
    if (!allDaysMode && !legacyRange) throw new Error(`Không có lịch nguồn cho Đề ${examNumber}; dùng --all-days để phủ Day 1–28.`);
    const [setStartDay, setEndDay] = allDaysMode ? [1, 28] : legacyRange;
    if (examSets.some(set => set.id === `exam-${String(examNumber).padStart(2, '0')}`)) continue;
    const ids = [];
    let mcq = 0; let essay = 0;
    for (let batch = 0; batch < batches.length; batch++) {
      const batchNumber = batch + 1;
      const [startDay, endDay] = allDaysMode ? allDaysBatches[batch] : legacyRange;
      const dailyDistribution = allDaysMode ? dayQuota(startDay, endDay) : null;
      const checkpointKey = `${examNumber}:${batchNumber}`;
      if (completedBatches.has(checkpointKey)) {
        const batchIds = new Set(Array.from({ length: 17 }, (_, offset) => `authored-exam-${String(examNumber).padStart(2, '0')}-${String((batchNumber - 1) * 17 + offset + 1).padStart(3, '0')}`));
        const done = questions.filter(question => batchIds.has(question.id));
        ids.push(...done.map(question => question.id));
        mcq += done.filter(question => question.type === 'single_choice').length;
        essay += done.filter(question => question.type === 'essay').length;
        continue;
      }
      const sourceRotation = allDaysMode ? (examNumber - 1) * batches.length + batchNumber : batchNumber;
      const sources = getExamSources(startDay, endDay, sourceRotation);
      if (!sources.length) throw new Error(`Không có slide đủ nội dung cho Day ${startDay}–${endDay}.`);
      let prepared;
      let lastBatchError;
      for (let batchAttempt = 0; batchAttempt < 4; batchAttempt++) {
        try {
          const raw = [];
          for (let repair = 0; repair < 3; repair++) {
            const missingMcq = batches[batch].mcq - raw.filter(question => question.type === 'single_choice').length;
            const missingEssay = batches[batch].essay - raw.filter(question => question.type === 'essay').length;
            if (missingMcq <= 0 && missingEssay <= 0) break;
            const retryGuidance = batchAttempt ? [`Lô trước chưa đạt phân bổ ngày. Lần này hãy kiểm tra thật kỹ và tuân thủ đúng: ${JSON.stringify(dailyDistribution)}.`, ...priorStems] : priorStems;
            raw.push(...await requestQuestions(sources, Math.max(missingMcq, 0), Math.max(missingEssay, 0), [...retryGuidance, ...raw.map(question => question.stem)], startDay, endDay, dailyDistribution));
          }
          const exactRaw = [];
          let takenMcq = 0; let takenEssay = 0;
          for (const question of raw) {
            if (question.type === 'single_choice' && takenMcq < batches[batch].mcq) { exactRaw.push(question); takenMcq++; }
            if (question.type === 'essay' && takenEssay < batches[batch].essay) { exactRaw.push(question); takenEssay++; }
          }
          if (takenMcq !== batches[batch].mcq || takenEssay !== batches[batch].essay) throw new Error(`thiếu câu sau 3 lần sửa số lượng`);
          const batchSeenStems = new Set(seenStems);
          const candidate = prepareQuestions(exactRaw, examNumber, batchNumber, sources, batchSeenStems, startDay, endDay);
          if (dailyDistribution) {
            const actualDistribution = Object.fromEntries(Object.keys(dailyDistribution).map(day => [day, candidate.filter(question => question.day === Number(day)).length]));
            if (Object.entries(dailyDistribution).some(([day, count]) => actualDistribution[day] !== count)) {
              throw new Error(`phân bổ ngày không khớp; yêu cầu ${JSON.stringify(dailyDistribution)}, nhận ${JSON.stringify(actualDistribution)}`);
            }
          }
          prepared = candidate;
          break;
        } catch (error) {
          lastBatchError = error;
          if (batchAttempt < 3) console.log(`Đề ${examNumber}, batch ${batchNumber} chưa đạt (${error.message}); tạo lại lô ${batchAttempt + 2}/4.`);
        }
      }
      if (!prepared) throw new Error(`Đề ${examNumber}, batch ${batchNumber}: ${lastBatchError?.message ?? 'không đạt kiểm tra'}.`);
      const batchSeenStems = new Set(seenStems);
      for (const question of prepared) batchSeenStems.add(normalize(question.stem));
      for (const stem of batchSeenStems) seenStems.add(stem);
      for (const question of prepared) {
        questions.push(question); ids.push(question.id); priorStems.push(question.stem);
        if (question.type === 'single_choice') mcq++; else essay++;
      }
      completedBatches.add(checkpointKey);
      writeFileSync(checkpointPath, `${JSON.stringify({ questions, examSets, completedBatches: [...completedBatches] }, null, 2)}\n`);
      console.log(`Đề ${String(examNumber).padStart(2, '0')}: đã soạn ${ids.length}/85 câu.`);
    }
    if (ids.length !== 85 || mcq !== 60 || essay !== 25) throw new Error(`Đề ${examNumber} không đủ 60 MCQ + 25 tự luận.`);
    if (allDaysMode) {
      const actualDays = new Set(questions.filter(question => ids.includes(question.id)).map(question => question.day));
      if (actualDays.size !== 28 || Array.from({ length: 28 }, (_, index) => index + 1).some(day => !actualDays.has(day))) {
        throw new Error(`Đề ${examNumber} chưa có đủ Day 1–28.`);
      }
    }
    examSets.push({
      id: `exam-${String(examNumber).padStart(2, '0')}`, title: allDaysMode ? `Đề ${String(examNumber).padStart(2, '0')} · Tổng hợp Day 1–28` : `Đề ${String(examNumber).padStart(2, '0')} · Luyện tập Day ${setStartDay}–${setEndDay}`,
      questionIds: ids, total: 85, mcqCount: 60, essayCount: 25,
      sourceSets: ['04_extracted_slide_text'], createdAt: new Date().toISOString(),
    });
  }
  for (let left = 0; left < examSets.length; left++) for (let right = left + 1; right < examSets.length; right++) {
    const leftIds = new Set(examSets[left].questionIds);
    const shared = examSets[right].questionIds.filter(id => leftIds.has(id)).length;
    if (shared / 85 > 0.2) throw new Error(`${examSets[left].id} và ${examSets[right].id} vượt 20% câu trùng.`);
  }
  writeFileSync(outputPath, `${JSON.stringify({ questions, examSets }, null, 2)}\n`);
  writeFileSync(checkpointPath, `${JSON.stringify({ questions, examSets, completedBatches: [...completedBatches] }, null, 2)}\n`);
  console.log(`Đã lưu ${examSets.length} đề mở rộng, ${questions.length} câu có đáp án và nguồn tại web/content/authored-exam-bank.json.`);
  console.log('Chạy npm run prepare:data trong web/ để đưa ngân hàng đề vào bản local của app.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
