# AI Thực Chiến K4 — Midterm practice

A local Vietnamese practice app built with React, TypeScript, and Vite. The app has no login or backend. Question data, bookmarks, drafts, and attempts stay in this browser's local storage.

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

No source document is sent to an API. The knowledge search fetches and searches the local JSONL only when the user opens that search tab.

The production `dist/` output includes the text library files so the static app can browse them. Review course source usage before publishing the bundle.

## Question format

Question data lives outside React components. See `src/lib/types.ts` and the sample bank at `src/data/quiz_seed_mock_01.json`. JSON import accepts either an array or `{ "questions": [...] }`. CSV import/export uses the full question schema, with arrays and options encoded as JSON strings inside CSV cells. Invalid question shapes are rejected and duplicate IDs are skipped.

Local storage keys use the `k4-` prefix. Attempts at `k4-attempts` are migrated to `k4-attempts-v1` on first load.

## Exam bank and flashcards

The local exam bank contains 22 fixed forms. Exams 01 and 02 use the two supplied sets. Exams 03–22 each contain 85 questions (60 MCQ and 25 typed-answer prompts) assembled from local course excerpts. Their MCQs ask learners to match a cited excerpt to its course topic or identify its source continuation; stems are distinct and generated question IDs are not reused across added forms. MCQ answer keys are proposals and remain unverified; essay prompts include a self-review rubric and are not scored automatically. Treat these added forms as practice material, not official exams.

The sidebar Flashcard page contains 45 concept cards based on the cheat sheet. Flip each card, filter by topic, mark it “Nhớ rồi” or “Ôn lại”, and return to saved cards from the “Đã nhớ” tab. Progress stays in this browser under `k4-flashcard-progress-v1`.

## Check sheet

The sidebar's **Check sheet** page combines the former source library and cheat sheet. Select a Day to see its slide text and only the matching compact review topics. Expand a topic and item to read the existing cheat-sheet notes. Each item shows a small source label such as `Day 8 · RAG Pipeline`; the label links to that day's extracted slide text. Synthesized overviews and notes from previous exams are marked `Tổng hợp` or `Đề khóa trước` rather than attributed to a slide.
