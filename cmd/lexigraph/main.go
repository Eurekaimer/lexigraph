package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/Eurekaimer/lexigraph/internal/profile"
	"github.com/Eurekaimer/lexigraph/internal/tui"
	"github.com/Eurekaimer/lexigraph/internal/vocab"
)

var version = "dev"

func fail(err error) {
	fmt.Fprintln(os.Stderr, "lexigraph:", err)
	os.Exit(1)
}

func main() {
	profilePath := flag.String("profile", "", "学习档案路径（默认使用 XDG_DATA_HOME）")
	vocabularyPath := flag.String("vocab", "", "netem.json 词库路径")
	importPath := flag.String("import", "", "启动前导入 JSON 档案")
	exportPath := flag.String("export", "", "导出 JSON 后退出")
	showVersion := flag.Bool("version", false, "显示版本")
	flag.Parse()

	if *showVersion {
		fmt.Println("lexigraph", version)
		return
	}

	resolvedVocabulary, err := vocab.Resolve(*vocabularyPath)
	if err != nil {
		fail(err)
	}
	words, err := vocab.Load(resolvedVocabulary)
	if err != nil {
		fail(err)
	}
	store, err := profile.New(*profilePath)
	if err != nil {
		fail(err)
	}
	now := time.Now()
	document, err := store.Load(now)
	if err != nil {
		fail(err)
	}
	if *importPath != "" {
		document, err = store.Import(*importPath, now)
		if err != nil {
			fail(err)
		}
	}
	document.State.Normalize(words, now)
	if err := store.Save(document, now); err != nil {
		fail(err)
	}
	if *exportPath != "" {
		path, err := store.Export(document, *exportPath, now)
		if err != nil {
			fail(err)
		}
		fmt.Println(path)
		return
	}

	if err := tui.Run(tui.New(words, document, store)); err != nil {
		fail(err)
	}
}
