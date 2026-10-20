import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const webRoot = resolve(scriptDir, '..');
const sourceRoot = resolve(repoRoot, 'AI_Thuc_Chien_K4_Midterm');
const inputPath = resolve(sourceRoot, '05_data/exam_bank_seed.json');
const outputPath = resolve(webRoot, 'src/data/exam_bank_seed.json');
const generatedAt = '2026-10-20T00:00:00.000Z';

export function normalize(text) {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd').replaceAll('Đ', 'd')
    .toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function shuffledFacts(facts, random) {
  const groups = new Map();
  for (const fact of facts) {
    if (!groups.has(fact.topic)) groups.set(fact.topic, []);
    groups.get(fact.topic).push(fact);
  }
  const topics = shuffle([...groups.keys()], random);
  for (const topic of topics) groups.set(topic, shuffle(groups.get(topic), random));
  const ordered = [];
  while (topics.some(topic => groups.get(topic).length)) {
    for (const topic of topics) {
      const next = groups.get(topic).shift();
      if (next) ordered.push(next);
    }
  }
  return ordered;
}

function distractorsFor(facts, answerFact, count, offset) {
  const candidates = facts.filter(fact => fact.id !== answerFact.id && fact.topic !== answerFact.topic);
  if (candidates.length < count) throw new Error(`Không đủ phương án nhiễu theo chủ đề khác cho nguồn ${answerFact.id}.`);
  const start = offset % (candidates.length - count + 1);
  return candidates.slice(start, start + count);
}

function questionBase(id, fact, stem, options, type, correctAnswers, explanation) {
  return {
    id, stem, type, options, correctAnswers, explanation, topic: fact.topic, day: null, difficulty: 'medium',
    sourceFiles: [fact.sourceFile], sourcePages: [], evidenceQuote: fact.text,
    verificationStatus: type === 'essay' ? 'transcribed' : 'answer_proposed',
    reviewerNotes: 'Câu biến thể được tạo từ trích đoạn nguồn cục bộ. Đáp án MCQ là đề xuất; cần rà soát trước khi xem là đáp án chính thức.',
    sourceType: 'generated_variant', rawOcrText: '', createdAt: generatedAt, updatedAt: generatedAt,
  };
}

export function buildAdditionalExams({ existingQuestions, existingSets, facts, options = {} }) {
  const {
    firstNumber = 3, formCount = 20, total = 85, mcqCount = 60, essayCount = 25, randomSeed = 42020,
  } = options;
  if (mcqCount + essayCount !== total) throw new Error('Tổng câu MCQ và tự luận không bằng tổng số câu.');
  const required = formCount * total;
  if (facts.length < required) throw new Error(`Không đủ câu hỏi nguồn khác nhau: cần ít nhất ${required}, hiện có ${facts.length}.`);

  const uniqueFacts = [];
  const seen = new Set();
  for (const fact of facts) {
    const text = normalize(fact.text);
    if (!fact.id || !fact.topic || !fact.sourceFile || !text || seen.has(text)) continue;
    seen.add(text);
    uniqueFacts.push({ ...fact, text: fact.text.trim() });
  }
  if (uniqueFacts.length < required) throw new Error(`Không đủ nguồn câu hỏi sau khi bỏ nội dung trùng: cần ${required}, hiện có ${uniqueFacts.length}.`);

  const random = randomFor(randomSeed);
  const ordered = shuffledFacts(uniqueFacts, random);
  const allTopics = [...new Set(ordered.map(fact => fact.topic))];
  if (allTopics.length < 4) throw new Error('Cần ít nhất bốn chủ đề nguồn để tạo phương án nhiễu.');
  const questions = [];
  const examSets = [];
  let cursor = 0;
  let mcqSerial = 1;
  let essaySerial = 1;
  for (let formIndex = 0; formIndex < formCount; formIndex++) {
    const number = firstNumber + formIndex;
    const questionIds = [];
    for (let index = 0; index < mcqCount; index++) {
      const fact = ordered[cursor++];
      const id = `generated-mcq-${String(mcqSerial++).padStart(4, '0')}`;
      let question;
      if (index % 2 === 0) {
        const prompts = [
          'Đoạn trích sau thuộc chủ đề học nào?',
          'Trong giáo trình, nội dung này được xếp vào chủ đề nào?',
          'Chọn chủ đề gắn với trích đoạn sau:',
          'Ý trong trích đoạn được học ở phần nào?',
        ];
        const choices = shuffle([fact.topic, ...shuffle(allTopics.filter(topic => topic !== fact.topic), random).slice(0, 3)], random);
        const answerIndex = choices.indexOf(fact.topic);
        question = questionBase(id, fact,
          `${prompts[(mcqSerial + index) % prompts.length]}\n\n“${fact.text}”`,
          choices.map((choice, choiceIndex) => ({ id: String.fromCharCode(65 + choiceIndex), text: choice })),
          'single_choice', [String.fromCharCode(65 + answerIndex)],
          `Đáp án đề xuất: đoạn trích gắn với chủ đề “${fact.topic}” trong nguồn. Cần người rà soát xác nhận phân loại.`);
      } else {
        const words = fact.text.split(/\s+/);
        const opening = words.slice(0, 5).join(' ');
        const ending = words.slice(-4).join(' ');
        const distractors = distractorsFor(ordered, fact, 3, cursor + index * 17);
        const choices = shuffle([fact, ...distractors], random);
        const answerIndex = choices.findIndex(choice => choice.id === fact.id);
        question = questionBase(id, fact,
          `Chọn phần tiếp nối đúng của ghi chú “${opening} … ${ending}” trong tài liệu “${fact.topic}”.`,
          choices.map((choice, choiceIndex) => ({ id: String.fromCharCode(65 + choiceIndex), text: choice.text })),
          'single_choice', [String.fromCharCode(65 + answerIndex)],
          'Đáp án đề xuất khớp với trích đoạn nguồn. Các phương án còn lại được lấy từ chủ đề khác; cần người rà soát xác nhận.');
      }
      question.topic = 'Đọc hiểu nguồn';
      questions.push(question);
      questionIds.push(id);
    }
    for (let index = 0; index < essayCount; index++) {
      const fact = ordered[cursor++];
      const id = `generated-essay-${String(essaySerial++).padStart(4, '0')}`;
      const prompts = [
        'Hãy giải thích ý chính và nêu một ví dụ áp dụng vào sản phẩm AI.',
        'Hãy phân tích vì sao ý này quan trọng khi thiết kế một tính năng AI.',
        'Hãy trình bày cách vận dụng ý này và một rủi ro cần kiểm soát.',
        'Hãy liên hệ ý này với một quyết định về dữ liệu, mô hình hoặc trải nghiệm người dùng.',
      ];
      const prompt = prompts[(essaySerial + index) % prompts.length];
      questions.push(questionBase(id, fact,
        `Dựa trên nội dung trong tài liệu “${fact.topic}” — “${fact.text}” — ${prompt}`,
        [], 'essay', null,
        `Gợi ý tự chấm: giải thích đúng nội dung trích dẫn, nối lập luận với chủ đề ${fact.topic}, và đưa ra ví dụ hoặc rủi ro có liên quan. Đây là rubric luyện tập, không phải đáp án chính thức.`));
      questionIds.push(id);
    }
    examSets.push({
      id: `exam-${String(number).padStart(2, '0')}`,
      title: `Đề ${String(number).padStart(2, '0')} · Luyện tập mở rộng`, questionIds, total, mcqCount, essayCount,
      sourceSets: ['04_extracted_slide_text', '06_cheat_sheet'], createdAt: generatedAt,
    });
  }
  const allSets = [...existingSets, ...examSets];
  for (let left = 0; left < allSets.length; left++) {
    for (let right = left + 1; right < allSets.length; right++) {
      const ids = new Set(allSets[left].questionIds);
      const shared = allSets[right].questionIds.filter(id => ids.has(id)).length;
      if (shared / Math.min(allSets[left].questionIds.length, allSets[right].questionIds.length) > 0.2) {
        throw new Error(`Đề ${allSets[left].id} và ${allSets[right].id} vượt giới hạn câu trùng 20%.`);
      }
    }
  }
  const allIds = new Set([...existingQuestions.map(question => question.id), ...questions.map(question => question.id)]);
  for (const set of examSets) {
    if (set.questionIds.some(id => !allIds.has(id))) throw new Error(`Đề ${set.id} có ID câu hỏi không tồn tại.`);
  }
  return { questions: [...existingQuestions, ...questions], examSets: allSets };
}

export function extractSourceFacts(chunks, cheatSheet) {
  const candidates = [];
  for (const chunk of chunks) {
    const relativeSource = chunk.source_file.replace(/^03_drive_slides\//, '04_extracted_slide_text/').replace(/\.pdf$/i, '.md');
    const sourceFile = relativeSource;
    for (const line of chunk.text.split(/\n+/)) {
      const text = line.replace(/^\s*[•●▪◦*-]+\s*/, '').replace(/\s+/g, ' ').trim();
      if (isCandidate(text)) candidates.push({ id: `${chunk.id}:${normalize(text).slice(0, 24)}`, topic: chunk.topic_hint, sourceFile, text });
    }
  }
  let topic = 'Cheat sheet';
  for (const line of cheatSheet.split(/\n+/)) {
    const text = line.replace(/^\s*[#>*•●▪◦-]+\s*/, '').replace(/\s+/g, ' ').trim();
    if (/^.{2,80}$/.test(text) && /^#{1,6}\s/.test(line)) topic = text;
    else if (isCandidate(text)) candidates.unshift({ id: `cheat:${normalize(text)}`, topic, sourceFile: '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md', text });
  }
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = normalize(candidate.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

function isCandidate(text) {
  const words = text.split(/\s+/);
  const letters = (text.match(/[A-Za-zÀ-ỹ]/g) ?? []).length;
  return text.length >= 52 && text.length <= 180 && words.length >= 8 && letters / text.length > 0.48 &&
    !/(https?:|www\.|@|\b\d{1,2}:\d{2}\b|\b20\d{2}\b|email|password|discord\.gg|slido)/i.test(text);
}

function run() {
  const bank = JSON.parse(readFileSync(inputPath, 'utf8'));
  const chunkPath = resolve(sourceRoot, '05_data/knowledge_chunks.jsonl');
  const chunks = readFileSync(chunkPath, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  const cheatSheet = readFileSync(resolve(sourceRoot, '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md'), 'utf8');
  const facts = extractSourceFacts(chunks, cheatSheet);
  const built = buildAdditionalExams({ existingQuestions: bank.questions, existingSets: bank.examSets, facts });
  const generatedIds = new Set(built.examSets.slice(2).flatMap(set => set.questionIds));
  const output = { ...bank, questions: built.questions, examSets: built.examSets, generatedExamQuestionCount: generatedIds.size };
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Tạo ${built.examSets.length} đề, ${generatedIds.size} câu bổ sung từ ${facts.length} trích đoạn nguồn.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
