import { expect, it } from "vitest";
import { emptyState, normalizeState } from "./storage";
it("returns an empty state for invalid input", () =>
  expect(normalizeState(null)).toEqual(emptyState()));
it("repairs missing collections and creates a study plan", () => {
  const migrated = normalizeState({ reviews: {} });
  expect(migrated).toMatchObject({
    reviews: {},
    mistakes: [],
    history: [],
    studyPlan: { extraGroups: {} },
  });
  expect(migrated.studyPlan?.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
it("preserves compatible history snapshots", () => {
  const value = {
    reviews: {},
    mistakes: [],
    history: [
      {
        date: "2026-01-01",
        wordId: "x",
        rating: 2,
        previousReview: {
          wordId: "x",
          due: "2026-01-01",
          interval: 0,
          ease: 2.5,
          repetitions: 0,
          lapses: 0,
        },
      },
    ],
  };
  expect(normalizeState(value).history[0].previousReview?.ease).toBe(2.5);
});
