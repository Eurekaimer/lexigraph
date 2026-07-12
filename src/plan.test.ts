import { expect, it } from "vitest";
import {
  addExtraGroup,
  dailyNewQuota,
  defaultStudyPlan,
  remainingDays,
  setTargetDays,
} from "./plan";
import type { State } from "./types";
const now = new Date("2026-07-12T08:00:00Z");
it("stores a concrete target date", () =>
  expect(setTargetDays(defaultStudyPlan(now), 30, now).targetDate).toBe(
    "2026-08-11",
  ));
it("counts down remaining calendar days", () => {
  const plan = setTargetDays(defaultStudyPlan(now), 30, now);
  expect(remainingDays(plan, new Date("2026-07-22"))).toBe(20);
});
it("derives quota from remaining words and days", () => {
  const state: State = {
    reviews: {},
    mistakes: [],
    history: [],
    studyPlan: setTargetDays(defaultStudyPlan(now), 10, now),
  };
  expect(dailyNewQuota(101, state, now)).toBe(11);
});
it("advances the target proportionally to the daily rate", () => {
  // 2800 words over 280 days = 10 words/day
  // One extra group (20 words) = 20/10 = 2 days of progress
  const plan = addExtraGroup(defaultStudyPlan(now), 2800, 0, now);
  expect(remainingDays(plan, now)).toBe(280 - 2);
});
it("advances less when the daily rate is high", () => {
  // 28000 words over 280 days = 100 words/day
  // One extra group (20 words) = 20/100 = 0.2 days → rounds to 0 advance
  const plan = addExtraGroup(defaultStudyPlan(now), 28000, 0, now);
  expect(remainingDays(plan, now)).toBe(280); // no change (rounds away)
});
it("adds twenty words for each extra group and adjusts the quota", () => {
  // 5600 words over 280 days = 20 words/day → 1 group = 1 day
  let plan = defaultStudyPlan(now);
  plan = addExtraGroup(addExtraGroup(plan, 5600, 0, now), 5600, 0, now);
  const state: State = {
    reviews: {},
    mistakes: [],
    history: [],
    studyPlan: plan,
  };
  // 2 extra groups → −2 days → remainingDays = 278
  // base = ceil(100 / 278) = 1, extra = 2 × 20 = 40
  expect(dailyNewQuota(100, state, now)).toBe(1 + 40);
});
