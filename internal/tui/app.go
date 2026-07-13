package tui

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"github.com/Eurekaimer/lexigraph/internal/core"
	"github.com/Eurekaimer/lexigraph/internal/profile"
)

type Screen int

const (
	StudyScreen Screen = iota
	HistoryScreen
	StatsScreen
	HelpScreen
)

type Overlay int

const (
	NoOverlay Overlay = iota
	MenuOverlay
	CommandOverlay
)

type App struct {
	Words       []core.Word
	Document    profile.Document
	Store       *profile.Store
	Queue       []core.Word
	Screen      Screen
	Overlay     Overlay
	Shown       bool
	Selected    core.Rating
	MenuIndex   int
	Command     string
	Status      string
	HistoryFrom int
	Width       int
	Height      int
	Quit        bool
	now         func() time.Time
}

var menuEntries = []string{
	"继续学习",
	"增加一组新词  +20",
	"导出 JSON",
	"导入 JSON…",
	"撤销上次评分",
	"学习统计",
	"快捷键帮助",
	"保存并退出",
}

func New(words []core.Word, document profile.Document, store *profile.Store) *App {
	app := &App{
		Words:    words,
		Document: document,
		Store:    store,
		Selected: core.Good,
		Width:    100,
		Height:   32,
		now:      time.Now,
	}
	app.Document.State.Normalize(words, app.now())
	app.refresh()
	if err := app.save(); err != nil {
		app.Status = err.Error()
	}
	return app
}

func (app *App) refresh() {
	quota := core.DailyNewQuota(len(app.Words), app.Document.State, app.now())
	app.Queue = core.BuildStudyQueue(app.Words, app.Document.State, app.now(), quota)
}

func (app *App) save() error {
	if err := app.Store.Save(app.Document, app.now()); err != nil {
		return err
	}
	return nil
}

func (app *App) status(message string) {
	app.Status = message
}

func (app *App) apply(rating core.Rating) {
	if len(app.Queue) == 0 {
		app.status("当前队列已经完成；按 + 或在菜单中增加一组。")
		return
	}
	word := app.Queue[0]
	if !app.Document.State.ApplyRating(word.ID, rating, app.now()) {
		app.status("无法保存这次评分。")
		return
	}
	app.Shown = false
	app.Selected = core.Good
	app.refresh()
	if err := app.save(); err != nil {
		app.status("保存失败：" + err.Error())
		return
	}
	app.status("已记录 " + word.Word)
}

func (app *App) undo() {
	if !app.Document.State.Undo() {
		app.status("没有可撤销的评分，或旧记录缺少状态快照。")
		return
	}
	app.Shown = false
	app.refresh()
	if err := app.save(); err != nil {
		app.status("撤销成功，但保存失败：" + err.Error())
		return
	}
	app.status("已恢复上一个单词。")
}

func (app *App) addGroup() {
	plan := app.Document.State.StudyPlan
	if plan == nil {
		fallback := core.DefaultStudyPlan(app.now())
		plan = &fallback
	}
	updated := core.AddExtraGroup(
		*plan,
		len(app.Words),
		app.Document.State.LearnedWords(),
		app.now(),
	)
	app.Document.State.StudyPlan = &updated
	app.refresh()
	if err := app.save(); err != nil {
		app.status("增加成功，但保存失败：" + err.Error())
		return
	}
	app.status("今日计划已增加 20 个新词。")
}

func defaultExportPath() string {
	path, err := profile.ExpandPath("~/lexigraph-profile.json")
	if err != nil {
		return "lexigraph-profile.json"
	}
	return path
}

func (app *App) export(path string) {
	if strings.TrimSpace(path) == "" {
		path = defaultExportPath()
	}
	exported, err := app.Store.Export(app.Document, path, app.now())
	if err != nil {
		app.status("导出失败：" + err.Error())
		return
	}
	app.status("已导出到 " + exported)
}

func (app *App) importProfile(path string) {
	document, err := app.Store.Import(path, app.now())
	if err != nil {
		app.status("导入失败：" + err.Error())
		return
	}
	document.State.Normalize(app.Words, app.now())
	app.Document = document
	app.Shown = false
	app.refresh()
	if err := app.save(); err != nil {
		app.status("导入成功，但规范化保存失败：" + err.Error())
		return
	}
	app.status("学习档案已导入。")
}

func (app *App) executeMenu() {
	app.Overlay = NoOverlay
	switch app.MenuIndex {
	case 0:
		app.Screen = StudyScreen
	case 1:
		app.addGroup()
	case 2:
		app.export("")
	case 3:
		app.Overlay = CommandOverlay
		app.Command = "import "
	case 4:
		app.undo()
	case 5:
		app.Screen = StatsScreen
	case 6:
		app.Screen = HelpScreen
	case 7:
		_ = app.save()
		app.Quit = true
	}
}

