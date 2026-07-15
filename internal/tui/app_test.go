package tui

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Eurekaimer/lexigraph/internal/core"
	"github.com/Eurekaimer/lexigraph/internal/profile"
)

func testApp(t *testing.T) *App {
	t.Helper()
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	store, err := profile.New(filepath.Join(t.TempDir(), "profile.json"))
	if err != nil {
		t.Fatal(err)
	}
	words := []core.Word{
		{ID: "adapt", Word: "adapt", Meaning: "适应"},
		{ID: "adopt", Word: "adopt", Meaning: "采用"},
		{ID: "adept", Word: "adept", Meaning: "熟练的"},
		{ID: "affect", Word: "affect", Meaning: "影响"},
		{ID: "effect", Word: "effect", Meaning: "效果"},
	}
	document := profile.Document{State: core.NewState(now)}
	app := New(words, document, store)
	app.now = func() time.Time { return now }
	app.Document.State.Normalize(words, now)
	app.refresh()
	return app
}

func TestVimRatingFlow(t *testing.T) {
	app := testApp(t)
	app.Selected = core.Good
	app.Handle(Key{Rune: 'h'})
	if app.Selected != core.Hard {
		t.Fatalf("h selected %d", app.Selected)
	}
	app.Handle(Key{Name: "enter"})
	if len(app.Document.State.History) != 1 || app.Document.State.History[0].Rating != core.Hard {
		t.Fatal("Enter did not submit selected rating")
	}
}

func TestMenuUsesJKAndExecutesAddGroup(t *testing.T) {
	app := testApp(t)
	app.Handle(Key{Rune: 'm'})
	app.Handle(Key{Rune: 'j'})
	app.Handle(Key{Name: "enter"})
	groups := app.Document.State.StudyPlan.ExtraGroups[core.DateKey(app.now())]
	if groups != 1 {
		t.Fatalf("expected one extra group, got %d", groups)
	}
}

func TestDaysCommandUpdatesPlan(t *testing.T) {
	app := testApp(t)
	app.Command = "days 120"
	app.Overlay = CommandOverlay
	app.Handle(Key{Name: "enter"})
	if got := app.Document.State.StudyPlan.TargetDate; got != "2026-11-10" {
		t.Fatalf("unexpected target date: %s", got)
	}
	if !strings.Contains(app.Status, "120 天内完成") {
		t.Fatalf("status did not explain the plan update: %s", app.Status)
	}
}

func TestCommandExportAndResponsiveRender(t *testing.T) {
	app := testApp(t)
	exportPath := filepath.Join(t.TempDir(), "backup.json")
	app.Command = "export " + exportPath
	app.Overlay = CommandOverlay
	app.Handle(Key{Name: "enter"})
	if !strings.Contains(app.Status, "已导出") {
		t.Fatalf("unexpected status: %s", app.Status)
	}
	app.Width, app.Height = 140, 32
	view := app.Render()
	for _, expected := range []string{"今日", "复习", "计划", "LEXIGRAPH"} {
		if !strings.Contains(view, expected) {
			t.Fatalf("wide render omitted %q", expected)
		}
	}
	app.Width = 90
	view = app.Render()
	if strings.Contains(view, "╭ 今日 ") || strings.Contains(view, "╭ 计划 ") {
		t.Fatal("compact render retained desktop sidebars")
	}
}

func TestStatsRenderShowsPlanHeatmapAndReviewBuckets(t *testing.T) {
	app := testApp(t)
	app.Screen = StatsScreen
	app.Width, app.Height = 100, 34
	view := app.Render()
	for _, expected := range []string{"LAST 365 DAYS", "UPCOMING REVIEWS", "每日新词", "目标日期", "评分间隔"} {
		if !strings.Contains(view, expected) {
			t.Fatalf("stats render omitted %q", expected)
		}
	}
}
