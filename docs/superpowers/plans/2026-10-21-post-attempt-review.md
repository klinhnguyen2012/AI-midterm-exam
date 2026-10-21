# Post Attempt Review Implementation Plan

> **For agentic workers:** Execute inline task by task. Steps use checkbox syntax for tracking.

**Goal:** Hiển thị sau mỗi lần nộp bài phần tổng hợp câu sai, nguyên nhân và kiến thức cần ôn, rồi lưu báo cáo cùng attempt.

**Architecture:** Thêm hàm tổng hợp báo cáo phía client từ attempt, question bank và essay grades; mở rộng quiz coach hiện có để nhận action tổng hợp một lần mỗi attempt. Lưu kết quả có cấu trúc vào local storage cùng attempt và hiển thị trong ExamView, có nội dung dự phòng từ giải thích sẵn có khi API lỗi.

**Tech Stack:** React 19, TypeScript, Vite, Vercel API function, OpenAI Responses API, localStorage.

## Global Constraints

- Điểm số không được thay đổi bởi báo cáo AI.
- Chỉ yêu cầu phân tích sau khi người học nộp bài; không gọi AI khi tải lại attempt.
- Lưu báo cáo trong attempt hiện có trên localStorage.
- Không gửi câu đúng vào phần phân tích từng câu; tập trung câu sai, bỏ trống, và tự luận mất điểm.
- Giữ fallback dùng explanation, commonTraps, conceptToReview, essay feedback có sẵn.

---

### Task 1: Define report data and deterministic fallback

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/quiz.ts`

- [ ] Add typed `AttemptReviewReport` and per-question insight structures; add optional `reviewReport` to `Attempt`.
- [ ] Add a pure helper that identifies wrong/blank objective questions and partial essays and builds a fallback report from existing question metadata and essay-grade feedback.
- [ ] Preserve topic grouping and avoid treating unverified objective keys as wrong.

### Task 2: Add one-request quiz-coach review action

**Files:**
- Modify: `web/src/lib/quizCoach.ts`
- Modify: `server/quizCoach.ts`

- [ ] Add a structured `review_attempt` request and response contract.
- [ ] Validate the report fields, supported question IDs, bounded text lengths, and exclude correct questions from generated per-question insights.
- [ ] Prompt the model to explain only against the supplied answer key, rubric, explanation, and learner response; never change score or answer correctness.
- [ ] Return a clear failure so the client retains and displays the deterministic fallback.

### Task 3: Persist and render review after submission

**Files:**
- Modify: `web/src/App.tsx`

- [ ] On submit, calculate and persist the fallback first, then request one AI report for the current attempt.
- [ ] Merge asynchronous essay grading and AI review updates without overwriting each other.
- [ ] Reuse saved `reviewReport` on reload and show loading/error/fallback states in the result area.
- [ ] Show each reviewed question, learner answer, correct answer/reference, explanation of gap, and grouped prioritized topics.

### Task 4: Verify

**Files:**
- No additional files.

- [ ] Run the project build and lint checks; inspect browser interaction for practice submit, timed exam submit, AI failure fallback, and restored attempt report.
- [ ] Confirm the score shown before and after AI analysis is unchanged.
