import type { State } from "./types";

const DAY = 86_400_000;

export type HeatmapCell = {
  key: string;
  label: string;
  count: number | null;
};

export type ReviewHeatmap = {
  weeks: number;
  startYear: number;
  endYear: number;
  monthLabels: { column: number; label: string }[];
  cells: HeatmapCell[];
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function heatmapColor(count: number) {
  if (count === 0) return "#edf0ed";
  if (count <= 3) return "#c9dfd2";
  if (count <= 8) return "#86b99c";
  if (count <= 15) return "#4d8d68";
  return "#255c41";
}

/** Builds a Monday-aligned, row-major contribution grid. */
export function buildReviewHeatmap(
  state: State,
  now = new Date(),
  totalDays = 365,
): ReviewHeatmap {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const rangeStart = new Date(today.getTime() - (totalDays - 1) * DAY);
  const padding = (rangeStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(rangeStart.getTime() - padding * DAY);
  const weeks = Math.ceil((totalDays + padding) / 7);
  const counts = new Map<string, number>();

  for (const event of state.history) {
    const key = event.date.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const monthLabels: ReviewHeatmap["monthLabels"] = [];
  let previousMonth = -1;
  for (let column = 0; column < weeks; column++) {
    const date = new Date(gridStart.getTime() + column * 7 * DAY);
    if (date.getUTCMonth() !== previousMonth) {
      previousMonth = date.getUTCMonth();
      monthLabels.push({ column, label: `${previousMonth + 1}月` });
    }
  }

  const firstKey = dayKey(rangeStart);
  const lastKey = dayKey(today);
  const cells: HeatmapCell[] = [];
  for (let row = 0; row < 7; row++) {
    for (let column = 0; column < weeks; column++) {
      const date = new Date(gridStart.getTime() + (column * 7 + row) * DAY);
      const key = dayKey(date);
      cells.push({
        key,
        label: `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
        count: key < firstKey || key > lastKey ? null : (counts.get(key) ?? 0),
      });
    }
  }

  return {
    weeks,
    startYear: gridStart.getUTCFullYear(),
    endYear: today.getUTCFullYear(),
    monthLabels,
    cells,
  };
}
