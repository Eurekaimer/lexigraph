import { expect, it } from "vitest";
import { recallRate, todayStudyActivity } from "./stats";
import type { State } from "./types";
it("computes recall rate", () => {
  const state: State = {
    reviews: {},
    mistakes: [],
    history: [
      { date: "2026-01-01", wordId: "a", rating: 0 },
      { date: "2026-01-01", wordId: "b", rating: 2 },
      { date: "2026-01-01", wordId: "c", rating: 3 },
    ],
  };
  expect(recallRate(state)).toBeCloseTo(2 / 3);
});

it("separates today's first encounters from repeat reviews", () => {
  const state: State = {
    reviews: {},
    mistakes: [],
    history: [
      { date: "2026-07-12T20:00:00Z", wordId: "old", rating: 2 },
      { date: "2026-07-13T08:00:00Z", wordId: "old", rating: 1 },
      { date: "2026-07-13T09:00:00Z", wordId: "new", rating: 2 },
      { date: "2026-07-13T10:00:00Z", wordId: "new", rating: 0 },
    ],
  };
  expect(todayStudyActivity(state, new Date("2026-07-13T12:00:00Z"))).toEqual({
    reviews: 3,
    newWords: 1,
  });
});
