import { distance } from "./logic";
import type { Word } from "./types";
export type SearchResult = {
  word: Word;
  score: number;
  reason: "exact" | "prefix" | "contains" | "fuzzy";
};
/**
 * Ranks exact, prefix, substring, then edit-distance matches.
 * Kept as a pure function so a BK-tree or worker-backed index can replace it.
 */
export function searchWords(
  words: Word[],
  rawQuery: string,
  limit = 20,
): SearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  return words
    .map((word) => {
      const value = word.word.toLowerCase();
      if (value === query)
        return { word, score: 100, reason: "exact" as const };
      if (value.startsWith(query))
        return {
          word,
          score: 80 - (value.length - query.length),
          reason: "prefix" as const,
        };
      if (value.includes(query))
        return {
          word,
          score: 60 - (value.length - query.length),
          reason: "contains" as const,
        };
      const editDistance =
        query.length >= 3 && Math.abs(value.length - query.length) <= 2
          ? distance(value, query)
          : 99;
      return {
        word,
        score: editDistance <= 2 ? 40 - editDistance * 10 : -1,
        reason: "fuzzy" as const,
      };
    })
    .filter((result) => result.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score || (b.word.frequency ?? 0) - (a.word.frequency ?? 0),
    )
    .slice(0, limit);
}
