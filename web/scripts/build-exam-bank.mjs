import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const webRoot = resolve(scriptDir, '..');
const sourceRoot = resolve(repoRoot, 'AI_Thuc_Chien_K4_Midterm');
const inputPath = resolve(sourceRoot, '05_data/exam_bank_seed.json');
const outputPath = resolve(webRoot, 'src/data/exam_bank_seed.json');
const exam01ProposalsPath = resolve(webRoot, 'content/exam01-answer-proposals.json');
const exam02ProposalsPath = resolve(webRoot, 'content/exam02-answer-proposals.json');
const authoredExamBankPath = resolve(webRoot, 'content/authored-exam-bank.json');
const generatedAt = '2026-10-20T00:00:00.000Z';

function applyExam01Proposals(questions, examSets) {
  const exam01 = examSets.find(set => set.id === 'exam-01');
  if (!exam01) return questions;
  const proposals = JSON.parse(readFileSync(exam01ProposalsPath, 'utf8'));
  const proposedIds = new Set(Object.keys(proposals));
  for (const id of exam01.questionIds) {
    const proposal = proposals[id];
    if (!proposal) throw new Error(`Thiếu đáp án đề xuất cho ${id}.`);
    const question = questions.find(item => item.id === id);
    if (!question) throw new Error(`Không tìm thấy câu hỏi ${id} của Đề 01.`);
    if (proposal.correctAnswers?.some(answer => !question.options.some(option => option.id === answer))) {
      throw new Error(`Đáp án đề xuất của ${id} không khớp phương án.`);
    }
    question.correctAnswers = proposal.correctAnswers ?? null;
    question.explanation = proposal.explanation;
    question.verificationStatus = 'answer_proposed';
    question.reviewerNotes = 'Đáp án/gợi ý do hệ thống đề xuất từ nội dung câu hỏi và kiến thức trong học liệu. Chưa phải đáp án chính thức; cần đối chiếu với giảng viên.';
  }
  if (proposedIds.size !== exam01.questionIds.length || [...proposedIds].some(id => !exam01.questionIds.includes(id))) {
    throw new Error('Tập đáp án đề xuất không khớp với Đề 01.');
  }
  return questions;
}

function applyExam02Proposals(questions) {
  const proposals = JSON.parse(readFileSync(exam02ProposalsPath, 'utf8'));
  for (const proposal of proposals.answers) {
    const question = questions.find(item => item.id === proposal.id);
    if (!question || question.type !== 'essay') throw new Error(`Không tìm thấy câu tự luận ${proposal.id} của Đề 02.`);
    question.explanation = proposal.explanation;
    question.reviewerNotes = proposal.reviewerNotes;
    question.verificationStatus = 'answer_proposed';
  }
  for (const question of proposals.additionalQuestions) {
    if (!questions.some(item => item.id === question.id)) questions.push(question);
  }
}

function mergeAuthoredExamBank(bank) {
  if (!existsSync(authoredExamBankPath)) return bank;
  const authored = JSON.parse(readFileSync(authoredExamBankPath, 'utf8'));
  const existingIds = new Set(bank.questions.map(question => question.id));
  const existingExamIds = new Set(bank.examSets.map(set => set.id));
  for (const question of authored.questions ?? []) {
    if (existingIds.has(question.id)) throw new Error(`ID câu hỏi bị trùng: ${question.id}`);
    existingIds.add(question.id);
    bank.questions.push(question);
  }
  for (const set of authored.examSets ?? []) {
    if (existingExamIds.has(set.id)) throw new Error(`ID đề bị trùng: ${set.id}`);
    existingExamIds.add(set.id);
    bank.examSets.push(set);
  }
  return bank;
}

