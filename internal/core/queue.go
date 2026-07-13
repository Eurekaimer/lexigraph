package core

import (
	"hash/fnv"
	"time"
)

func seededSample(items []Word, count int, seed string) []Word {
	copyOfItems := append([]Word(nil), items...)
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(seed))
	value := hasher.Sum32()
	for index := len(copyOfItems) - 1; index > 0; index-- {
		value = value*1664525 + 1013904223
		target := int(value % uint32(index+1))
		copyOfItems[index], copyOfItems[target] = copyOfItems[target], copyOfItems[index]
	}
	if count > len(copyOfItems) {
		count = len(copyOfItems)
	}
	if count < 0 {
		count = 0
	}
	return copyOfItems[:count]
}

// BuildStudyQueue interleaves two due reviews with one stratified new word.
func BuildStudyQueue(words []Word, state State, now time.Time, quota int) []Word {
	studied := make(map[string]bool)
	for _, event := range state.History {
		studied[event.WordID] = true
	}

	due := make([]Word, 0)
	unseen := make([]Word, 0)
	for _, word := range words {
		if !studied[word.ID] {
			unseen = append(unseen, word)
			continue
		}
		review := state.Reviews[word.ID]
		dueAt, err := time.Parse(time.RFC3339Nano, review.Due)
		if !review.Mastered && (err != nil || !dueAt.After(now)) {
			due = append(due, word)
		}
	}

	const strata = 5
	date := DateKey(now)
	indexByID := make(map[string]int, len(words))
	for index, word := range words {
		indexByID[word.ID] = index
	}
	introduced := make([]HistoryEvent, 0)
	for _, event := range state.History {
		if len(event.Date) >= 10 && event.Date[:10] == date && event.PreviousReview != nil && event.PreviousReview.Repetitions == 0 {
			introduced = append(introduced, event)
		}
	}

	layers := make([][]Word, strata)
	maxLayerQuota := 0
	for layer := 0; layer < strata; layer++ {
		layerQuota := quota / strata
		if layer < quota%strata {
			layerQuota++
		}
		if layerQuota > maxLayerQuota {
			maxLayerQuota = layerQuota
		}
		used := 0
		for _, event := range introduced {
			index := indexByID[event.WordID]
			if index >= len(words)*layer/strata && index < len(words)*(layer+1)/strata {
				used++
			}
		}
		layerWords := make([]Word, 0)
		for _, word := range unseen {
			index := indexByID[word.ID]
			if index >= len(words)*layer/strata && index < len(words)*(layer+1)/strata {
				layerWords = append(layerWords, word)
			}
		}
		layers[layer] = seededSample(layerWords, layerQuota-used, date+":"+string(rune('0'+layer)))
	}

	newWords := make([]Word, 0, quota)
	for round := 0; round < maxLayerQuota; round++ {
		for layer := 0; layer < strata; layer++ {
			if round < len(layers[layer]) {
				newWords = append(newWords, layers[layer][round])
			}
		}
	}

	queue := make([]Word, 0, len(due)+len(newWords))
	oldIndex, newIndex := 0, 0
	for oldIndex < len(due) || newIndex < len(newWords) {
		for count := 0; count < 2 && oldIndex < len(due); count++ {
			queue = append(queue, due[oldIndex])
			oldIndex++
		}
		if newIndex < len(newWords) {
			queue = append(queue, newWords[newIndex])
			newIndex++
		}
	}
	return queue
}
