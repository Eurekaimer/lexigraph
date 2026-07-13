package vocab

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/Eurekaimer/lexigraph/internal/core"
)

type bundle struct {
	Source  string      `json:"source"`
	License string      `json:"license"`
	Words   []core.Word `json:"words"`
}

func candidates(explicit string) []string {
	paths := make([]string, 0, 4)
	if explicit != "" {
		paths = append(paths, explicit)
	}
	if configured := os.Getenv("LEXIGRAPH_VOCAB"); configured != "" {
		paths = append(paths, configured)
	}
	if executable, err := os.Executable(); err == nil {
		paths = append(paths, filepath.Join(filepath.Dir(executable), "..", "share", "lexigraph", "netem.json"))
	}
	paths = append(paths, "public/data/netem.json")
	return paths
}

func Resolve(explicit string) (string, error) {
	for _, candidate := range candidates(explicit) {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absolute); err == nil && !info.IsDir() {
			return absolute, nil
		}
	}
	return "", errors.New("vocabulary not found; use --vocab /path/to/netem.json")
}

func Load(path string) ([]core.Word, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read vocabulary: %w", err)
	}
	var source bundle
	if err := json.Unmarshal(data, &source); err != nil {
		return nil, fmt.Errorf("decode vocabulary: %w", err)
	}
	if len(source.Words) == 0 {
		return nil, errors.New("vocabulary contains no words")
	}
	for index, word := range source.Words {
		if word.ID == "" || word.Word == "" || word.Meaning == "" {
			return nil, fmt.Errorf("vocabulary entry %d is incomplete", index)
		}
	}
	return source.Words, nil
}
