import { describe, expect, it } from 'vitest';
import { parseCheatSheet } from './cheatsheet';
import source from '../data/cheat-sheet.md?raw';

describe('structured cheat sheet', () => {
  it('groups markdown sections and derives child headings from existing labels', () => {
    const result = parseCheatSheet('# Notes\n\n> Source note\n\n## 1. Foundations\n\n- **AI:** systems that do tasks.\n- **ML:** learns from data.\n\n**Trap:** rules still matter.\n\n## 2. Metrics\n\nPrecision formula.');
    expect(result.map(section => section.title)).toEqual(['1. Foundations', '2. Metrics']);
    expect(result[0].children.map(child => child.title)).toEqual(['AI', 'ML', 'Trap']);
    expect(result[0].children[0].body).toContain('systems that do tasks');
  });

  it('uses table labels and numbered items as expandable child sections', () => {
    const result = parseCheatSheet('## 12. Common traps\n\n1. First trap with reason.\n2. Second trap.\n\n## 13. Formula table\n\n| Metric | Formula |\n|---|---|\n| Precision | TP / (TP + FP) |');
    expect(result[0].children.map(child => child.title)).toEqual(['First trap with reason.', 'Second trap.']);
    expect(result[1].children.map(child => child.title)).toEqual(['Tóm tắt', 'Precision']);
  });
  it('preserves all fourteen source sections and gives each a navigable outline', () => {
    const result = parseCheatSheet(source);
    expect(result).toHaveLength(14);
    expect(result.every(section => section.children.length > 0)).toBe(true);
  });
});
