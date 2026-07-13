package core

import "time"

type Rating int

const (
	Forgot Rating = iota
	Hard
	Good
	Mastered
)

type Word struct {
	ID        string `json:"id"`
	Word      string `json:"word"`
	Phonetic  string `json:"phonetic"`
	Meaning   string `json:"meaning"`
	Example   string `json:"example"`
	Frequency int    `json:"frequency,omitempty"`
	Category  string `json:"category,omitempty"`
	Variants  any    `json:"variants,omitempty"`
}

type Review struct {
	WordID      string  `json:"wordId"`
	Due         string  `json:"due"`
	Interval    float64 `json:"interval"`
	Ease        float64 `json:"ease"`
	Repetitions int     `json:"repetitions"`
	Lapses      int     `json:"lapses"`
	Mastered    bool    `json:"mastered,omitempty"`
}

type HistoryEvent struct {
	ID             string  `json:"id,omitempty"`
	Date           string  `json:"date"`
	WordID         string  `json:"wordId"`
	Rating         Rating  `json:"rating"`
	PreviousReview *Review `json:"previousReview,omitempty"`
}

type Mistake struct {
	From  string `json:"from"`
	To    string `json:"to"`
	Count int    `json:"count"`
}

type StudyPlan struct {
	TargetDate  string         `json:"targetDate"`
	ExtraGroups map[string]int `json:"extraGroups"`
}

type State struct {
	Reviews   map[string]Review `json:"reviews"`
	Mistakes  []Mistake         `json:"mistakes"`
	History   []HistoryEvent    `json:"history"`
	StudyPlan *StudyPlan        `json:"studyPlan,omitempty"`
}

func NewState(now time.Time) State {
	plan := DefaultStudyPlan(now)
	return State{
		Reviews:   make(map[string]Review),
		Mistakes:  []Mistake{},
		History:   []HistoryEvent{},
		StudyPlan: &plan,
	}
}

func InitialReview(wordID string, now time.Time) Review {
	return Review{
		WordID: wordID,
		Due:    now.UTC().Format(time.RFC3339Nano),
		Ease:   2.5,
	}
}

func (state *State) Normalize(words []Word, now time.Time) {
	if state.Reviews == nil {
		state.Reviews = make(map[string]Review)
	}
	if state.Mistakes == nil {
		state.Mistakes = []Mistake{}
	}
	if state.History == nil {
		state.History = []HistoryEvent{}
	}
	if state.StudyPlan == nil || state.StudyPlan.TargetDate == "" {
		plan := DefaultStudyPlan(now)
		state.StudyPlan = &plan
	}
	if state.StudyPlan.ExtraGroups == nil {
		state.StudyPlan.ExtraGroups = make(map[string]int)
	}
	for _, word := range words {
		if _, ok := state.Reviews[word.ID]; !ok {
			state.Reviews[word.ID] = InitialReview(word.ID, now)
		}
	}
}

func (state State) LearnedWords() int {
	seen := make(map[string]struct{})
	for _, event := range state.History {
		seen[event.WordID] = struct{}{}
	}
	return len(seen)
}

func (state State) TotalLapses() int {
	total := 0
	for _, review := range state.Reviews {
		total += review.Lapses
	}
	return total
}

func (state State) RecallRate() float64 {
	if len(state.History) == 0 {
		return 0
	}
	success := 0
	for _, event := range state.History {
		if event.Rating >= Good {
			success++
		}
	}
	return float64(success) / float64(len(state.History))
}
