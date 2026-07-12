import type { State } from './types';

export function dailyReviews(state: State, days = 14) {
  const result = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return { date: date.toISOString().slice(5, 10), key: date.toISOString().slice(0, 10), count: 0 };
  });
  for (const item of state.history) {
    const bucket = result.find(day => day.key === item.date.slice(0, 10));
    if (bucket) bucket.count++;
  }
  return result;
}

export function recallRate(state: State) {
  if (!state.history.length) return 0;
  return state.history.filter(item => item.rating >= 2).length / state.history.length;
}
