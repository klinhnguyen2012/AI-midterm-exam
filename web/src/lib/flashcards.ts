export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  sourceFile: string;
}

export interface FlashcardProgress {
  knownIds: string[];
  reviewIds: string[];
  lastSeenId: string | null;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'k4-flashcard-progress-v1';
const emptyProgress = (): FlashcardProgress => ({ knownIds: [], reviewIds: [], lastSeenId: null });

export function loadFlashcardProgress(storage: KeyValueStorage): FlashcardProgress {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return emptyProgress();
    const parsed = JSON.parse(value) as Partial<FlashcardProgress>;
    if (!Array.isArray(parsed.knownIds) || !parsed.knownIds.every(id => typeof id === 'string') ||
        !Array.isArray(parsed.reviewIds) || !parsed.reviewIds.every(id => typeof id === 'string') ||
        !(parsed.lastSeenId === null || typeof parsed.lastSeenId === 'string')) return emptyProgress();
    return { knownIds: parsed.knownIds, reviewIds: parsed.reviewIds, lastSeenId: parsed.lastSeenId };
  } catch {
    return emptyProgress();
  }
}

export function saveFlashcardProgress(storage: KeyValueStorage, progress: FlashcardProgress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markFlashcard(progress: FlashcardProgress, id: string, status: 'known' | 'review'): FlashcardProgress {
  const knownIds = progress.knownIds.filter(cardId => cardId !== id);
  const reviewIds = progress.reviewIds.filter(cardId => cardId !== id);
  if (status === 'known') knownIds.push(id);
  else reviewIds.push(id);
  return { knownIds, reviewIds, lastSeenId: id };
}

export function selectFlashcards(cards: Flashcard[], topic: string, progress: FlashcardProgress, mode: 'study' | 'known' = 'study'): Flashcard[] {
  const known = new Set(progress.knownIds);
  const review = new Set(progress.reviewIds);
  return cards
    .filter(card => (topic === 'all' || card.topic === topic) && (mode === 'known' ? known.has(card.id) : !known.has(card.id)))
    .sort((first, second) => Number(review.has(second.id)) - Number(review.has(first.id)));
}
