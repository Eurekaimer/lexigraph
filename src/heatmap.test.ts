import { describe, expect, it } from "vitest";
import { buildReviewHeatmap, heatmapColor } from "./heatmap";
import type { State } from "./types";

const state: State = {
  reviews: {},
  mistakes: [],
  history: [
    { date: "2026-07-12T08:00:00Z", wordId: "a", rating: 2 },
    { date: "2026-07-12T09:00:00Z", wordId: "b", rating: 1 },
  ],
};

describe("review heatmap", () => {
  it("aligns the grid to Monday and keeps complete weeks", () => {
    const map = buildReviewHeatmap(state, new Date("2026-07-13T12:00:00Z"));
    expect(new Date(`${map.cells[0].key}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(map.cells).toHaveLength(map.weeks * 7);
  });

  it("counts every review event on its UTC date", () => {
    const map = buildReviewHeatmap(state, new Date("2026-07-13T12:00:00Z"));
    expect(map.cells.find((cell) => cell.key === "2026-07-12")?.count).toBe(2);
  });

  it("marks padding outside the requested year as empty", () => {
    const map = buildReviewHeatmap(state, new Date("2026-07-13T12:00:00Z"));
    expect(map.cells.some((cell) => cell.count === null)).toBe(true);
  });

  it("uses progressively darker activity bands", () => {
    expect([0, 1, 4, 9, 16].map(heatmapColor)).toEqual([
      "#edf0ed",
      "#c9dfd2",
      "#86b99c",
      "#4d8d68",
      "#255c41",
    ]);
  });
});
