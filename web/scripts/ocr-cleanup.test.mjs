import { describe, expect, it } from 'vitest';
import { cleanOcrQuestion } from './ocr-cleanup.mjs';

describe('OCR question cleanup', () => {
  it('repairs common high-confidence Vietnamese OCR errors and removes answer-box noise', () => {
    expect(cleanOcrQuestion({ sourceType: 'past_exam_transcription', stem: '500 nhãn viên xừ lý ticket; bạn để xuất một lán và đáng đấu tư? B8H1E=à' }).stem)
      .toBe('500 nhân viên xử lý ticket; bạn đề xuất một lần và đáng đầu tư?');
    expect(cleanOcrQuestion({ sourceType: 'past_exam_transcription', stem: 'Tinh hưống; Tinh huóng và lán upgrade model tiép theo.' }).stem)
      .toBe('Tình huống; Tình huống và lần upgrade model tiếp theo.');
  });

  it('corrects clear OCR typos in stems and options while retaining the raw transcript', () => {
    const question = {
      id: 'middle_test-010',
      sourceType: 'past_exam_transcription',
      stem: "Tại sao Garbage In, Garbage Out quan trọng hơn khi nói vé data cho Al agent?",
      options: [{ id: 'A', text: 'Néu data bán, Al sẽ trả lời sai.' }],
      rawOcrText: 'nói vé data cho Al agent',
    };

    expect(cleanOcrQuestion(question)).toMatchObject({
      stem: "Tại sao Garbage In, Garbage Out quan trọng hơn khi nói về data cho AI agent?",
      options: [{ id: 'A', text: 'Nếu data bẩn, AI sẽ trả lời sai.' }],
      rawOcrText: 'nói vé data cho Al agent',
    });
  });


  it('repairs recurring Vietnamese OCR substitutions without removing technical terms', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: 'Điến vào chỗ trống để hoàn chinh vòng lặp agent góm 3 bước.',
      options: [{ id: 'A', text: 'Schema thiéu parameters, agent se trả vé lỗi dù data bán.' }],
    })).toMatchObject({
      stem: 'Điền vào chỗ trống để hoàn chỉnh vòng lặp agent gồm 3 bước.',
      options: [{ id: 'A', text: 'Schema thiếu parameters, agent sẽ trả về lỗi dù data bẩn.' }],
    });
  });


  it('repairs clear OCR misspellings in technical question wording', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: "Engineer implement agent. Cán tim sản phẩm; thừ tăng temperature không fix văn đé.",
      options: [{ id: 'A', text: 'Schema thiéu params nên LLM không hiếu cách dùng tool.' }],
    })).toMatchObject({
      stem: "Engineer implement agent. Cần tìm sản phẩm; thử tăng temperature không fix vấn đề.",
      options: [{ id: 'A', text: 'Schema thiếu params nên LLM không hiểu cách dùng tool.' }],
    });
  });


  it('preserves corrected accents in common OCR phrases', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: 'Policy cü, data bán, cần trả vé lõi.',
      options: [{ id: 'A', text: 'đù trường bắt buộc' }, { id: 'B', text: 'Hiến thị kết quả' }],
    })).toMatchObject({
      stem: 'Policy cũ, data bẩn, cần trả về lỗi.',
      options: [{ id: 'A', text: 'đủ trường bắt buộc' }, { id: 'B', text: 'Hiển thị kết quả' }],
    });
  });


  it('repairs frequent missing or confused Vietnamese accents in OCR', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: 'Engineer cán tim root cause, xãy dựng pipeline và kiềm tra thấy data không đù.',
      options: [{ id: 'A', text: 'Tài liệu cũ và mới đếu được index.' }],
    })).toMatchObject({
      stem: 'Engineer cần tìm root cause, xây dựng pipeline và kiểm tra thấy data không đủ.',
      options: [{ id: 'A', text: 'Tài liệu cũ và mới đều được index.' }],
    });
  });


  it('removes OCR copies of answer placeholders and question counter UI', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: 'Bước [3] là tool output. — [3] = ? Ananer oeshere',
      options: [],
    }).stem).toBe('Bước [3] là tool output. — [3] = ?');
  });


  it('normalizes OCR-confused ReAct blanks and strips appended question counters', () => {
    expect(cleanOcrQuestion({
      sourceType: 'past_exam_transcription',
      stem: 'Loop [I] → [2] → [3]. - [] =? question 20 /85',
      options: [],
    }).stem).toBe('Loop [1] → [2] → [3]. - [1] =?');
  });


  it('restores the two-column matching layout of middle test question 27', () => {
    const result = cleanOcrQuestion({
      id: 'middle_test-027',
      sourceType: 'past_exam_transcription',
      stem: 'Nói mỗi khái niệm ở Cột A với mô tả đúng ở Cột B. Cột A - Khái niệm: Al. Discriminative Al A2. Generative Al A3. Agentic Al A4. LLM| AS. Transformer Cột B - Mô tả: B1. Kiến trúc neural network dùng Self-Attention, nén tảng của các model ngôn ngữ hiện đại B2. Al tự lập kế hoạch và thực thi nhiều bước hành động để đạt mục tiêu (Goal-Plan-Action) B3. Foundation model ngôn ngữ lớn, decoder-only, dự đoán token tiếp theo B4. AI phân loại hoặc dự đoán nhãn từ input (Input-Label)| B5. AI tạo ra nội dung mới: văn bản, ảnh, code (Prompt-Content) Nhập đáp án theo định dạng: A1→B?, A2-B?, A3-B?, A4-B?, A5-B? В8H1==à1',
      options: [],
    });

    expect(result.stem).toContain('Cột A — Khái niệm:\nA1. Discriminative AI\nA2. Generative AI');
    expect(result.stem).toContain('Cột B — Mô tả:\nB1. Kiến trúc neural network');
    expect(result.stem).not.toMatch(/B8H1|Answer goes here/);
  });


  it('restores the line-by-line AI Product Lifecycle ordering question', () => {
    const result = cleanOcrQuestion({
      id: 'middle_test-028',
      sourceType: 'past_exam_transcription',
      stem: 'Sắp xếp các giai đoạn trong AI Product Lifecycle theo đúng thứ tự phát triển sản phẩm. [A] Monitor - theo dõi performance, cost, errors trong production [B] Build & Prototype - xãy dựng MVP agent, lab thực hành [C] Problem Scoping - xác định bài toán kinh doanh, stakeholders, ROI target [D] Test & Evaluate - chạy eval pipeline, đo metrics, tim failure cases [E] Deploy - containerize, CI/CD, release lên production [F] Iterate - cải thiện dựa trên monitoring data và user feedback [C] Data Strategy - xác định nguốn data, chất lượng, privacy, pipeline. Nhập thứ tự đúng theo định dạng: ?-?→?-?-?→?-? В E H ÍE E A 1 0 .',
      options: [],
    });

    expect(result.stem).toContain('[A] Monitor — theo dõi performance, cost, errors trong production\n\n[B] Build & Prototype');
    expect(result.stem).toContain('[G] Data Strategy — xác định nguồn data, chất lượng, privacy, pipeline.');
    expect(result.stem).toContain('Nhập thứ tự đúng theo định dạng: ? → ? → ? → ? → ? → ? → ?');
    expect(result.stem).not.toMatch(/В E H|failure cases.*Build/);
  });

  it('leaves authored questions untouched', () => {
    const question = { sourceType: 'authored', stem: 'nói vé Al' };
    expect(cleanOcrQuestion(question)).toEqual(question);
  });
});
