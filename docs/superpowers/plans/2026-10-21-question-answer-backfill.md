# One-Time Question Answer Backfill Implementation Plan

> **For agentic workers:** Execute inline in this session. Keep the LLM credential server-side and never print it.

**Goal:** Fill proposed correct option IDs for the 51 currently unanswered objective questions once, persist those proposals in the repository data, and make the built app load them without runtime LLM calls.

**Architecture:** A one-time Node script reads the root `.env`, identifies only unanswered non-essay records, asks the configured OpenAI model for structured option IDs and Vietnamese explanations, validates the full response, and atomically writes a tracked JSON overlay. The question-bank build merges that overlay into the existing bank and keeps answers at `answer_proposed` status; essay records are untouched.

**Tech Stack:** Node.js ESM, existing OpenAI Responses API, JSON Schema output, existing Vite data preparation pipeline.

## Global Constraints

- Target only questions with `type !== 'essay'` and no nonempty `correctAnswers`.
- Preserve all essay records and rubric grading.
- Do not expose `OPENAI_API_KEY` or use a `VITE_*` variable.
- Never overwrite an answer that already exists.
- Reject incomplete, duplicate, or invalid option IDs before writing output.
- Ordinary browser loads must make no LLM request for answer keys.
- Keep generated answers labeled `answer_proposed`, never `expert_verified`.
- Do not add or run tests; validate with dry-run counts and production build only.

---

### Task 1: Merge persisted answer overlay into the bank

**Files:**
- Create: `web/content/answer-key-backfill.json`
- Modify: `web/scripts/build-exam-bank.mjs`

**Interfaces:**
- Overlay format: `{ "answers": [{ "id": string, "correctAnswers": string[], "explanation": string, "confidence": number }] }`.
- Build merger consumes the overlay after authored questions/proposals are applied and before unusable questions are removed; it validates each target and sets `verificationStatus: "answer_proposed"` plus backfill provenance in `reviewerNotes`.

- [x] Add a loader that treats a missing overlay as an empty `answers` array and rejects malformed JSON or duplicate question IDs.
- [x] Validate every overlay ID exists, is non-essay, still lacks an answer key, has unique option IDs, and every proposed answer ID references an existing option.
- [x] Validate single-choice proposals contain exactly one ID and multiple-choice proposals contain at least one ID.
- [x] Merge only validated answer IDs, explanation, proposal status, and reviewer notes; leave evidence/source fields unchanged.
- [x] Run `npm run prepare:data` and inspect the affected records in `web/src/data/exam_bank_seed.json`.

### Task 2: Build and run the one-time LLM backfill command

**Files:**
- Create: `web/scripts/backfill-answer-keys.mjs`
- Modify: `web/package.json`
- Create/update: `web/content/answer-key-backfill.json`

**Interfaces:**
- Command: `npm run backfill:answers`; `npm run backfill:answers -- --dry-run` performs no model request and prints only counts/IDs.
- OpenAI response schema returns exactly one record per submitted question: `{ id, correctAnswers, explanation, confidence }`.

- [x] Read `OPENAI_API_KEY` and `OPENAI_MODEL` from root `.env` using the existing script convention or process environment; fail before a request if either is unset or still a placeholder.
- [x] Load current generated bank data and select only unanswered non-essay questions; skip any IDs already present in the overlay.
- [x] Include the stem, option IDs/text, topic, source labels/files/pages, evidence quote, and existing explanation as inference context; do not include learner data.
- [x] Request structured JSON for all currently targeted questions in one model call, retaining the response only in memory until every item is valid.
- [x] Reject unknown/duplicate/missing question IDs, invalid option IDs, invalid choice cardinality, empty explanations, or confidence outside 0–1; if any batch fails, leave the overlay unchanged.
- [x] Atomically write the complete overlay through a temporary file and rename only after global validation succeeds.
- [x] Run dry-run, then invoke the backfill once; inspect counts, status, choice IDs, explanations, and confidence without printing API credentials.

### Task 3: Build, ship, and confirm static loading

**Files:**
- Build artifacts: generated under `web/src/data/`, `web/public/dataset/`, `web/dist/`, and `web/.vercel/output/`; do not commit generated outputs.

- [x] Run `npm run build` from `web/` and confirm TypeScript/Vite complete successfully.
- [x] Confirm every targeted question is present in the prepared bank with the saved proposal; confirm the 551 essays still have no `correctAnswers` key.
- [x] Confirm the browser application bundle does not add a per-load request for backfill answers; it continues loading the prepared bank.
- [ ] Commit the code and overlay with a descriptive message; push the authorized change to `main`.
- [ ] Run `npx vercel build --prod --yes` and `npx vercel deploy --prebuilt --prod --yes` from `web/` so the production alias uses the prepared dataset.
- [ ] Fetch the production page and confirm it serves the new static bundle successfully.
