# AI Thực Chiến K4 — Midterm practice

A local Vietnamese practice app built with React, TypeScript, and Vite. Question data, bookmarks, drafts, and attempts stay in this browser's local storage. The local Vite development server also provides a small server-side endpoint for the optional study mascot.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To check the production bundle and unit tests:

```sh
npm run build
npm test
```

## Dataset included

The Lite pack has 3 Notion Markdown exports, 184 past exam images, 65 slide metadata entries with extracted text, 4,481 knowledge chunks, one cheat sheet, and 10 assistant-authored mock questions. It does not include the original slide PDFs. The app shows extracted slide text and labels it as unverified extraction. Past exam images stay in the local source folder and are never copied to the app's public files or production bundle.

The ten seed items have proposed answers and explanations for mock practice. They are not expert verified or official exam questions. Mock scores are clearly labeled; only `expert_verified` answers count as verified results. Questions with no answer stay pending instead of counting as wrong.

## Local data folders

- `../AI_Thuc_Chien_K4_Midterm/` is the extracted, user-supplied Lite dataset.
- `public/dataset/` contains only the text and manifests needed by the app. Past exam image files and their manifest are excluded.
- `src/data/` has the seed bank and cheat sheet used by the app.

The app reads and searches its local dataset in the browser. The study mascot sends the current question, its available source excerpt, and (for explanations) the learner's answer to the OpenAI API when the learner explicitly requests a hint or explanation. The request goes through the local Vite server; the API key stays in the repository-root `.env` and is never sent to the browser. Hint requests omit answer keys and existing explanations. OpenAI requests use `store: false`; network access and API usage may incur charges. The explicit `generate:exam-bank` command also sends selected slide text to OpenAI for question generation.

The mascot endpoint is available only through `npm run dev` from `web/`; it is not included in the static production build. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the root `.env` before using it.

The production `dist/` output includes the text library files so the static app can browse them. Review course source usage before publishing the bundle.

## Question format

Question data lives outside React components. See `src/lib/types.ts` and the sample bank at `src/data/quiz_seed_mock_01.json`. JSON import accepts either an array or `{ "questions": [...] }`. CSV import/export uses the full question schema, with arrays and options encoded as JSON strings inside CSV cells. Invalid question shapes are rejected and duplicate IDs are skipped.

Local storage keys use the `k4-` prefix. Attempts at `k4-attempts` are migrated to `k4-attempts-v1` on first load.

## Exam bank and flashcards

The local exam bank has twenty complete forms: Exam 01 uses `middle_test`; Exam 02 uses `vinunitest`; Exams 03–10 are generated from the supplied slides; Exams 11–20 each cover Day 1–28. Generated forms have 60 MCQ and 25 essay questions, proposed answers, explanations, and slide/page citations. Generated answers stay marked as proposals pending review. Original exam images are excluded from the app's public dataset.

The sidebar Flashcard page contains 45 concept cards based on the cheat sheet. Flip each card, filter by topic, mark it “Nhớ rồi” or “Ôn lại”, and return to saved cards from the “Đã nhớ” tab. Progress stays in this browser under `k4-flashcard-progress-v1`.

## Check sheet

The sidebar's **Check sheet** page combines the former source library and cheat sheet. Select a Day to see its slide text and only the matching compact review topics. Expand a topic and item to read the existing cheat-sheet notes. Each item shows a small source label such as `Day 8 · RAG Pipeline`; the label links to that day's extracted slide text. Synthesized overviews and notes from previous exams are marked `Tổng hợp` or `Đề khóa trước` rather than attributed to a slide.
# Tạo thêm đề từ slide

Đề 03–10 được tạo cục bộ từ các slide theo từng cụm ngày học. Đề 11–20 phủ Day 1–28 trong từng đề, mỗi đề có 60 câu trắc nghiệm và 25 câu tự luận; câu hỏi phải tự đủ bối cảnh, có đáp án/gợi ý, giải thích và trích dẫn slide. Ảnh đề gốc không được đưa vào website.

1. Điền `OPENAI_API_KEY` và `OPENAI_MODEL` trong `.env` ở thư mục gốc repo. Không gửi API key qua chat hoặc đưa vào biến `VITE_*`.
2. Từ `web/`, chạy `npm run generate:exam-bank` để sinh các đề theo nhóm ngày; chạy `npm run generate:comprehensive-exams` để sinh Đề 11–20 phủ Day 1–28 trong từng đề. Lệnh có checkpoint cục bộ để tiếp tục nếu bị ngắt.
3. Chạy `npm run prepare:data` để ghép dữ liệu vào bản app local.

Trình sinh kiểm tra số lượng/cơ cấu câu, câu trùng chính xác, phương án đúng, và trích dẫn phải khớp nguyên văn với slide. Đáp án được gắn trạng thái đề xuất để phân biệt với đáp án đã xác minh.
