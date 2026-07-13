package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/Eurekaimer/lexigraph/internal/core"
)

var ratingLabels = []struct {
	key   string
	label string
}{
	{"A", "完全忘记"},
	{"S", "回忆困难"},
	{"D", "正常掌握"},
	{"W", "完全掌握"},
}

func (app *App) todayActivity() (int, int) {
	key := core.DateKey(app.now())
	seen := make(map[string]bool)
	newWords, reviews := 0, 0
	for _, event := range app.Document.State.History {
		if len(event.Date) >= 10 && event.Date[:10] == key {
			reviews++
			if !seen[event.WordID] {
				newWords++
			}
		}
		seen[event.WordID] = true
	}
	return newWords, reviews
}

func (app *App) leftPanel(width, height int) []string {
	newWords, reviews := app.todayActivity()
	quota := core.DailyNewQuota(len(app.Words), app.Document.State, app.now())
	barWidth := max(8, width-8)
	content := []string{
		accent(" TODAY") + muted("  "+app.now().Format("01月02日")),
		"",
		strong(" 今日进度"),
		" " + strong(fmt.Sprintf("%d", newWords)) + muted(fmt.Sprintf(" / %d 个新词", quota)),
		" " + progress(newWords, quota, barWidth),
		"",
		muted(" 当前队列"),
		" " + strong(fmt.Sprintf("%d", len(app.Queue))),
		muted(" 今日复习"),
		" " + strong(fmt.Sprintf("%d", reviews)),
		"",
		muted("────────────────────"),
		accent(" METHOD"),
		" " + muted("五个词频层均衡抽取"),
		" " + muted("到期词与新词交错出现"),
	}
	return box("今日", content, width, height, app.Screen == StudyScreen)
}

func (app *App) rightPanel(width, height int) []string {
	plan := app.Document.State.StudyPlan
	remaining := 0
	quota := core.DailyNewQuota(len(app.Words), app.Document.State, app.now())
	if plan != nil {
		remaining = core.RemainingDays(*plan, app.now())
	}
	content := []string{
		accent(" DAILY PLAN"),
		"",
		" " + strong(fmt.Sprintf("%d 个新词", quota)),
		" " + muted(fmt.Sprintf("距离目标还有 %d 天", remaining)),
		"",
		muted("────────────────────"),
		accent(" MEMORY"),
		"",
		muted(" 已学习") + "  " + strong(fmt.Sprintf("%d", app.Document.State.LearnedWords())),
		muted(" 正常掌握") + "  " + strong(percent(app.Document.State.RecallRate())),
		muted(" 累计遗忘") + "  " + strong(fmt.Sprintf("%d", app.Document.State.TotalLapses())),
		"",
		muted("────────────────────"),
		accent(" PROFILE"),
		" " + muted(app.profileLabel(width-5)),
		"",
		warn(" 完全掌握会移出自动复习"),
	}
	return box("计划", content, width, height, false)
}

func ratingLine(selected core.Rating, width int) string {
	segmentWidth := max(10, (width-3)/4)
	segments := make([]string, 4)
	for index, option := range ratingLabels {
		text := center(" "+option.key+" "+option.label+" ", segmentWidth)
		if core.Rating(index) == selected {
			segments[index] = inverse(text)
		} else {
			segments[index] = muted(text)
		}
	}
	return strings.Join(segments, " ")
}

func (app *App) studyContent(width, height int) []string {
	if len(app.Queue) == 0 {
		lines := []string{
			"",
			center(accent("SESSION COMPLETE"), width),
			"",
			center(strong("今天的计划已经完成"), width),
			center(muted("按 + 增加 20 个新词，或按 m 打开菜单。"), width),
		}
		return padVertical(lines, height)
	}
	word := app.Queue[0]
	answer := muted("释义已隐藏 · Space 显示")
	if app.Shown {
		answer = strong(word.Meaning)
		if word.Category != "" {
			answer += "  " + muted(word.Category)
		}
	}
	phonetic := word.Phonetic
	if phonetic == "" {
		phonetic = "暂缺音标"
	}
	lines := []string{
		center(accent("ENGLISH WORD"), width),
		"",
		center(ansi("1;38;2;232;239;235", word.Word), width),
		center(accent(phonetic), width),
		"",
		center(answer, width),
		"",
		center(muted("Space 切换释义 · h/l 选择 · Enter 提交"), width),
		"",
		ratingLine(app.Selected, width),
	}
	return padVertical(lines, height)
}

func padVertical(lines []string, height int) []string {
	if len(lines) >= height {
		return lines[:height]
	}
	top := max(0, (height-len(lines))/3)
	result := make([]string, 0, height)
	result = append(result, make([]string, top)...)
	result = append(result, lines...)
	return result
}

func (app *App) wordByID(id string) core.Word {
	for _, word := range app.Words {
		if word.ID == id {
			return word
		}
	}
	return core.Word{ID: id, Word: id, Meaning: "词库中未找到"}
}

func (app *App) historyContent(width, height int) []string {
	content := []string{
		accent("REVIEW LOG") + muted(fmt.Sprintf("  %d 条记录", len(app.Document.State.History))),
		"",
	}
	available := max(1, height-len(content)-1)
	history := app.Document.State.History
	for row := 0; row < available; row++ {
		index := len(history) - 1 - app.HistoryFrom - row
		if index < 0 {
			break
		}
		event := history[index]
		word := app.wordByID(event.WordID)
		label := ratingLabels[int(event.Rating)].label
		date := event.Date
		if parsed, err := time.Parse(time.RFC3339Nano, event.Date); err == nil {
			date = parsed.Local().Format("01-02 15:04")
		}
		line := fmt.Sprintf(" %-18s %-10s %s", word.Word, label, date)
		content = append(content, truncate(line, width))
	}
	if len(history) == 0 {
		content = append(content, muted("还没有复习记录。"))
	}
	content = append(content, "", muted("j/k 滚动 · z 撤销最后一次评分"))
	return content
}

