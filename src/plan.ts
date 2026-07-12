import type { State, StudyPlan } from "./types";
const DAY = 86_400_000;
export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);
export function defaultStudyPlan(now = new Date()): StudyPlan {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + 280);
  return { targetDate: dateKey(target), extraGroups: {} };
}
export function setTargetDays(
  plan: StudyPlan,
  days: number,
  now = new Date(),
): StudyPlan {
  const safe = Math.max(1, Math.floor(days));
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + safe);
  return { ...plan, targetDate: dateKey(target) };
}
export function remainingDays(plan: StudyPlan, now = new Date()) {
  const today = new Date(`${dateKey(now)}T00:00:00Z`);
  const target = new Date(`${plan.targetDate}T00:00:00Z`);
  return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / DAY));
}
export function dailyNewQuota(
  totalWords: number,
  state: State,
  now = new Date(),
) {
  const plan = state.studyPlan ?? defaultStudyPlan(now);
  const studied = new Set(state.history.map((event) => event.wordId)).size;
  const base = Math.ceil(
    Math.max(0, totalWords - studied) / remainingDays(plan, now),
  );
  return base + (plan.extraGroups[dateKey(now)] ?? 0) * 20;
}
/**
 * Adds a 20-word extra group to today's quota and advances the target date
 * proportionally.  The advance is based on the current daily rate so that
 * "one extra group" always shortens the plan by the right fraction:
 *
 *   advanceDays = (extraGroups × 20) ÷ (remainingWords ÷ remainingDays)
 *
 * Examples at the default ~20 words/day rate: 1 group → −1 day.
 * With only 10 words/day left:           1 group → −2 days.
 * With 100 words/day (compressed plan):   1 group → −0.2 days (rounds away later).
 */
export function addExtraGroup(
  plan: StudyPlan,
  totalWords: number,
  studiedWords: number,
  now = new Date(),
): StudyPlan {
  const key = dateKey(now);
  const newExtra = (plan.extraGroups[key] ?? 0) + 1;
  const remaining = Math.max(1, totalWords - studiedWords);
  const currentDays = remainingDays(plan, now);
  // Daily rate without extras — the baseline words-per-day of the plan
  const dailyRate = remaining / currentDays;
  // Total extra words today expressed in "normal days" of progress
  const extraDays = (newExtra * 20) / dailyRate;
  const newDays = Math.max(1, Math.round(currentDays - extraDays));
  return {
    ...plan,
    targetDate: setTargetDays(plan, newDays, now).targetDate,
    extraGroups: { ...plan.extraGroups, [key]: newExtra },
  };
}
