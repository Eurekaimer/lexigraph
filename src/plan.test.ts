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
it("adds twenty words for each extra group", () => {
  let plan = defaultStudyPlan(now);
  plan = addExtraGroup(addExtraGroup(plan, now), now);
  const state: State = {
    reviews: {},
    mistakes: [],
    history: [],
    studyPlan: plan,
  };
  expect(dailyNewQuota(100, state, now)).toBe(Math.ceil(100 / 280) + 40);
});
