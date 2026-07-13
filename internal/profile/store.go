package profile

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Eurekaimer/lexigraph/internal/core"
)

const profileVersion = 2

type Document struct {
	Version   int               `json:"version"`
	UpdatedAt string            `json:"updatedAt"`
	State     core.State        `json:"state"`
	Keymap    map[string]string `json:"keymap,omitempty"`
}

type Store struct {
	Path string
}

func DefaultPath() (string, error) {
	if dataHome := os.Getenv("XDG_DATA_HOME"); dataHome != "" {
		return filepath.Join(dataHome, "lexigraph", "profile.json"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home directory: %w", err)
	}
	return filepath.Join(home, ".local", "share", "lexigraph", "profile.json"), nil
}

func ExpandPath(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", errors.New("path cannot be empty")
	}
	if path == "~" || strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		if path == "~" {
			return home, nil
		}
		path = filepath.Join(home, path[2:])
	}
	return filepath.Abs(path)
}

func New(path string) (*Store, error) {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return nil, err
		}
	}
	expanded, err := ExpandPath(path)
	if err != nil {
		return nil, err
	}
	return &Store{Path: expanded}, nil
}

func decode(data []byte, now time.Time) (Document, error) {
	var envelope struct {
		Version   int               `json:"version"`
		UpdatedAt string            `json:"updatedAt"`
		State     json.RawMessage   `json:"state"`
		Keymap    map[string]string `json:"keymap"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return Document{}, fmt.Errorf("decode profile: %w", err)
	}

	var state core.State
	if len(envelope.State) > 0 && string(envelope.State) != "null" {
		if err := json.Unmarshal(envelope.State, &state); err != nil {
			return Document{}, fmt.Errorf("decode profile state: %w", err)
		}
	} else {
		// Accept an unwrapped State object for convenient manual backups.
		if err := json.Unmarshal(data, &state); err != nil {
			return Document{}, fmt.Errorf("decode state: %w", err)
		}
	}
	if state.Reviews == nil && state.History == nil {
		return Document{}, errors.New("profile does not contain a valid state")
	}
	if envelope.Keymap == nil {
		envelope.Keymap = map[string]string{}
	}
	return Document{
		Version:   envelope.Version,
		UpdatedAt: envelope.UpdatedAt,
		State:     state,
		Keymap:    envelope.Keymap,
	}, nil
}

func (store *Store) Load(now time.Time) (Document, error) {
	data, err := os.ReadFile(store.Path)
	if errors.Is(err, os.ErrNotExist) {
		return Document{
			Version: profileVersion,
			State:   core.NewState(now),
			Keymap:  map[string]string{},
		}, nil
	}
	if err != nil {
		return Document{}, fmt.Errorf("read %s: %w", store.Path, err)
	}
	return decode(data, now)
}

func marshal(document Document, now time.Time) ([]byte, error) {
	document.Version = profileVersion
	document.UpdatedAt = now.UTC().Format(time.RFC3339Nano)
	if document.Keymap == nil {
		document.Keymap = map[string]string{}
	}
	return json.MarshalIndent(document, "", "  ")
}

func writeAtomic(path string, data []byte) error {
	directory := filepath.Dir(path)
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return fmt.Errorf("create profile directory: %w", err)
	}
	temporary, err := os.CreateTemp(directory, ".profile-*.json")
	if err != nil {
		return fmt.Errorf("create temporary profile: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o600); err != nil {
		temporary.Close()
		return err
	}
	if _, err := temporary.Write(data); err != nil {
		temporary.Close()
		return fmt.Errorf("write profile: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return fmt.Errorf("sync profile: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("replace profile: %w", err)
	}
	return nil
}

func (store *Store) Save(document Document, now time.Time) error {
	data, err := marshal(document, now)
	if err != nil {
		return fmt.Errorf("encode profile: %w", err)
	}
	return writeAtomic(store.Path, data)
}

func (store *Store) Import(path string, now time.Time) (Document, error) {
	expanded, err := ExpandPath(path)
	if err != nil {
		return Document{}, err
	}
	data, err := os.ReadFile(expanded)
	if err != nil {
		return Document{}, fmt.Errorf("read import: %w", err)
	}
	document, err := decode(data, now)
	if err != nil {
		return Document{}, err
	}
	if err := store.Save(document, now); err != nil {
		return Document{}, err
	}
	return document, nil
}

func (store *Store) Export(document Document, path string, now time.Time) (string, error) {
	expanded, err := ExpandPath(path)
	if err != nil {
		return "", err
	}
	data, err := marshal(document, now)
	if err != nil {
		return "", err
	}
	if err := writeAtomic(expanded, data); err != nil {
		return "", err
	}
	return expanded, nil
}
