import { describe, expect, it } from "vitest";
import { emptyState } from "./storage";
import { buildStudyInsights } from "./study-insights";

describe("study sidebar insights", () => {
  it("summarizes the last seven UTC calendar days", () => {
    const state = emptyState();
    state.history = [
      { wordId: "adapt", rating: 2, date: "2026-07-07T12:00:00.000Z" },
      { wordId: "adapt", rating: 3, date: "2026-07-13T08:00:00.000Z" },
      { wordId: "brief", rating: 0, date: "2026-07-13T09:00:00.000Z" },
    ];

    const result = buildStudyInsights(
      state,
      new Date("2026-07-13T16:00:00.000Z"),
    );

    expect(result.activity.map((day) => day.count)).toEqual([
      1, 0, 0, 0, 0, 0, 2,
    ]);
    expect(result.weeklyReviews).toBe(3);
    expect(result.activeDays).toBe(2);
    expect(result.learnedWords).toBe(2);
    expect(result.recallRate).toBeCloseTo(2 / 3);
  });

  it("returns a thirteen-week compact heatmap without mutating state", () => {
    const state = emptyState();
    const before = structuredClone(state);
    const result = buildStudyInsights(
      state,
      new Date("2026-07-13T16:00:00.000Z"),
    );

    expect(result.heatmapWeeks).toBeGreaterThanOrEqual(13);
    expect(result.heatmapCells).toHaveLength(result.heatmapWeeks * 7);
    expect(state).toEqual(before);
  });
});