function inferStudyDay(question) {
  if (Number.isInteger(question.day) && question.day > 0) return question.day;
  const sources = [question.topic, ...(question.sourceFiles ?? [])].filter(Boolean).join(' ');
  const explicitDay = sources.match(/(?:study\s+)?day\s*0?(\d{1,2})(?:\.\d+)?/i);
  if (explicitDay) return Number(explicitDay[1]);

  const topic = normalize(question.topic ?? '');
  const topicDays = [
    [/ai foundations|llm|sampling|transformer|token/, 1],
    [/scoping|problem definition|business problem|readiness/, 2],
    [/multi agent/, 9],
    [/agent|react|workflow/, 3],
    [/prompt|tool calling/, 4],
    [/product thinking|requirements|uncertainty/, 5],
    [/project management/, 6],
    [/data foundations/, 7],
    [/rag evaluation/, 14],
    [/rag|retrieval/, 8],
    [/data pipeline|data observability/, 10],
    [/guardrail|safety|responsible ai/, 11],
    [/deployment|production|cloud/, 12],
    [/monitoring|logging|observability/, 13],
    [/evaluation|benchmark|classification metrics|golden dataset/, 14],
    [/gpu|infrastructure|operations/, 15],
    [/first principles|ai product manager/, 16],
    [/product discovery|interview|mom test/, 17],
    [/experiment|human centered/, 18],
    [/prototype/, 19],
    [/retention|engagement|product metrics|metrics/, 20],
    [/ethics|luat ai|regulation/, 21],
    [/gtm|go to market/, 22],
    [/growth/, 23],
    [/cost|roi|pricing|economics/, 24],
    [/stakeholder|team health/, 25],
    [/roadmap/, 28],
  ];
  for (const [pattern, day] of topicDays) if (pattern.test(topic)) return day;

  const text = normalize([question.stem, question.explanation, question.evidenceQuote].join(' '));
  const textDays = [
    [/ragas|faithfulness|context recall|golden dataset|evaluation|eval pipeline|bleu/, 14],
    [/eu ai act|luat|law|high risk/, 21],
    [/lora|quantization|gpu|model serving|lakehouse|finops|semantic caching/, 15],
    [/prompt injection|jailbreak|guardrail|human in the loop|pii/, 11],
    [/multi agent|multi-agent|supervisor worker|parallel processing/, 9],
    [/c suite|stakeholder|change management|adoption/, 25],
    [/readiness checklist|problem scoping|go decision/, 2],
    [/classification|discriminative|machine learning|deep learning|transformer/, 1],
    [/context engineering|react loop/, 3],
    [/chunk|embedding|vector|retrieval|rag/, 8],
    [/prompt grounding|system prompt|rtcf|tool schema/, 4],
    [/react|tool call|agent|workflow/, 3],
    [/roi|cost saving|pricing|financial model|cost per request/, 24],
    [/monitor|latency|observability|p99|drift|freshness/, 13],
    [/deploy|production|api|ci\/cd|cloud|gpu|quantization|lakehouse/, 12],
    [/data quality|garbage in|selection bias|data pipeline/, 7],
    [/market|stakeholder|product|roadmap|business outcome|customer/, 2],
    [/prompt|sampling|temperature|token/, 1],
  ];
  for (const [pattern, day] of textDays) if (pattern.test(text)) return day;
  return 1;
}

function assignStudyDays(questions) {
  for (const question of questions) question.day = inferStudyDay(question);
  return questions;
}

