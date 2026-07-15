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

func (app *App) dueReviewCount(now time.Time) int {
	total := 0
	for _, review := range app.Document.State.Reviews {
		if review.Mastered {
			continue
		}
		dueAt, err := time.Parse(time.RFC3339Nano, review.Due)
		if err != nil || !dueAt.After(now) {
			total++
		}
	}
	return total
}

func (app *App) dueBuckets(now time.Time) (int, int, int, int) {
	today, _ := time.Parse("2006-01-02", core.DateKey(now))
	tomorrow := today.AddDate(0, 0, 1)
	weekEnd := today.AddDate(0, 0, 7)
	todayCount, tomorrowCount, weekCount, mastered := 0, 0, 0, 0
	for _, review := range app.Document.State.Reviews {
		if review.Mastered {
			mastered++
			continue
		}
		dueAt, err := time.Parse(time.RFC3339Nano, review.Due)
		if err != nil {
			todayCount++
			weekCount++
			continue
		}
		dueDay, _ := time.Parse("2006-01-02", core.DateKey(dueAt))
		switch {
		case !dueDay.After(today):
			todayCount++
			weekCount++
		case dueDay.Equal(tomorrow):
			tomorrowCount++
			weekCount++
		case dueDay.Before(weekEnd) || dueDay.Equal(weekEnd):
			weekCount++
		}
	}
	return todayCount, tomorrowCount, weekCount, mastered
}

func intervalLabel(days float64) string {
	switch {
	case days <= 0:
		return "现在"
	case days < 1:
		minutes := int(days*24*60 + 0.5)
		if minutes < 1 {
			minutes = 1
		}
		if minutes >= 60 {
			return fmt.Sprintf("%d 小时", int(float64(minutes)/60+0.5))
		}
		return fmt.Sprintf("%d 分钟", minutes)
	case days < 2:
		return "1 天"
	case days < 30:
		return fmt.Sprintf("%.0f 天", days)
	case days < 365:
		return fmt.Sprintf("%.1f 月", days/30)
	default:
		return fmt.Sprintf("%.1f 年", days/365)
	}
}

func nextIntervalLabel(previous core.Review, rating core.Rating, now time.Time) string {
	if rating == core.Mastered {
		return "移出复习"
	}
	next := core.Schedule(previous, rating, now)
	return intervalLabel(next.Interval)
}

func (app *App) plan() core.StudyPlan {
	if app.Document.State.StudyPlan != nil {
		return *app.Document.State.StudyPlan
	}
	return core.DefaultStudyPlan(app.now())
}

