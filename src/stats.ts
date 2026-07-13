import type { State } from "./types";

export function dailyReviews(state: State, days = 14) {
  const result = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return {
      date: date.toISOString().slice(5, 10),
      key: date.toISOString().slice(0, 10),
      count: 0,
    };
  });
  for (const item of state.history) {
    const bucket = result.find((day) => day.key === item.date.slice(0, 10));
    if (bucket) bucket.count++;
  }
  return result;
}

export function recallRate(state: State) {
  if (!state.history.length) return 0;
  return (
    state.history.filter((item) => item.rating >= 2).length /
    state.history.length
  );
}

/** Summarizes today's activity without relying on mutable review counters. */
export function todayStudyActivity(state: State, now = new Date()) {
  const key = now.toISOString().slice(0, 10);
  const seen = new Set<string>();
  let reviews = 0;
  let newWords = 0;

  for (const event of state.history) {
    if (event.date.slice(0, 10) === key) {
      reviews++;
      if (!seen.has(event.wordId)) newWords++;
    }
    seen.add(event.wordId);
  }

  return { reviews, newWords };
}
