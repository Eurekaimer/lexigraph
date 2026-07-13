package profile

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Eurekaimer/lexigraph/internal/core"
)

func TestStoreRoundTripAndPermissions(t *testing.T) {
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	path := filepath.Join(t.TempDir(), "nested", "profile.json")
	store, err := New(path)
	if err != nil {
		t.Fatal(err)
	}
	document := Document{State: core.NewState(now)}
	document.State.History = append(document.State.History, core.HistoryEvent{
		Date: now.Format(time.RFC3339), WordID: "adapt", Rating: core.Good,
	})
	if err := store.Save(document, now); err != nil {
		t.Fatal(err)
	}
	loaded, err := store.Load(now)
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.State.History) != 1 || loaded.State.History[0].WordID != "adapt" {
		t.Fatalf("unexpected profile: %#v", loaded)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("profile permissions are %o", info.Mode().Perm())
	}
}

func TestImportAcceptsBrowserEnvelope(t *testing.T) {
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	directory := t.TempDir()
	input := filepath.Join(directory, "browser.json")
	data := []byte(`{"version":2,"state":{"reviews":{},"mistakes":[],"history":[],"studyPlan":{"targetDate":"2027-01-01","extraGroups":{}}},"keymap":{"undo":"z"}}`)
	if err := os.WriteFile(input, data, 0o600); err != nil {
		t.Fatal(err)
	}
	store, _ := New(filepath.Join(directory, "profile.json"))
	document, err := store.Import(input, now)
	if err != nil {
		t.Fatal(err)
	}
	if document.Keymap["undo"] != "z" || document.State.StudyPlan.TargetDate != "2027-01-01" {
		t.Fatalf("browser envelope was not preserved: %#v", document)
	}
}

func TestInvalidImportDoesNotReplaceProfile(t *testing.T) {
	now := time.Now()
	directory := t.TempDir()
	store, _ := New(filepath.Join(directory, "profile.json"))
	original := Document{State: core.NewState(now)}
	if err := store.Save(original, now); err != nil {
		t.Fatal(err)
	}
	invalid := filepath.Join(directory, "invalid.json")
	_ = os.WriteFile(invalid, []byte(`{"hello":"world"}`), 0o600)
	if _, err := store.Import(invalid, now); err == nil {
		t.Fatal("invalid import unexpectedly succeeded")
	}
	if _, err := store.Load(now); err != nil {
		t.Fatalf("existing profile was damaged: %v", err)
	}
}