func (app *App) leftPanel(width, height int) []string {
	newWords, reviews := app.todayActivity()
	quota := core.DailyNewQuota(len(app.Words), app.Document.State, app.now())
	dueReviews := app.dueReviewCount(app.now())
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
		muted(" 已到期复习"),
		" " + strong(fmt.Sprintf("%d", dueReviews)),
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
	plan := app.plan()
	remaining := core.RemainingDays(plan, app.now())
	quota := core.DailyNewQuota(len(app.Words), app.Document.State, app.now())
	learned := app.Document.State.LearnedWords()
	remainingWords := max(0, len(app.Words)-learned)
	extraGroups := plan.ExtraGroups[core.DateKey(app.now())]
	content := []string{
		accent(" DAILY PLAN"),
		"",
		" " + strong(fmt.Sprintf("%d 个新词", quota)),
		" " + muted(fmt.Sprintf("%d 天内完成", remaining)),
		" " + muted("目标日期 ") + strong(plan.TargetDate),
		" " + muted(fmt.Sprintf("剩余词汇 %d", remainingWords)),
		" " + muted(fmt.Sprintf("今日加组 +%d", extraGroups*20)),
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
	review := app.Document.State.Reviews[word.ID]
	preview := fmt.Sprintf(
		"A %s · S %s · D %s · W %s",
		nextIntervalLabel(review, core.Forgot, app.now()),
		nextIntervalLabel(review, core.Hard, app.now()),
		nextIntervalLabel(review, core.Good, app.now()),
		nextIntervalLabel(review, core.Mastered, app.now()),
	)
	currentInterval := "首次学习"
	if review.Repetitions > 0 || review.Interval > 0 {
		currentInterval = "当前间隔 " + intervalLabel(review.Interval)
	}
	lines := []string{
		center(accent("ENGLISH WORD"), width),
		"",
		center(ansi("1;38;2;232;239;235", word.Word), width),
		center(accent(phonetic), width),
		"",
		center(answer, width),
		"",
		center(muted(currentInterval), width),
		center(muted("下次复习：")+accent(preview), width),
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

func monthName(month time.Month) string {
	names := [...]string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	return names[int(month)-1]
}

func heatLevel(count, peak int) int {
	if count <= 0 {
		return 0
	}
	if peak < 1 {
		peak = 1
	}
	level := 1 + count*4/peak
	if level > 4 {
		level = 4
	}
	return level
}

func heatCell(count, peak int) string {
	switch heatLevel(count, peak) {
	case 0:
		return ansi("38;2;45;56;50", "■")
	case 1:
		return ansi("38;2;49;95;68", "■")
	case 2:
		return ansi("38;2;69;139;91", "■")
	case 3:
		return ansi("38;2;102;168;137", "■")
	default:
		return ansi("38;2;154;201;176", "■")
	}
}

func (app *App) heatmapLines(width int, now time.Time) []string {
	weeks := min(53, max(16, width-5))
	today, _ := time.Parse("2006-01-02", core.DateKey(now))
	end := today.AddDate(0, 0, 6-int(today.Weekday()))
	start := end.AddDate(0, 0, -(weeks*7 - 1))
	counts := make(map[string]int)
	for _, event := range app.Document.State.History {
		parsed, err := time.Parse(time.RFC3339Nano, event.Date)
		if err != nil {
			continue
		}
		counts[core.DateKey(parsed)]++
	}
	peak := 1
	for _, count := range counts {
		peak = max(peak, count)
	}

	monthRow := []rune(strings.Repeat(" ", weeks))
	lastMonth := time.Month(0)
	for week := 0; week < weeks; week++ {
		date := start.AddDate(0, 0, week*7)
		if date.After(today) {
			continue
		}
		if date.Month() != lastMonth && date.Day() <= 7 {
			label := monthName(date.Month())
			for offset, r := range label {
				if week+offset < len(monthRow) {
					monthRow[week+offset] = r
				}
			}
			lastMonth = date.Month()
		}
	}

	lines := []string{"    " + muted(string(monthRow))}
	labels := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	for day := 0; day < 7; day++ {
		var row strings.Builder
		row.WriteString(muted(labels[day] + " "))
		for week := 0; week < weeks; week++ {
			date := start.AddDate(0, 0, week*7+day)
			if date.After(today) {
				row.WriteByte(' ')
				continue
			}
			row.WriteString(heatCell(counts[core.DateKey(date)], peak))
		}
		lines = append(lines, row.String())
	}
	legend := muted("Less ") + heatCell(0, peak) + heatCell(1, peak) + heatCell(max(2, peak/3), peak) + heatCell(max(3, peak*2/3), peak) + heatCell(peak, peak) + muted(" More")
	lines = append(lines, "    "+legend)
	return lines
}

func metricLine(width int, pairs ...[2]string) string {
	if len(pairs) == 0 {
		return ""
	}
	gap := 2
	segmentWidth := max(14, (width-gap*(len(pairs)-1))/len(pairs))
	segments := make([]string, 0, len(pairs))
	for _, pair := range pairs {
		segments = append(segments, padRight(strong(pair[0])+" "+muted(pair[1]), segmentWidth))
	}
	return truncate(strings.Join(segments, strings.Repeat(" ", gap)), width)
}

func (app *App) statsContent(width, height int) []string {
	state := app.Document.State
	plan := app.plan()
	remaining := core.RemainingDays(plan, app.now())
	quota := core.DailyNewQuota(len(app.Words), state, app.now())
	todayDue, tomorrowDue, weekDue, _ := app.dueBuckets(app.now())
	content := []string{
		accent("LEARNING INSIGHTS"),
		"",
		metricLine(width,
			[2]string{fmt.Sprintf("%d", len(state.History)), "累计复习"},
			[2]string{fmt.Sprintf("%d", state.LearnedWords()), "已学习"},
			[2]string{percent(state.RecallRate()), "正常掌握"},
			[2]string{fmt.Sprintf("%d", state.TotalLapses()), "累计遗忘"},
		),
		metricLine(width,
			[2]string{fmt.Sprintf("%d", quota), "每日新词"},
			[2]string{fmt.Sprintf("%d", remaining), "剩余天数"},
			[2]string{plan.TargetDate, "目标日期"},
		),
		"",
		accent("LAST 365 DAYS") + muted("  GitHub-style review activity"),
	}
	content = append(content, app.heatmapLines(width, app.now())...)
	content = append(content,
		"",
		accent("UPCOMING REVIEWS"),
		metricLine(width,
			[2]string{fmt.Sprintf("%d", todayDue), "今天到期"},
			[2]string{fmt.Sprintf("%d", tomorrowDue), "明天到期"},
			[2]string{fmt.Sprintf("%d", weekDue), "7 天内"},
		),
		muted("评分间隔：A 约 30 分钟；S 保守延长；D 1 天、3 天后按熟练度延长；W 移出自动复习。"),
	)
	for len(content) < height {
		content = append(content, "")
	}
	return content
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
		"  :days 120             设置多少天内学完",
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
