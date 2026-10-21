# Quiz Study Mascot Design

## Goal

Add an LLM-powered study mascot to quiz sessions that gives non-spoiling hints and deeper plain-language explanations, while making quiz navigation usable on phone screens.

## User experience

- A small floating mascot button is visible only while a quiz is active.
- Opening it shows two actions: **Gợi ý** and **Giải thích dễ hiểu**.
- Hints can be requested repeatedly. Each hint should guide the learner without stating the answer.
- Explanation is available after the learner selects an MCQ option or enters a written response. It compares the learner's response with the proposed/model answer and explains the concept in everyday Vietnamese, with a concrete example.
- For essay questions, the mascot gives formative feedback rather than claiming an objectively correct score.
- Every response uses the question, available answer/explanation, evidence quote, source label and slide/page metadata when available. If this evidence is insufficient, the mascot says so rather than inventing course facts.
- The mascot has loading, API failure, close and retry states. It is keyboard accessible and usable on touch screens.

## Architecture and privacy

- The browser sends only the current question context and requested action to a local Vite development endpoint.
- A Vite server plugin reads `OPENAI_API_KEY` and `OPENAI_MODEL` from the repository-root `.env`; neither value is exposed to client code, included in request bodies, or committed.
- The server calls the OpenAI Responses API with `store: false`, bounded request size, and action-specific instructions. Hint requests exclude answer keys and existing explanations.
- The feature is for the existing local Vite app. The local endpoint is not part of the static production build.

## Phone layout

- At phone breakpoints, replace the fixed left sidebar with a compact fixed bottom navigation and account for the device safe area.
- Let the quiz and its cards use the full available width; keep long stems and answer choices readable without horizontal scrolling.
- Place the question navigator after the active question on phones so it does not push the question below a long grid.
- Wrap quiz controls cleanly and make the mascot panel fit the viewport, scroll internally, and remain dismissible.

## Error behavior

- Missing key/model, network failure, throttling, and provider errors produce a short Vietnamese message with a retry action; the learner can continue the quiz.
- The backend accepts only `hint` and `explain` actions and caps incoming text sizes.

## Acceptance criteria

1. A learner can ask for a hint without receiving the answer key in the hint request.
2. After answering, a learner can request an accessible, source-grounded explanation.
3. The API key remains server-side in `.env` and is absent from browser bundles and git changes.
4. Desktop quiz navigation remains intact.
5. At phone widths, the quiz occupies the viewport width, navigation no longer consumes a fixed left rail, the active question appears before the question navigator, and the mascot can be used without horizontal overflow.
6. `npm run build` succeeds. No automated tests are added or run for this change.
