# Exam Bank and Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add 20 fixed 85-question exams and a local flashcard study flow, bringing the exam list to 22 forms.

**Architecture:** Extend the existing typed local question bank with 20 immutable exam manifests and source-backed question records. Add a separate flashcard model and local progress helper, then connect both features to the existing React sidebar and scrollable app shell.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, existing local JSON data and localStorage.

## Global Constraints

- Keep the two existing forms: `exam-01` remains `middle_test`; `exam-02` remains the `vinunitest` expansion.
- Each new form has exactly 85 questions: 60 MCQ and 25 essay.
- No pair of exam forms may share more than 20% of question IDs.
- New MCQ answers remain `answer_proposed` and include source paths and evidence quotes.
- Essay responses are stored as text and are never automatically graded.
- Flashcard progress stays in this browser's localStorage; do not add a backend or remote service.
- Source material stays local and is not uploaded.

## File Structure

- `web/src/lib/examBank.ts`: existing exam selection, deduplication, and overlap validation.
- `web/src/lib/examBank.test.ts`: exact exam count, balance, and overlap cases.
- `web/src/lib/examData.ts` and `web/src/lib/examData.test.ts`: typed access and source-backed assertions for the full 22-exam dataset.
- `web/src/lib/flashcards.ts` and `web/src/lib/flashcards.test.ts`: flashcard shape, topic and status filtering, and local progress operations.
- `web/src/App.tsx`: exam listing/start, Flashcards sidebar route, and flashcard controls.
- `web/src/App.css`: exam list and flashcard layout in the current viewport-scrolling shell.
- `web/src/data/exam_bank_seed.json`: ignored local question and exam-set data generated from the supplied source corpus; copied to `web/public/dataset/05_data/` for runtime fetch.
- `web/content/flashcards.json`: curated flashcards drawn from the supplied cheat sheet.
- `web/scripts/prepare-data.mjs`: copy the local generated bank and flashcard seed into the app data directory before dev/build/test.
- `web/README.md`: explain the 22 forms, source status, and local flashcard progress.

## Task 1: Create 20 Additional Fixed Exams

**Files:**
- Modify: `web/src/lib/examBank.ts`
- Modify: `web/src/lib/examBank.test.ts`
- Modify: `web/src/lib/examData.ts`
- Modify: `web/src/lib/examData.test.ts`
- Generate: `web/src/data/exam_bank_seed.json` through the deterministic data-building script
- Create: `web/scripts/build-exam-bank.mjs`

**Interfaces:**
- `buildExamSet(questions, options, existingSets, limits)` returns one `ExamSet` or throws if question counts, duplicate stems, or overlap limits fail.
- The data builder reads `AI_Thuc_Chien_K4_Midterm/05_data/knowledge_chunks.jsonl` and `06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md`, and writes a reproducible local seed JSON with `questions` and `examSets`; the original supplied dataset is not modified.
- Each generated question preserves `sourceFiles`, `evidenceQuote`, and `verificationStatus: 'answer_proposed'` when it has a proposed MCQ answer.

- [x] **Step 1: Add failing tests for 22 fixed forms.** Assert there are exactly 22 forms, IDs `exam-01` through `exam-22`, forms 03–22 contain 85 IDs, 60 objective questions and 25 essays, and no pair exceeds 20% shared question IDs.
- [x] **Step 2: Add failing data provenance tests.** Assert every newly proposed MCQ has a local source path and non-empty evidence quote; all question IDs resolve; no generated essay has auto-grade answers.
- [x] **Step 3: Run focused tests and confirm they fail for the missing forms.** Run `npm test -- --run src/lib/examData.test.ts src/lib/examBank.test.ts` from `web/`.
- [x] **Step 4: Extend the builder to generate distinct supported question variants.** Extract distinct local excerpts from the supplied cheat sheet and course text, then create 60 source-topic/continuation MCQs and 25 rubric-based typed-answer prompts per form. Assign deterministic IDs and evidence quotes, and reject normalized duplicate stems before assembling forms. Keep source transcriptions unchanged.
- [x] **Step 5: Assemble exams 03–22 and assert overlap before writing output.** Use the seeded random order in the builder so reruns produce the same JSON. Do not write partial output if any exam cannot satisfy the requested count or overlap limit.
- [x] **Step 6: Run the focused tests and verify all 22 forms and provenance constraints pass.**

