import { expect, it } from "vitest";
import { buildStudyQueue } from "./queue";
import type { State, Word } from "./types";
const words: Word[] = Array.from({ length: 100 }, (_, i) => ({
  id: `w${i}`,
  word: `w${i}`,
  phonetic: "",
  meaning: "",
  example: "",
}));
const state: State = {
  reviews: Object.fromEntries(
    words.map((word) => [
      word.id,
      {
        wordId: word.id,
        due: "2020-01-01T00:00:00Z",
        interval: 0,
        ease: 2.5,
        repetitions: 0,
        lapses: 0,
      },
    ]),
  ),
  mistakes: [],
  history: [],
};
it("selects four unseen words from each of five strata", () => {
  const queue = buildStudyQueue(words, state, new Date("2026-07-12T00:00:00Z"));
  expect(queue).toHaveLength(20);
  for (let layer = 0; layer < 5; layer++)
    expect(
      queue.filter(
        (word) =>
          Number(word.id.slice(1)) >= layer * 20 &&
          Number(word.id.slice(1)) < (layer + 1) * 20,
      ),
    ).toHaveLength(4);
});
it("keeps the daily selection stable", () =>
  expect(
    buildStudyQueue(words, state, new Date("2026-07-12T01:00:00Z")).map(
      (x) => x.id,
    ),
  ).toEqual(
    buildStudyQueue(words, state, new Date("2026-07-12T20:00:00Z")).map(
      (x) => x.id,
    ),
  ));
it("does not replace completed new words beyond the daily quota", () => {
  const copy = structuredClone(state);
  const first = buildStudyQueue(
    words,
    copy,
    new Date("2026-07-12T01:00:00Z"),
  )[0];
  copy.history.push({
    date: "2026-07-12T02:00:00Z",
    wordId: first.id,
    rating: 2,
    previousReview: copy.reviews[first.id],
  });
  copy.reviews[first.id] = {
    ...copy.reviews[first.id],
    due: "2026-07-13T00:00:00Z",
  };
  expect(
    buildStudyQueue(words, copy, new Date("2026-07-12T03:00:00Z")),
  ).toHaveLength(19);
});
it("does not return mastered review words", () => {
  const copy = structuredClone(state);
  copy.history.push({ date: "2026-07-11", wordId: "w0", rating: 3 });
  copy.reviews.w0.mastered = true;
  expect(
    buildStudyQueue(words, copy, new Date("2026-07-12")).map((word) => word.id),
  ).not.toContain("w0");
});
it("accepts an arbitrary new-word quota", () => {
  const queue = buildStudyQueue(words, state, new Date("2026-07-12"), 37);
  expect(queue).toHaveLength(37);
  const counts = Array.from(
    { length: 5 },
    (_, layer) =>
      queue.filter((word) => {
        const index = Number(word.id.slice(1));
        return index >= layer * 20 && index < (layer + 1) * 20;
      }).length,
  );
  expect(counts).toEqual([8, 8, 7, 7, 7]);
});
