package core

import (
	"math"
	"time"
)

func DateKey(date time.Time) string {
	return date.UTC().Format("2006-01-02")
}

func DefaultStudyPlan(now time.Time) StudyPlan {
	return StudyPlan{
		TargetDate:  DateKey(now.AddDate(0, 0, 280)),
		ExtraGroups: make(map[string]int),
	}
}

func RemainingDays(plan StudyPlan, now time.Time) int {
	target, err := time.Parse("2006-01-02", plan.TargetDate)
	if err != nil {
		return 1
	}
	today, _ := time.Parse("2006-01-02", DateKey(now))
	days := int(math.Ceil(target.Sub(today).Hours() / 24))
	if days < 1 {
		return 1
	}
	return days
}

func DailyNewQuota(totalWords int, state State, now time.Time) int {
	plan := state.StudyPlan
	if plan == nil {
		fallback := DefaultStudyPlan(now)
		plan = &fallback
	}
	remaining := totalWords - state.LearnedWords()
	if remaining < 0 {
		remaining = 0
	}
	base := int(math.Ceil(float64(remaining) / float64(RemainingDays(*plan, now))))
	return base + plan.ExtraGroups[DateKey(now)]*20
}

func AddExtraGroup(plan StudyPlan, totalWords, studiedWords int, now time.Time) StudyPlan {
	if plan.ExtraGroups == nil {
		plan.ExtraGroups = make(map[string]int)
	}
	key := DateKey(now)
	groups := plan.ExtraGroups[key] + 1
	remaining := totalWords - studiedWords
	if remaining < 1 {
		remaining = 1
	}
	currentDays := RemainingDays(plan, now)
	dailyRate := float64(remaining) / float64(currentDays)
	extraDays := float64(groups*20) / dailyRate
	newDays := int(math.Round(float64(currentDays) - extraDays))
	if newDays < 1 {
		newDays = 1
	}
	plan.TargetDate = DateKey(now.AddDate(0, 0, newDays))
	plan.ExtraGroups[key] = groups
	return plan
}
