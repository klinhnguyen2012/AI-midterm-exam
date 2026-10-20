# Unified Check sheet Implementation Plan

> **For agentic workers:** Execute inline in this session with the executing-plans skill. Steps use checkbox syntax for tracking.

**Goal:** Merge the source library and structured cheat sheet into one Day-based Check sheet page with concise per-item source labels.

**Architecture:** Keep the existing Library page as the single shell for Day selection, slide text, Notion, and search. Add a pure mapping module that attaches each parsed cheat item to an appropriate course day and slide, and render the selected day's items inside the existing day view.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing Markdown parser, local slide manifest and extracted slide text.

## Global Constraints

- Keep all supplied data local; do not add network services or a backend.
- Preserve the existing cheat sheet content and source-library controls.
- Show source provenance on every cheat item; use **Tổng hợp** or **Đề khóa trước** where a slide is not the true source.
- Do not expose original exam images on the website.

---

### Task 1: Map cheat-sheet items to sources

**Files:**
- Create: `web/src/lib/checkSheet.ts`
- Create: `web/src/lib/checkSheet.test.ts`
- Reuse: `web/src/lib/cheatsheet.ts`
- Input data: `web/public/dataset/05_data/slide_manifest.json`

**Interfaces:**
- Consumes parsed `CheatSection[]` and slide manifest entries `{ day, name, text_path }`.
- Produces `getCheckSheetForDay(sections, day, slides)`, an array of sections with only that day's children; each child includes a concise `sourceLabel` and optional `sourcePath`.

- [x] Write failing tests: each parsed child receives provenance, Day 8 selects RAG items, unrelated items do not appear, and source links use the selected day's extracted text path.
- [x] Run `npm test -- --run src/lib/checkSheet.test.ts` and confirm the expected missing-module failure.
- [x] Implement explicit topic-to-day rules for the 14 existing section types, with child-level routing for cross-topic sections.
- [x] Use the day's slide manifest entry as the source label/link. Use **Tổng hợp** and **Đề khóa trước** for non-slide content.
- [x] Run focused tests, then commit the mapping and tests.

### Task 2: Consolidate navigation and render the day cheat sheets

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`
- Reuse: existing Day picker, lesson outline, day map, parsed Markdown, and source manifest fetch.

**Interfaces:**
- `Library` becomes the single `CheckSheetPage` view and consumes parsed cheat sheet sections plus slides.
- Sidebar uses one `library` route labeled **Check sheet**. Dashboard links to the same route.
- The selected Day view includes a compact, expandable cheat-sheet outline; each child shows its source label beside the title and its text source when expanded.

- [x] Update route and sidebar tests or add focused source assertions for one sidebar entry and the merged page label.
- [x] Remove the independent `CheatSheet` route/component and use the Markdown already fetched by the unified page.
- [x] Render only selected-day children; keep Notion, search, day completion, and course material navigation working.
- [x] Add compact responsive styles that follow existing `.lesson-outline`, `.lesson-item`, and `.major-section` tokens.
- [x] Run tests, lint, build; inspect the page at desktop and 390px width.

### Task 3: Update documentation and verify source exposure

**Files:**
- Modify: `web/README.md`
- Modify: `web/INGESTION_GUIDE.md`

- [x] Describe the unified Check sheet and per-item source labels.
- [x] Confirm original exam images remain absent from `public/dataset` and `dist`.
- [x] Run the full test suite, lint, and build; commit the implementation.