export function normalize(text) {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd').replaceAll('Đ', 'd')
    .toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function isTopicGuessQuestion(stem) {
  const text = normalize(stem);
  return /(?:chon|choose|pick|select|identify|match)\s+(?:(?:the|mot)\s+)?(?:chu de|topic|theme)\b|(?:chu de nao|which topic|what topic)\b|(?:trich doan|doan trich|excerpt|passage).{0,50}(?:duoc xep|thuoc|gan voi|belongs to|classified as|mapped to).{0,30}(?:chu de|topic|theme)|noi dung nay.{0,40}(?:xep|thuoc).{0,30}(?:chu de|topic|theme)/i.test(text);
}

function isContextlessQuestion(question) {
  if (question.type === 'essay') return false;
  const stem = normalize(question.stem);
  return /trong noi dung bai hoc.{0,100}(?:khai niem duoc de cap|chu de nao)|(?:khai niem duoc de cap|concept discussed).{0,70}(?:nhan dinh nao|which statement)|which statement.{0,80}(?:lesson|course material)/i.test(stem);
}

function removeUnusableGeneratedQuestions(bank) {
  bank.examSets = bank.examSets.filter(set => set.id === 'exam-01' || set.id === 'exam-02' || /^exam-(0[3-9]|1[0-9]|20)$/.test(set.id));
  const removedIds = new Set(bank.questions.filter(question =>
    /^generated-(?:mcq|essay)-\d+$/i.test(question.id) || isTopicGuessQuestion(question.stem) || isContextlessQuestion(question),
  ).map(question => question.id));
  bank.questions = bank.questions.filter(question => !removedIds.has(question.id));
  const questionsById = new Map(bank.questions.map(question => [question.id, question]));
  bank.examSets = bank.examSets.map(set => {
    const questionIds = set.questionIds.filter(id => !removedIds.has(id));
    const selected = questionIds.map(id => questionsById.get(id)).filter(Boolean);
    return { ...set, questionIds, total: selected.length, mcqCount: selected.filter(question => question.type !== 'essay').length, essayCount: selected.filter(question => question.type === 'essay').length };
  });
  return removedIds.size;
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
  const sameTopic = facts.filter(fact => fact.id !== answerFact.id && fact.topic === answerFact.topic);
  const candidates = sameTopic;
  if (candidates.length < count) throw new Error(`Không đủ phương án nhiễu cùng chủ đề cho nguồn ${answerFact.id}.`);
  const start = offset % (candidates.length - count + 1);
  return candidates.slice(start, start + count);
}

function questionBase(id, fact, stem, options, type, correctAnswers, explanation) {
  return {
    id, stem, type, options, correctAnswers, explanation, topic: fact.topic, day: null, difficulty: 'medium',
    sourceFiles: [fact.sourceFile], sourcePages: Number.isInteger(fact.page) ? [fact.page] : [], evidenceQuote: fact.text, sourceLabel: fact.topic,
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
  const topicCounts = new Map();
  for (const fact of uniqueFacts) topicCounts.set(fact.topic, (topicCounts.get(fact.topic) ?? 0) + 1);
  const distractorReadyFacts = uniqueFacts.filter(fact => topicCounts.get(fact.topic) >= 4);
  if (distractorReadyFacts.length < required) throw new Error(`Không đủ nguồn sạch có ít nhất ba phương án nhiễu cùng chủ đề: cần ${required}, hiện có ${distractorReadyFacts.length}.`);

  const random = randomFor(randomSeed);
  const ordered = shuffledFacts(distractorReadyFacts, random);
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
      const concept = fact.text.match(/^\*\*([^*]{2,70}):\*\*/)?.[1];
      const distractors = distractorsFor(ordered, fact, 3, cursor + index * 17);
      const choices = shuffle([fact, ...distractors], random);
      const answerIndex = choices.findIndex(choice => choice.id === fact.id);
      const prompt = concept
        ? `Một người lần đầu học AI đọc thông tin sau: “${fact.text}”. Ý nào diễn giải đúng nhất về ${concept.trim()}?`
        : `Một người lần đầu học AI đọc thông tin sau: “${fact.text}”. Kết luận nào được thông tin này hỗ trợ trực tiếp?`;
      const question = questionBase(id, fact,
        prompt,
        choices.map((choice, choiceIndex) => ({ id: String.fromCharCode(65 + choiceIndex), text: choice.text })),
        'single_choice', [String.fromCharCode(65 + answerIndex)],
        `Đáp án đề xuất được hỗ trợ bởi thông tin đã nêu trong câu hỏi: “${fact.text}”. Cần người rà soát xác nhận.`);
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
        `Dựa trên trích đoạn — “${fact.text}” — ${prompt}`,
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
      if (isCandidate(text)) candidates.push({ id: `${chunk.id}:${normalize(text).slice(0, 24)}`, topic: chunk.topic_hint, sourceFile, page: chunk.page, text });
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
  const metadataOrInstructions = /\b(instructor|lecturer|chapter lead|developer expert|ai in action|agenda|homework|q\s*&\s*a|nghỉ giải lao|quét mã qr|discord|slido|terminal|template\.py|requirements\.txt|pip install|github|email|link bên dưới|liên hệ hỗ trợ|trả lời các câu hỏi|chạy thành công|mở transformer|thử trực tiếp|sáng nay|chiều nay|học viên|giảng viên|hẹn gặp|cảm ơn|đăng ký kênh|subscribe|video tiếp theo|các bạn|mọi người|nhóm\s*\d|thực hành|cài đặt|option [a-d]:|supports dual-import|maintains the last|call .*api|you must strictly|operational boundaries|nộp trước buổi|handbook|tóm tắt q\d|q\d:|nguồn:|source:|mẹo:|ghi nhớ\s*:\s*điền|điền .* cột|bảng theo dõi|lượt nhóm trình bày|nhóm phản biện|người trình bày|bốc thang điểm|file tự tính|câu hỏi cho bài tập|tháng \d+ có lãi|dòng \d+|trang \d+|nộp bài|hạn nộp|họ tên|mã sinh viên|user muốn|user wants)\b|\bday\s*0?\d+\s+\d+\s*\/\s*\d+|\[[^\]]*(?:tên|name|giảng viên|instructor)[^\]]*\]|https?:|www\.|@|\b\d{1,2}:\d{2}\b|\b20\d{2}\b|\.(?:py|ipynb)\b|[■□☐�]/i.test(text);
  const endsMidThought = /\b(?:và|hoặc|của|với|trong|theo|như|để|từ|một|các|là|thì|khi|nếu|and|or|of|with|for|to|the|a|an|in|on|by|from|as|at|into|but|which|that|including)\s*[.,;:…]*$/i.test(text);
  const malformed = /[?…]$|\b\w{26,}\b|(?:^|\s)#\s*(?:option|measure|todo)\b/i.test(text);
  return text.length >= 52 && text.length <= 180 && words.length >= 8 && letters / text.length > 0.48 &&
    !metadataOrInstructions && !endsMidThought && !malformed &&
    !/^[a-zà-ỹ]/.test(text) && /[.!:)”]$/.test(text);
}

function run() {
  const bank = JSON.parse(readFileSync(inputPath, 'utf8'));
  applyExam01Proposals(bank.questions, bank.examSets);
  applyExam02Proposals(bank.questions);
  mergeAuthoredExamBank(bank);
  const removedGeneratedQuestions = removeUnusableGeneratedQuestions(bank);
  assignStudyDays(bank.questions);
  const output = { ...bank, generatedExamQuestionCount: 0 };
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Giữ ${bank.examSets.length} đề có câu hỏi độc lập; đã loại ${removedGeneratedQuestions} câu sinh tự động từ ghi chú/trích đoạn thô.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
