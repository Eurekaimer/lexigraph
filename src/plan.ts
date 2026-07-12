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
export function addExtraGroup(plan: StudyPlan, now = new Date()): StudyPlan {
  const key = dateKey(now);
  const newExtra = (plan.extraGroups[key] ?? 0) + 1;
  // Each extra group adds ~20 words — roughly one day's quota.
  // Advance the target date so remaining days reflects the lighter workload.
  const currentDays = remainingDays(plan, now);
  const adjustedDays = Math.max(1, currentDays - 1);
  return {
    ...plan,
    targetDate: setTargetDays(plan, adjustedDays, now).targetDate,
    extraGroups: { ...plan.extraGroups, [key]: newExtra },
  };
}
