package tui

import (
	"fmt"
	"os"
	"strings"
	"unicode"
)

const reset = "\x1b[0m"

var colorEnabled = os.Getenv("NO_COLOR") == ""

func ansi(code, text string) string {
	if !colorEnabled || text == "" {
		return text
	}
	return "\x1b[" + code + "m" + text + reset
}

func accent(text string) string { return ansi("38;2;102;168;137", text) }
func muted(text string) string  { return ansi("38;2;125;139;132", text) }
func strong(text string) string { return ansi("1;38;2;232;239;235", text) }
func warn(text string) string   { return ansi("38;2;218;174;104", text) }
func inverse(text string) string {
	return ansi("1;38;2;19;34;28;48;2;154;201;176", text)
}

func runeWidth(r rune) int {
	if r == 0 || r == '\n' || r == '\r' || unicode.IsControl(r) {
		return 0
	}
	if r >= 0x1100 && (r <= 0x115f || r == 0x2329 || r == 0x232a ||
		(r >= 0x2e80 && r <= 0xa4cf) || (r >= 0xac00 && r <= 0xd7a3) ||
		(r >= 0xf900 && r <= 0xfaff) || (r >= 0xfe10 && r <= 0xfe6f) ||
		(r >= 0xff00 && r <= 0xff60) || (r >= 0xffe0 && r <= 0xffe6)) {
		return 2
	}
	return 1
}

func displayWidth(text string) int {
	width, escape := 0, false
	for _, r := range text {
		if escape {
			if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
				escape = false
			}
			continue
		}
		if r == '\x1b' {
			escape = true
			continue
		}
		width += runeWidth(r)
	}
	return width
}

func truncate(text string, width int) string {
	if width <= 0 || displayWidth(text) <= width {
		return text
	}
	var result strings.Builder
	used := 0
	for _, r := range text {
		next := runeWidth(r)
		if used+next > width-1 {
			break
		}
		result.WriteRune(r)
		used += next
	}
	return result.String() + "…"
}

func padRight(text string, width int) string {
	text = truncate(text, width)
	return text + strings.Repeat(" ", max(0, width-displayWidth(text)))
}

func center(text string, width int) string {
	text = truncate(text, width)
	left := max(0, (width-displayWidth(text))/2)
	return strings.Repeat(" ", left) + padRight(text, width-left)
}

func box(title string, content []string, width, height int, highlighted bool) []string {
	width = max(width, 8)
	height = max(height, 4)
	inner := width - 2
	border := muted
	if highlighted {
		border = accent
	}
	titleText := " " + title + " "
	topRest := max(0, inner-displayWidth(titleText))
	result := []string{border("╭") + accent(titleText) + border(strings.Repeat("─", topRest)+"╮")}
	for index := 0; index < height-2; index++ {
		line := ""
		if index < len(content) {
			line = content[index]
		}
		result = append(result, border("│")+padRight(line, inner)+border("│"))
	}
	result = append(result, border("╰"+strings.Repeat("─", inner)+"╯"))
	return result
}

func joinColumns(columns ...[]string) []string {
	height := 0
	for _, column := range columns {
		height = max(height, len(column))
	}
	result := make([]string, height)
	for row := 0; row < height; row++ {
		parts := make([]string, len(columns))
		for index, column := range columns {
			if row < len(column) {
				parts[index] = column[row]
			}
		}
		result[row] = strings.Join(parts, " ")
	}
	return result
}

func progress(value, total, width int) string {
	if total < 1 {
		total = 1
	}
	filled := value * width / total
	if filled > width {
		filled = width
	}
	return accent(strings.Repeat("━", filled)) + muted(strings.Repeat("─", width-filled))
}

func percent(value float64) string {
	return fmt.Sprintf("%.0f%%", value*100)
}
