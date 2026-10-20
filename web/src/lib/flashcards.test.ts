import { describe, expect, it } from 'vitest';
import { loadFlashcardProgress, markFlashcard, selectFlashcards, saveFlashcardProgress } from './flashcards';
import { flashcards } from './flashcardData';
import type { Flashcard, FlashcardProgress } from './flashcards';

const cards: Flashcard[] = [
  { id: 'attention', front: 'Attention là gì?', back: 'Cơ chế gán trọng số liên quan giữa token.', topic: 'LLM', sourceFile: 'cheat-sheet.md' },
  { id: 'rag', front: 'RAG là gì?', back: 'Truy xuất nguồn rồi đưa ngữ cảnh vào mô hình.', topic: 'RAG', sourceFile: 'cheat-sheet.md' },
  { id: 'agent', front: 'Agent là gì?', back: 'Thành phần dùng công cụ để hoàn thành tác vụ.', topic: 'Agents', sourceFile: 'cheat-sheet.md' },
];

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set('k4-flashcard-progress-v1', initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('flashcard progress', () => {
  it('loads a unique set of source-linked cards across the cheat sheet topics', () => {
    expect(flashcards.length).toBeGreaterThanOrEqual(40);
    expect(new Set(flashcards.map(card => card.id)).size).toBe(flashcards.length);
    expect(flashcards.every(card => card.front && card.back && card.topic && card.sourceFile === '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md')).toBe(true);
    expect(new Set(flashcards.map(card => card.topic)).size).toBeGreaterThanOrEqual(8);
  });

  it('starts with empty progress and safely falls back from invalid saved data', () => {
    expect(loadFlashcardProgress(storage())).toEqual({ knownIds: [], reviewIds: [], lastSeenId: null });
    expect(loadFlashcardProgress(storage('{broken'))).toEqual({ knownIds: [], reviewIds: [], lastSeenId: null });
  });

  it('moves a card into one status at a time and records the last seen card', () => {
    const progress: FlashcardProgress = { knownIds: ['rag'], reviewIds: ['attention'], lastSeenId: null };
    const marked = markFlashcard(progress, 'attention', 'known');
    expect(marked).toEqual({ knownIds: ['rag', 'attention'], reviewIds: [], lastSeenId: 'attention' });
  });

  it('puts cards marked for review at the front of the next study queue', () => {
    const progress = markFlashcard({ knownIds: [], reviewIds: [], lastSeenId: null }, 'agent', 'review');
    expect(selectFlashcards(cards, 'all', progress).map(card => card.id)).toEqual(['agent', 'attention', 'rag']);
  });

  it('filters cards by topic and removes known cards from the active study queue', () => {
    const progress: FlashcardProgress = { knownIds: ['attention'], reviewIds: [], lastSeenId: 'attention' };
    expect(selectFlashcards(cards, 'LLM', progress).map(card => card.id)).toEqual([]);
    expect(selectFlashcards(cards, 'all', progress).map(card => card.id)).toEqual(['rag', 'agent']);
    expect(selectFlashcards(cards, 'all', progress, 'known').map(card => card.id)).toEqual(['attention']);
  });

  it('persists and restores progress through local storage', () => {
    const local = storage();
    const progress = markFlashcard(loadFlashcardProgress(local), 'rag', 'review');
    saveFlashcardProgress(local, progress);
    expect(loadFlashcardProgress(local)).toEqual(progress);
  });
});
