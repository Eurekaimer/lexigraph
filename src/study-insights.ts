import { buildReviewHeatmap } from "./heatmap";
import type { State } from "./types";

const DAY = 86_400_000;
const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export type StudyActivityPoint = {
  key: string;
  label: string;
  count: number;
};

export type StudyInsights = {
  activity: StudyActivityPoint[];
  activeDays: number;
  weeklyReviews: number;
  learnedWords: number;
  lapses: number;
  recallRate: number;
  heatmapWeeks: number;
  heatmapCells: { label: string; count: number | null }[];
};

/**
 * Builds the compact, state-derived metrics used beside the study card.
 * Keeping this calculation out of the renderer makes the sidebar reusable and
 * ensures that visual changes cannot mutate review state.
 */
export function buildStudyInsights(
  state: State,
  now = new Date(),
): StudyInsights {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 6 * DAY);
  const counts = new Map<string, number>();

  for (const event of state.history) {
    const key = event.date.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: WEEKDAY_LABELS[date.getUTCDay()],
      count: counts.get(key) ?? 0,
    };
  });
  const compactHeatmap = buildReviewHeatmap(state, today, 91);
  const successfulReviews = state.history.filter(
    (event) => event.rating >= 2,
  ).length;

  return {
    activity,
    activeDays: activity.filter((day) => day.count > 0).length,
    weeklyReviews: activity.reduce((sum, day) => sum + day.count, 0),
    learnedWords: new Set(state.history.map((event) => event.wordId)).size,
    lapses: Object.values(state.reviews).reduce(
      (sum, review) => sum + review.lapses,
      0,
    ),
    recallRate: state.history.length
      ? successfulReviews / state.history.length
      : 0,
    heatmapWeeks: compactHeatmap.weeks,
    heatmapCells: compactHeatmap.cells.map(({ label, count }) => ({
      label,
      count,
    })),
  };
}