func (app *App) statsContent(width, height int) []string {
	state := app.Document.State
	content := []string{
		accent("LEARNING INSIGHTS"),
		"",
		strong(fmt.Sprintf("%-12s %d", "累计复习", len(state.History))),
		strong(fmt.Sprintf("%-12s %d", "已学习词汇", state.LearnedWords())),
		strong(fmt.Sprintf("%-12s %s", "正常掌握", percent(state.RecallRate()))),
		strong(fmt.Sprintf("%-12s %d", "累计遗忘", state.TotalLapses())),
		"",
		muted("最近 14 天"),
	}
	counts := make([]int, 14)
	start := app.now().UTC().AddDate(0, 0, -13)
	for _, event := range state.History {
		parsed, err := time.Parse(time.RFC3339Nano, event.Date)
		if err != nil {
			continue
		}
		index := int(parsed.UTC().Truncate(24*time.Hour).Sub(start.Truncate(24*time.Hour)).Hours() / 24)
		if index >= 0 && index < len(counts) {
			counts[index]++
		}
	}
	peak := 1
	for _, count := range counts {
		peak = max(peak, count)
	}
	blocks := []rune("▁▂▃▄▅▆▇█")
	var chart strings.Builder
	for _, count := range counts {
		level := count * (len(blocks) - 1) / peak
		chart.WriteRune(blocks[level])
		chart.WriteRune(' ')
	}
	content = append(content, accent(chart.String()), muted("每一列代表一天，颜色高度表示复习量。"))
	return padVertical(content, height)
}

func helpContent(width, height int) []string {
	content := []string{
		accent("KEYBOARD FLOW"),
		"",
		strong("学习"),
		"  Space        显示 / 遮住释义",
		"  h / l        在四档评分之间移动",
		"  Enter        提交当前选中的评分",
		"  A S D W      直接提交四档评分",
		"  Z / U        撤销上一次评分",
		"  +            今日增加一组（20 词）",
		"",
		strong("导航与数据"),
		"  1 / 2 / 3    学习 / 记录 / 统计",
		"  m            操作菜单；j/k 选择，Enter 确认",
		"  :            Vim 式命令行",
		"  q            保存并退出",
		"",
		strong("命令"),
		"  :add                  增加一组",
		"  :export [路径]        导出 JSON",
		"  :import <路径>        导入网页或 TUI 档案",
		"  :write / :w           立即保存",
		"  :history / :stats     切换页面",
		"  :quit / :wq           退出",
	}
	return padVertical(content, height)
}

func (app *App) menuContent(width, height int) []string {
	content := []string{accent("COMMAND MENU"), muted("j/k 移动 · Enter/l 执行 · h/Esc 返回"), ""}
	for index, label := range menuEntries {
		line := fmt.Sprintf(" %d  %s", index+1, label)
		if index == app.MenuIndex {
			content = append(content, inverse(padRight("›"+line, max(10, width-2))))
		} else {
			content = append(content, " "+muted(line))
		}
	}
	return padVertical(content, height)
}

func (app *App) centerPanel(width, height int) []string {
	innerWidth := width - 4
	innerHeight := height - 2
	var title string
	var content []string
	if app.Overlay == MenuOverlay {
		title = "操作菜单"
		content = app.menuContent(innerWidth, innerHeight)
	} else {
		switch app.Screen {
		case StudyScreen:
			title = "复习"
			content = app.studyContent(innerWidth, innerHeight)
		case HistoryScreen:
			title = "最近记录"
			content = app.historyContent(innerWidth, innerHeight)
		case StatsScreen:
			title = "统计"
			content = app.statsContent(innerWidth, innerHeight)
		case HelpScreen:
			title = "帮助"
			content = helpContent(innerWidth, innerHeight)
		}
	}
	return box(title, content, width, height, true)
}

func (app *App) header(width int) []string {
	brand := strong("◆ LEXIGRAPH") + "  " + muted("考研英语 · 本地优先")
	tabs := muted("[1 学习] [2 记录] [3 统计] [? 帮助]")
	space := max(1, width-displayWidth(brand)-displayWidth(tabs))
	return []string{
		padRight(brand+strings.Repeat(" ", space)+tabs, width),
		muted(strings.Repeat("─", width)),
	}
}

func (app *App) Render() string {
	width, height := max(40, app.Width), max(12, app.Height)
	if width < 64 || height < 18 {
		message := center("终端窗口过小，请至少使用 64 × 18。", width)
		return "\x1b[2J\x1b[H" + message
	}
	bodyHeight := height - 4
	var body []string
	if width >= 118 {
		leftWidth := min(29, max(24, width/6))
		rightWidth := min(31, max(26, width/6))
		centerWidth := width - leftWidth - rightWidth - 2
		body = joinColumns(
			app.leftPanel(leftWidth, bodyHeight),
			app.centerPanel(centerWidth, bodyHeight),
			app.rightPanel(rightWidth, bodyHeight),
		)
	} else {
		body = app.centerPanel(width, bodyHeight)
	}
	footer := app.Status
	if footer == "" {
		footer = "Space 释义  h/l 选择  Enter 提交  m 菜单  : 命令  q 退出"
	}
	if app.Overlay == CommandOverlay {
		footer = accent(":" + app.Command + "█")
	} else {
		footer = muted(footer)
	}
	lines := append(app.header(width), body...)
	lines = append(lines, padRight(footer, width), "")
	return "\x1b[2J\x1b[H" + strings.Join(lines, "\n")
}
