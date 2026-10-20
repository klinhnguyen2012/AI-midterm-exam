import { describe, expect, it } from 'vitest';
import { getCheckSheetForDay } from './checkSheet';
import { parseCheatSheet } from './cheatsheet';
import source from '../data/cheat-sheet.md?raw';

const slides = [
  { day: 8, name: 'Day 8.1 - RAG Pipeline.pdf', text_path: '04_extracted_slide_text/day8.md' },
  { day: 10, name: 'Day 10 - Data Pipeline & Data Observability.pdf', text_path: '04_extracted_slide_text/day10.md' },
  { day: 11, name: 'Day 11.1 - Guardrails, HITL & Responsible AI.pdf', text_path: '04_extracted_slide_text/day11.md' },
  { day: 14, name: 'Day 14.1 - AI Evaluation & Benchmarking.pdf', text_path: '04_extracted_slide_text/day14.md' },
];

describe('day-based check sheet', () => {
  it('shows the RAG quick sheet on Day 8 with a compact link to the matching slide text', () => {
    const sections = parseCheatSheet('## 5. RAG pipeline and retrieval\n\n- **RAG:** Retrieve relevant source text.');
    const day8 = getCheckSheetForDay(sections, 8, slides);

    expect(day8).toHaveLength(1);
    expect(day8[0].children[0]).toMatchObject({
      sourceLabel: 'Day 8 · RAG Pipeline',
      sourcePath: '04_extracted_slide_text/day8.md',
    });
    expect(getCheckSheetForDay(sections, 14, slides)).toEqual([]);
  });

  it('routes cross-topic production items to their matching course days', () => {
    const sections = parseCheatSheet('## 11. Production, Data, Monitoring & AI Safety\n\n- **Guardrails:** validate inputs.\n- **Data pipeline:** ingest and clean.');

    expect(getCheckSheetForDay(sections, 11, slides)[0].children[0].sourceLabel).toContain('Day 11');
    expect(getCheckSheetForDay(sections, 10, slides)[0].children[0].sourceLabel).toContain('Day 10');
  });

  it('labels synthesized and previous-exam notes without pretending they came from a slide', () => {
    const overview = parseCheatSheet('## 0. Bản đồ chủ đề / độ ưu tiên\n\n- **P0:** High priority.');
    const oldExamNote = parseCheatSheet('## 12. 12 bẫy trắc nghiệm phổ biến\n\n1. Dấu tick trên ảnh đề cũ không phải đáp án chuẩn.');

    expect(getCheckSheetForDay(overview, 1, slides)[0].children[0].sourceLabel).toBe('Tổng hợp');
    expect(getCheckSheetForDay(oldExamNote, 1, slides)[0].children[0].sourceLabel).toBe('Đề khóa trước');
  });

  it('provides provenance for every child in the complete supplied cheat sheet', () => {
    const sections = parseCheatSheet(source);
    const allSlides = Array.from({ length: 28 }, (_, index) => ({
      day: index + 1,
      name: `Day ${index + 1} - Source slides.pdf`,
      text_path: `04_extracted_slide_text/day-${index + 1}.md`,
    }));
    const allDays = Array.from({ length: 28 }, (_, index) => index + 1)
      .flatMap(day => getCheckSheetForDay(sections, day, allSlides));

    expect(allDays.flatMap(section => section.children)).toHaveLength(sections.reduce((total, section) => total + section.children.length, 0));
    expect(allDays.flatMap(section => section.children).every(child => child.sourceLabel.length > 0)).toBe(true);
  });
});
