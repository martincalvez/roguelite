import { describe, expect, it } from 'vitest';
import { isChapterUnlocked } from './chapters';

describe('déblocage des chapitres', () => {
  it('laisse toujours le chapitre 1 accessible et verrouille les suivants au départ', () => {
    expect(isChapterUnlocked(1, 0)).toBe(true);
    expect(isChapterUnlocked(2, 0)).toBe(false);
    expect(isChapterUnlocked(3, 0)).toBe(false);
  });

  it('ouvre le chapitre suivant après une victoire et garde les précédents ouverts', () => {
    expect(isChapterUnlocked(1, 2)).toBe(true);
    expect(isChapterUnlocked(2, 1)).toBe(true);
    expect(isChapterUnlocked(3, 1)).toBe(false);
    expect(isChapterUnlocked(3, 2)).toBe(true);
  });
});
