
const curatedStemOverrides = new Map([
  ['middle_test-027', `Nối mỗi khái niệm ở Cột A với mô tả đúng ở Cột B.

Cột A — Khái niệm:
A1. Discriminative AI
A2. Generative AI
A3. Agentic AI
A4. LLM
A5. Transformer

Cột B — Mô tả:
B1. Kiến trúc neural network dùng Self-Attention, nền tảng của các model ngôn ngữ hiện đại
B2. AI tự lập kế hoạch và thực thi nhiều bước hành động để đạt mục tiêu (Goal → Plan → Action)
B3. Foundation model ngôn ngữ lớn, decoder-only, dự đoán token tiếp theo
B4. AI phân loại hoặc dự đoán nhãn từ input (Input → Label)
B5. AI tạo ra nội dung mới: văn bản, ảnh, code (Prompt → Content)

Nhập đáp án theo định dạng: A1 → B?, A2 → B?, A3 → B?, A4 → B?, A5 → B?`],
  ['middle_test-028', `Sắp xếp các giai đoạn trong AI Product Lifecycle theo đúng thứ tự phát triển sản phẩm.

[A] Monitor — theo dõi performance, cost, errors trong production

[B] Build & Prototype — xây dựng MVP agent, lab thực hành

[C] Problem Scoping — xác định bài toán kinh doanh, stakeholders, ROI target

[D] Test & Evaluate — chạy eval pipeline, đo metrics, tìm failure cases

[E] Deploy — containerize, CI/CD, release lên production

[F] Iterate — cải thiện dựa trên monitoring data và user feedback

[G] Data Strategy — xác định nguồn data, chất lượng, privacy, pipeline.

Nhập thứ tự đúng theo định dạng: ? → ? → ? → ? → ? → ? → ?`],
]);