## Task 2: Add Local Flashcard Data and Progress Logic

**Files:**
- Create: `web/src/lib/flashcards.ts`
- Create: `web/src/lib/flashcards.test.ts`
- Create: `web/content/flashcards.json`
- Modify: `web/scripts/prepare-data.mjs`

**Interfaces:**
- `Flashcard` contains `id`, `front`, `back`, `topic`, and `sourceFile`.
- `FlashcardProgress` stores `knownIds`, `reviewIds`, and `lastSeenId`.
- `loadFlashcardProgress(storage)` safely reads the namespaced key and defaults to empty progress.
- `markFlashcard(progress, id, status)` moves the card exclusively into either known or review state.
- `selectFlashcards(cards, topic, progress, mode)` filters by topic/status and puts cards marked for review first.

- [x] **Step 1: Write failing tests for progress defaults, mutually exclusive status updates, topic filtering, review-first ordering, and catalogue source links.**
- [x] **Step 2: Run `npm test -- --run src/lib/flashcards.test.ts` and confirm it fails because the flashcard module is missing.**
- [x] **Step 3: Implement the pure flashcard model and localStorage adapter with no UI dependencies.**
- [x] **Step 4: Create 45 concise cards from key cheat sheet sections.** Every card must quote or accurately summarize the local cheat sheet and link the file path; keep the original source wording in `back` where terminology matters.
- [x] **Step 5: Update `prepare-data.mjs` to copy `flashcards.json` into `src/data/flashcards.json`.**
- [x] **Step 6: Run focused flashcard tests and confirm local progress behavior passes.**

## Task 3: Connect Exam and Flashcard Screens

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`
- Modify: `web/README.md`

**Interfaces:**
- The sidebar routes to `exams` and `flashcards` pages.
- The exam screen asynchronously loads the local 3.4 MB bank asset, lists 22 fixed forms, and starts the selected exam without regenerating question order.
- The flashcard screen supports reveal/hide, previous/next, topic filter, “Nhớ rồi”, and “Ôn lại” actions.
- Flashcard status is restored from `k4-flashcard-progress-v1` after reload.

- [x] **Step 1: Keep catalogue tests in `flashcards.test.ts` and the 22-form tests in `examData.test.ts`; assert source-linked cards, queue status, saved progress, exam totals, and overlap.**
- [x] **Step 2: Run `npm test -- --run src/lib/flashcards.test.ts src/lib/examData.test.ts` and confirm all data and state behavior passes before wiring the screen.**
- [x] **Step 3: Add the Flashcards sidebar item and build its card view using existing page/card/button styles.** Add accessible labels for flip, previous, next, topic filter, known, and review controls.
- [x] **Step 4: Show all 22 exam forms and keep each start button bound to its fixed `ExamSet`.** Show “Đề xuất” for generated answers and “Chưa xác minh” for the two prior forms where appropriate.
- [x] **Step 5: Update README with form composition, answer-status meanings, and local flashcard progress storage.**
- [x] **Step 6: Run `npm test`, `npm run build`, and `npm run lint` from `web/`.**
- [x] **Step 7: Verify both screens in a real browser at desktop and narrow viewport widths; check console, keyboard navigation, and scroll behavior.**

## Self-Review

- Spec coverage: exam count, 85-question composition, overlap, evidence and answer status, flashcard study actions, local persistence, source privacy, and tests each map to the tasks above.
- The two independent tracks are separated into data/logic (Tasks 1 and 2) and integrated only in the UI task (Task 3).
- No API calls, backend, or remote data transfer are introduced.
- Output is reproducible: exam generation uses deterministic IDs and a seeded ordering before creating the fixed manifests.