func splitCommand(command string) (string, string) {
	command = strings.TrimSpace(command)
	if command == "" {
		return "", ""
	}
	name, argument, found := strings.Cut(command, " ")
	if !found {
		return strings.ToLower(name), ""
	}
	return strings.ToLower(name), strings.TrimSpace(argument)
}

func (app *App) executeCommand() {
	name, argument := splitCommand(app.Command)
	app.Command = ""
	app.Overlay = NoOverlay
	switch name {
	case "", "study", "s":
		app.Screen = StudyScreen
	case "add", "+":
		app.addGroup()
	case "undo", "u":
		app.undo()
	case "write", "w":
		if err := app.save(); err != nil {
			app.status("保存失败：" + err.Error())
		} else {
			app.status("已保存到 " + app.Store.Path)
		}
	case "export":
		app.export(argument)
	case "import":
		if argument == "" {
			app.status("用法：:import /path/to/profile.json")
		} else {
			app.importProfile(argument)
		}
	case "history", "h":
		app.Screen = HistoryScreen
	case "stats":
		app.Screen = StatsScreen
	case "help", "?":
		app.Screen = HelpScreen
	case "quit", "q", "wq":
		if name == "wq" {
			_ = app.save()
		}
		app.Quit = true
	default:
		app.status("未知命令：" + name + "；输入 :help 查看帮助。")
	}
}

func (app *App) Handle(key Key) {
	if key.Name == "ctrl+c" {
		_ = app.save()
		app.Quit = true
		return
	}

	if app.Overlay == CommandOverlay {
		switch key.Name {
		case "enter":
			app.executeCommand()
		case "esc":
			app.Command = ""
			app.Overlay = NoOverlay
		case "backspace":
			if len(app.Command) > 0 {
				runes := []rune(app.Command)
				app.Command = string(runes[:len(runes)-1])
			}
		default:
			if key.Rune != 0 && unicode.IsPrint(key.Rune) {
				app.Command += string(key.Rune)
			}
		}
		return
	}

	if app.Overlay == MenuOverlay {
		switch key.Rune {
		case 'j':
			app.MenuIndex = (app.MenuIndex + 1) % len(menuEntries)
		case 'k':
			app.MenuIndex = (app.MenuIndex - 1 + len(menuEntries)) % len(menuEntries)
		case 'h':
			app.Overlay = NoOverlay
		case 'l':
			app.executeMenu()
		}
		if key.Name == "enter" {
			app.executeMenu()
		} else if key.Name == "esc" {
			app.Overlay = NoOverlay
		}
		return
	}

	switch key.Rune {
	case ':':
		app.Overlay = CommandOverlay
		app.Command = ""
		return
	case 'm':
		app.Overlay = MenuOverlay
		return
	case '1':
		app.Screen = StudyScreen
		return
	case '2':
		app.Screen = HistoryScreen
		return
	case '3':
		app.Screen = StatsScreen
		return
	case '?':
		app.Screen = HelpScreen
		return
	case 'q':
		_ = app.save()
		app.Quit = true
		return
	}

	if app.Screen == StudyScreen {
		switch key.Rune {
		case 'h':
			app.Selected = (app.Selected + 3) % 4
		case 'l':
			app.Selected = (app.Selected + 1) % 4
		case 'a', 'A':
			app.apply(core.Forgot)
		case 's', 'S':
			app.apply(core.Hard)
		case 'd', 'D':
			app.apply(core.Good)
		case 'w', 'W':
			app.apply(core.Mastered)
		case 'z', 'Z', 'u', 'U':
			app.undo()
		case '+':
			app.addGroup()
		}
		if key.Name == "space" {
			app.Shown = !app.Shown
		} else if key.Name == "enter" {
			app.apply(app.Selected)
		}
		return
	}

	if app.Screen == HistoryScreen {
		switch key.Rune {
		case 'j':
			app.HistoryFrom = min(max(0, len(app.Document.State.History)-1), app.HistoryFrom+1)
		case 'k':
			app.HistoryFrom = max(0, app.HistoryFrom-1)
		case 'z', 'u':
			app.undo()
		}
	}
}

func (app *App) profileLabel(width int) string {
	home, _ := profile.ExpandPath("~")
	path := app.Store.Path
	if home != "" {
		path = strings.Replace(path, home, "~", 1)
	}
	return truncate(filepath.Clean(path), width)
}

func (app *App) String() string {
	return fmt.Sprintf("Lexigraph(%d words, %s)", len(app.Words), app.Store.Path)
}
