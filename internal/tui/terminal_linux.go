//go:build linux

package tui

import (
	"bufio"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"unicode/utf8"
	"unsafe"
)

const (
	tcgets     = 0x5401
	tcsets     = 0x5402
	tiocgwinsz = 0x5413
)

type terminalState struct {
	termios syscall.Termios
}

type windowSize struct {
	rows uint16
	cols uint16
	x    uint16
	y    uint16
}

type Key struct {
	Rune rune
	Name string
}

func ioctl(fd uintptr, request uintptr, value unsafe.Pointer) error {
	_, _, errno := syscall.Syscall(syscall.SYS_IOCTL, fd, request, uintptr(value))
	if errno != 0 {
		return errno
	}
	return nil
}

func enterRaw(fd uintptr) (*terminalState, error) {
	var current syscall.Termios
	if err := ioctl(fd, tcgets, unsafe.Pointer(&current)); err != nil {
		return nil, fmt.Errorf("read terminal mode: %w", err)
	}
	raw := current
	raw.Iflag &^= syscall.BRKINT | syscall.ICRNL | syscall.INPCK | syscall.ISTRIP | syscall.IXON
	raw.Cflag |= syscall.CS8
	raw.Lflag &^= syscall.ECHO | syscall.ICANON | syscall.IEXTEN | syscall.ISIG
	raw.Cc[syscall.VMIN] = 1
	raw.Cc[syscall.VTIME] = 0
	if err := ioctl(fd, tcsets, unsafe.Pointer(&raw)); err != nil {
		return nil, fmt.Errorf("enable raw terminal mode: %w", err)
	}
	return &terminalState{termios: current}, nil
}

func (state *terminalState) restore(fd uintptr) {
	_ = ioctl(fd, tcsets, unsafe.Pointer(&state.termios))
}

func terminalSize(fd uintptr) (int, int) {
	var size windowSize
	if err := ioctl(fd, tiocgwinsz, unsafe.Pointer(&size)); err != nil || size.cols == 0 || size.rows == 0 {
		return 100, 32
	}
	return int(size.cols), int(size.rows)
}

func readKeys(channel chan<- Key) {
	reader := bufio.NewReader(os.Stdin)
	for {
		r, size, err := reader.ReadRune()
		if err != nil {
			close(channel)
			return
		}
		key := Key{Rune: r}
		switch r {
		case 3:
			key.Name = "ctrl+c"
		case 13, 10:
			key.Name = "enter"
		case 27:
			key.Name = "esc"
		case 127, 8:
			key.Name = "backspace"
		case ' ':
			key.Name = "space"
		default:
			if size == 0 || r == utf8.RuneError {
				continue
			}
		}
		channel <- key
	}
}

func Run(app *App) error {
	if info, err := os.Stdin.Stat(); err != nil || info.Mode()&os.ModeCharDevice == 0 {
		return fmt.Errorf("lexigraph requires an interactive terminal")
	}
	fd := os.Stdin.Fd()
	state, err := enterRaw(fd)
	if err != nil {
		return err
	}
	defer state.restore(fd)
	fmt.Print("\x1b[?1049h\x1b[?25l")
	defer fmt.Print("\x1b[?25h\x1b[?1049l")

	keys := make(chan Key, 16)
	go readKeys(keys)
	resize := make(chan os.Signal, 1)
	signal.Notify(resize, syscall.SIGWINCH)
	defer signal.Stop(resize)

	redraw := func() {
		app.Width, app.Height = terminalSize(fd)
		fmt.Print(app.Render())
	}
	redraw()
	for !app.Quit {
		select {
		case key, ok := <-keys:
			if !ok {
				return nil
			}
			app.Handle(key)
			redraw()
		case <-resize:
			redraw()
		}
	}
	return nil
}
