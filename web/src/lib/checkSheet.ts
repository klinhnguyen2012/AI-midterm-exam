import type { CheatChild, CheatSection } from './cheatsheet';

export interface CheckSheetSlide {
  day: number;
  name: string;
  text_path: string;
}

export interface CheckSheetChild extends CheatChild {
  sourceLabel: string;
  sourcePath?: string;
}

export interface CheckSheetSection extends Omit<CheatSection, 'children'> {
  children: CheckSheetChild[];
}

interface Provenance {
  day: number;
  label?: 'Tổng hợp' | 'Đề khóa trước';
}

function getProvenance(section: CheatSection, child: CheatChild): Provenance {
  const text = `${child.title} ${child.body}`.toLocaleLowerCase('vi');
  const sectionId = section.id;
  const contains = (...terms: string[]) => terms.some(term => text.includes(term));

  if (sectionId.startsWith('0-')) return { day: 1, label: 'Tổng hợp' };
  if (sectionId.startsWith('1-') || sectionId.startsWith('2-')) return { day: 1 };
  if (sectionId.startsWith('3-')) return { day: 4 };
  if (sectionId.startsWith('4-')) return { day: contains('multi-agent', 'orchestrator', 'supervisor', 'mcp', 'a2a') ? 9 : 3 };
  if (sectionId.startsWith('5-')) return { day: 8 };
  if (sectionId.startsWith('6-')) return { day: contains('benchmark', 'production', 'human evaluation') ? 27 : 14 };
  if (sectionId.startsWith('7-')) return { day: contains('golden', 'dataset', 'drift') ? 7 : 14 };
  if (sectionId.startsWith('8-')) {
    if (contains('human-centered', 'human centered', 'ux', 'experiment', 'prototype', 'interview')) return { day: 18 };
    if (contains('mvp', 'roadmap', 'product manager', 'requirement', 'stakeholder')) return { day: 6 };
    return { day: 2 };
  }
  if (sectionId.startsWith('9-')) return { day: contains('growth', 'north star', 'nsm') ? 23 : 20 };
  if (sectionId.startsWith('10-')) return { day: contains('gtm', 'go-to-market', 'go to market') ? 22 : 24 };
  if (sectionId.startsWith('11-')) {
    if (contains('legal', 'law', 'luật', 'governance', 'ethic', 'ethics')) return { day: 21 };
    if (contains('guardrail', 'hitl', 'human approval', 'responsible ai')) return { day: 11 };
    if (contains('deploy', 'cloud', 'rollback')) return { day: 12 };
    if (contains('monitor', 'observability', 'logging', 'latency', 'throughput', 'drift')) return { day: 13 };
    return { day: 10 };
  }
  if (sectionId.startsWith('12-')) {
    if (contains('dấu tick', 'tick trên ảnh', 'ảnh đề cũ')) return { day: 1, label: 'Đề khóa trước' };
    if (contains('top-p', 'temperature', 'token')) return { day: 1 };
    if (contains('prompt injection', 'tool', 'backend', 'permission')) return { day: 4 };
    if (contains('agent', 'workflow', 'mcp')) return { day: 3 };
    if (contains('vector', 'rag', 'faithfulness', 'retrieval')) return { day: 8 };
    if (contains('accuracy', 'recall', 'precision', 'false negative', 'false positive')) return { day: 14 };
    if (contains('roi')) return { day: 24 };
    if (contains('engagement', 'retention', 'user')) return { day: 20 };
    return { day: 1, label: 'Tổng hợp' };
  }
  if (sectionId.startsWith('13-')) {
    if (contains('top-p', 'token api')) return { day: 1 };
    if (contains('retrieval', 'precision@', 'recall@', 'f1', 'accuracy')) return { day: 14 };
    if (contains('cosine', 'embedding')) return { day: 8 };
    if (contains('roi', 'gross margin', 'cost')) return { day: 24 };
    if (contains('activation', 'retention')) return { day: 20 };
    return { day: 14 };
  }
  return { day: 1, label: 'Tổng hợp' };
}

export function getCheckSheetForDay(
  sections: CheatSection[],
  day: number,
  slides: CheckSheetSlide[],
): CheckSheetSection[] {
  return sections.flatMap(section => {
    const children = section.children.flatMap(child => {
      const provenance = getProvenance(section, child);
      if (provenance.day !== day) return [];
      if (provenance.label) return [{ ...child, sourceLabel: provenance.label }];

      const slide = slides.find(item => item.day === day);
      const slideName = slide?.name.replace(/\.pdf$/i, '') || 'Slide ôn tập';
      return [{
        ...child,
        sourceLabel: `Day ${day} · ${slideName.replace(/^Day \d+(?:\.\d+)?\s*[-–]\s*/i, '')}`,
        ...(slide?.text_path ? { sourcePath: slide.text_path } : {}),
      }];
    });
    return children.length ? [{ ...section, children }] : [];
  });
}
