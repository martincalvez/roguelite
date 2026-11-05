/** Le chapitre 1 est toujours ouvert ; le suivant s'ouvre après la victoire sur le précédent. */
export function isChapterUnlocked(chapterNumber: number, bestChapter: number): boolean {
  return chapterNumber >= 1 && chapterNumber <= Math.max(1, bestChapter + 1);
}
