# Quiz Study Mascot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-grounded LLM hints and plain-language answer explanations in quiz sessions, with responsive phone navigation.

**Architecture:** A local Vite server plugin exposes a bounded `/api/quiz-coach` endpoint and reads OpenAI credentials only from repository-root `.env`. A focused React mascot component calls that endpoint with action-specific context; `ExamView` hosts it and keeps answer/explanation semantics. CSS changes turn the phone sidebar into a bottom navigation and reorder the quiz question navigator below the active question.

**Tech Stack:** React 19, TypeScript, Vite 8 server middleware, OpenAI Responses API, existing CSS variables and lucide-react icons.

## Global Constraints

- Never expose `OPENAI_API_KEY` or `OPENAI_MODEL` to the browser or git.
- Use `store: false` for Responses API calls.
- Hint requests must omit answer keys and answer explanations.
- Do not claim essay answers have objective grades.
- Keep the mascot inside active quiz sessions only.
- Do not add or run automated tests; verify with `npm run build`.

---

### Task 1: Local quiz coach endpoint

**Files:**
- Create: `web/server/quizCoach.ts`
- Modify: `web/vite.config.ts`

**Interfaces:**
- Accept POST `/api/quiz-coach` JSON `{ action: 'hint' | 'explain'; question: { stem: string; options: {id:string;text:string}[]; topic: string; evidenceQuote: string; sourceLabel?: string; sourceFiles: string[]; sourcePages: number[] }; answer?: { selectedTexts: string[]; answerText: string; correctAnswerText: string; explanation: string } }`.
- Return JSON `{ text: string }`, or a short structured error.

- [ ] Implement a Vite `configureServer` middleware that loads the repo-root `.env` on the server, validates action and input size, and calls Responses API with `store:false`.
- [ ] For `hint`, construct the model context without `answer` fields and explicitly forbid stating the solution; for `explain`, include the learner response and available proposed/model guidance, request plain Vietnamese with an example and evidence caveat.
- [ ] Return safe Vietnamese errors for missing configuration, provider errors and malformed requests; never include the key in logs or responses.

### Task 2: Quiz mascot component

**Files:**
- Create: `web/src/components/QuizStudyMascot.tsx`
- Create: `web/src/lib/quizCoach.ts`
- Modify: `web/src/App.tsx`

**Interfaces:**
- `requestQuizCoach(payload: QuizCoachRequest): Promise<{text:string}>` posts to `/api/quiz-coach`.
- `QuizStudyMascot` receives the active `Question`, selected option text, written answer, and availability of answer guidance.

- [ ] Add a typed browser client for the local endpoint and safe error decoding.
- [ ] Add an accessible floating mascot control with a compact panel, **Gợi ý** and **Giải thích dễ hiểu** actions, incremental hints, loading/error/retry states, and internal scrolling.
- [ ] Enable explanation only after the learner selects an option or writes an answer; preserve hint access before answering.
- [ ] Mount the mascot in `ExamView` and provide only fields needed by the chosen action.

### Task 3: Responsive quiz layout and local setup notes

**Files:**
- Modify: `web/src/App.css`
- Modify: `web/README.md`

- [ ] At phone widths, make `.app-shell` and `.main-area` full width, turn `.sidebar` into a safe-area-aware fixed bottom nav, and hide desktop-only sidebar content.
- [ ] Reorder `.exam-sidebar` after the active question on phones, constrain question/answer cards to viewport width, and allow quiz controls to wrap without clipping.
- [ ] Style the floating mascot and panel for desktop and phone widths; on phones constrain panel height to the viewport and allow its content to scroll.
- [ ] Document that mascot requests require network access, use the existing root `.env`, and run only under the local Vite development server.
- [ ] Run `npm run build` from `web/` and inspect the final diff to ensure `.env` and credential values are absent.