const tokenCorrections = [
  [/nhãn viên/gi, 'nhân viên'],
  [/xừ lý/gi, 'xử lý'],
  [/để xuất/gi, 'đề xuất'],
  [/một lán/gi, 'một lần'],
  [/đáng đấu tư/gi, 'đáng đầu tư'],
  [/Tinh hưống/gi, 'Tình huống'],
  [/Tinh huóng/gi, 'Tình huống'],
  [/lán upgrade/gi, 'lần upgrade'],
  [/tiép theo/gi, 'tiếp theo'],
  [/cán tim/g, 'cần tìm'],
  [/Cán tim/g, 'Cần tìm'],
  [/xãy dựng/g, 'xây dựng'],
  [/kiềm tra/g, 'kiểm tra'],
  [/không đù/g, 'không đủ'],
  [/đếu/g, 'đều'],
  [/\bđiếu\b/g, 'điều'],
  [/\btón tại\b/g, 'tồn tại'],
  [/\bnguốn\b/g, 'nguồn'],
  [/hoàn\s+chinh/gi, 'hoàn chỉnh'],
  [/\bchinh\b/g, 'chính'],
  [/\btháy\b/g, 'thấy'],
  [/\bhiếu\b/g, 'hiểu'],
  [/\bđáy đủ\b/g, 'đầy đủ'],
  [/\bTỉnh huỗng\b/g, 'Tình huống'],
  [/\bTình huóng\b/g, 'Tình huống'],
  [/\bVẽ chính sách\b/g, 'về chính sách'],
  [/\bquy trinh\b/g, 'quy trình'],
  [/\btim document\b/g, 'tìm document'],
  [/\bkiềm tra\b/g, 'kiểm tra'],
  [/[Pp]olicy cü/g, match => `${match[0]}olicy cũ`],
  [/trả vé lõi/gi, 'trả về lỗi'],
  [/đù trường/g, 'đủ trường'],
  [/Hiến thị/g, 'Hiển thị'],
  [/[Dd]ata bán/g, match => `${match[0]}ata bẩn`],
  [/phân tich/g, 'phân tích'],
  [/tón kém/gi, 'tốn kém'],
  [/\bcü\b/gi, 'cũ'],
  [/Cán\s+tim/gi, 'Cần tìm'],
  [/thừ\s+tăng/gi, 'thử tăng'],
  [/văn\s+đé/gi, 'vấn đề'],
  [/không\s+hiếu/gi, 'không hiểu'],
  [/cán\s+thém/gi, 'cần thêm'],
  [/khóng/gi, 'không'],
  [/néu/g, 'nếu'],
  [/möi/gi, 'mỗi'],
  [/\[[IU]\]/g, '[1]'],
  [/—\s*\[\]\s*=\s*\?/g, '— [1] =?'],
  [/-\s*\[\]\s*=\s*\?/g, '- [1] =?'],
  [/—\s*\[\]\]\s*=\s*\?/g, '— [1] =?'],
  [/\bTy\s+giá\b/g, 'Tỷ giá'],
  [/exchange_rate0/g, 'exchange_rate()'],
  [/\bxãy\s+AI\b/g, 'xây AI'],
  [/phân\s+tich/gi, 'phân tích'],
  [/chi\s+(?=(?:hiển thị|allow)\b)/gi, 'chỉ '],
  [/sự\s+cổ/gi, 'sự cố'],
  [/Có\s+gi\s+đó/gi, 'Có gì đó'],
  [/\bOpenAl\b/gi, 'OpenAI'],
  [/Điến/g, 'Điền'],
  [/\bgóm\b/gi, 'gồm'],
  [/\bthiéu\b/gi, 'thiếu'],
  [/\bagent\s+se\b/gi, 'agent sẽ'],
  [/\bdata\s+bán\b/gi, 'data bẩn'],
  [/\bmetadata\s+thiéu\b/gi, 'metadata thiếu'],
  [/\bmodel\s+đất\s+hơn\b/gi, 'model đắt hơn'],
  [/\bkhông\|\s*fix\b/gi, 'không fix'],
  [/\bI8i\b/gi, 'lỗi'],
  [/\bGPT\s*[-‐‑–—]?\s*40\s*[-‐‑–—]?\s*mini\b/gi, 'GPT-4o-mini'],
  [/\bGPT\s*[-‐‑–—]?\s*40\b/gi, 'GPT-4o'],
  [/\bTIFT\b/g, 'TTFT'],
  [/\bAl\b/g, 'AI'],
  [/\bvé\s+(?=(?:data|lỗi|client|server|kết quả|response)\b)/gi, 'về '],
  [/\bNéu\b/g, 'Nếu'],
  [/\bbán\b(?=\s*(?:[,.;:]|\)|thì|agent|,))/gi, 'bẩn'],
  [/\bTinh\s+toán\b/g, 'Tính toán'],
  [/\btinh\s+toán\b/g, 'tính toán'],
  [/\bPhân\s+tich\b/g, 'Phân tích'],
  [/\bsentiment\s+cùa\b/gi, 'sentiment của'],
  [/\bKiém\s+tra\b/g, 'Kiểm tra'],
  [/\bthiéu\b/g, 'thiếu'],
  [/\bcùa\b/g, 'của'],
  [/\bđù\s+trường\b/g, 'đủ trường'],
  [/\bbát\s+buộc\b/g, 'bắt buộc'],
  [/\bHiến\s+thị\b/g, 'Hiển thị'],
  [/\bgi\?/gi, 'gì?'],
  [/\bhùy\s+đơn\b/g, 'hủy đơn'],
  [/\bdé\b/g, 'để'],
  [/\btáng\b/g, 'tầng'],
  [/\btrà\s+lời\b/g, 'trả lời'],
  [/\btrả\s+Vẽ\b/g, 'trả về'],
  [/\bnhiéu\b/g, 'nhiều'],
  [/\bTinh\s+huống\b/g, 'Tình huống'],
  [/\btinh\s+huống\b/g, 'tình huống'],
  [/\btoo[lil]\b/gi, 'tool'],
  [/\bresponse\s+tinh\s+bằng\b/gi, 'response tính bằng'],
  [/\btim\s+(?=(?:kiếm|thấy|ra|được)\b)/gi, 'tìm '],
  [/\bgán\s+nhất\b/gi, 'gần nhất'],
  [/\bđày\s+đủ\b/g, 'đầy đủ'],
  [/\bl8i\b/gi, 'lỗi'],
];

export function cleanOcrText(value) {
  if (typeof value !== 'string') return value;
  return tokenCorrections.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
    .replace(/\s*(?:B8H1E?=?[àa]1?|B8H1==[àa]1?|BlEA)\s*$/i, '')
    .replace(/\s*(?:answer\s+goes\s+here|ananer\s+oeshere|ananer\s+goeshere)\s*$/i, '')
    .replace(/\s+question\s+\d+\b.*$/i, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
}

export function cleanOcrQuestion(question) {
  if (question?.sourceType !== 'past_exam_transcription') return question;
  return {
    ...question,
    stem: curatedStemOverrides.get(question.id) ?? cleanOcrText(question.stem),
    topic: cleanOcrText(question.topic),
    options: Array.isArray(question.options)
      ? question.options.map(option => ({ ...option, text: cleanOcrText(option.text) }))
      : question.options,
  };
}
