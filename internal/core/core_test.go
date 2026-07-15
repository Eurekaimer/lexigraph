package core

import (
	"testing"
	"time"
)

func fixedNow() time.Time {
	return time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
}

func TestScheduleAndUndo(t *testing.T) {
	state := NewState(fixedNow())
	state.Reviews["adapt"] = InitialReview("adapt", fixedNow())
	before := state.Reviews["adapt"]
	if !state.ApplyRating("adapt", Forgot, fixedNow()) {
		t.Fatal("rating was not applied")
	}
	if state.Reviews["adapt"].Lapses != 1 || len(state.History) != 1 {
		t.Fatal("forgotten rating did not update review state")
	}
	if !state.Undo() || state.Reviews["adapt"] != before || len(state.History) != 0 {
		t.Fatal("undo did not restore the exact previous review")
	}
}

func TestMasteredRetiresWord(t *testing.T) {
	review := Schedule(InitialReview("adapt", fixedNow()), Mastered, fixedNow())
	if !review.Mastered || review.Due[:4] != "9999" {
		t.Fatalf("unexpected mastered review: %#v", review)
	}
}

func TestQueueIsDeterministicAndStratified(t *testing.T) {
	words := make([]Word, 100)
	for index := range words {
		words[index] = Word{ID: string(rune('a' + index)), Word: string(rune('a' + index))}
	}
	state := NewState(fixedNow())
	state.Normalize(words, fixedNow())
	first := BuildStudyQueue(words, state, fixedNow(), 20)
	second := BuildStudyQueue(words, state, fixedNow(), 20)
	if len(first) != 20 || len(second) != 20 {
		t.Fatalf("expected 20 new words, got %d and %d", len(first), len(second))
	}
	for index := range first {
		if first[index].ID != second[index].ID {
			t.Fatal("daily queue changed with the same seed")
		}
	}
}

func TestExtraGroupIncreasesQuota(t *testing.T) {
	state := NewState(fixedNow())
	base := DailyNewQuota(5530, state, fixedNow())
	updated := AddExtraGroup(*state.StudyPlan, 5530, 0, fixedNow())
	state.StudyPlan = &updated
	if got := DailyNewQuota(5530, state, fixedNow()); got != base+20 {
		t.Fatalf("expected quota %d, got %d", base+20, got)
	}
}

func TestSetTargetDaysUpdatesPlanDate(t *testing.T) {
	plan := SetTargetDays(DefaultStudyPlan(fixedNow()), 120, fixedNow())
	if plan.TargetDate != "2026-11-10" {
		t.Fatalf("unexpected target date: %s", plan.TargetDate)
	}
	if RemainingDays(plan, fixedNow()) != 120 {
		t.Fatalf("expected 120 remaining days, got %d", RemainingDays(plan, fixedNow()))
	}
}
