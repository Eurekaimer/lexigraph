package core

import (
	"crypto/rand"
	"encoding/hex"
	"math"
	"time"
)

const day = 24 * time.Hour

func round(value float64, places int) float64 {
	base := math.Pow(10, float64(places))
	return math.Round(value*base) / base
}

// Schedule mirrors the browser scheduler and never mutates the input review.
func Schedule(previous Review, rating Rating, now time.Time) Review {
	next := previous
	if rating == Mastered {
		next.Mastered = true
		next.Repetitions++
		next.Due = "9999-12-31T23:59:59.999Z"
		return next
	}

	interval := next.Interval
	switch rating {
	case Forgot:
		interval = 0.02
		next.Repetitions = 0
		next.Lapses++
		next.Ease = math.Max(1.3, next.Ease-0.2)
	case Hard:
		interval = math.Max(1, interval*1.2)
		if interval == 0 {
			interval = 1
		}
		next.Ease = math.Max(1.3, next.Ease-0.15)
		next.Repetitions++
	case Good:
		switch next.Repetitions {
		case 0:
			interval = 1
		case 1:
			interval = 3
		default:
			interval = math.Max(1, interval*next.Ease)
		}
		next.Repetitions++
	}

	next.Mastered = false
	next.Interval = round(interval, 2)
	next.Ease = round(next.Ease, 2)
	next.Due = now.UTC().Add(time.Duration(interval * float64(day))).Format(time.RFC3339Nano)
	return next
}

func eventID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(buffer)
}

func (state *State) ApplyRating(wordID string, rating Rating, now time.Time) bool {
	previous, ok := state.Reviews[wordID]
	if !ok || rating < Forgot || rating > Mastered {
		return false
	}
	copyOfPrevious := previous
	state.Reviews[wordID] = Schedule(previous, rating, now)
	state.History = append(state.History, HistoryEvent{
		ID:             eventID(),
		Date:           now.UTC().Format(time.RFC3339Nano),
		WordID:         wordID,
		Rating:         rating,
		PreviousReview: &copyOfPrevious,
	})
	return true
}

func (state *State) Undo() bool {
	if len(state.History) == 0 {
		return false
	}
	event := state.History[len(state.History)-1]
	if event.PreviousReview == nil {
		return false
	}
	state.Reviews[event.WordID] = *event.PreviousReview
	state.History = state.History[:len(state.History)-1]
	return true
}
