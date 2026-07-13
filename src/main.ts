import "@fontsource-variable/newsreader";
import "@fontsource-variable/noto-sans-sc";
import "./tokens.css";
import "./style.css";
import "./docs.css";
import "./history.css";
import "./spelling.css";
import "./search.css";
import "./plan.css";
import "./stats.css";
import { loadWords } from "./data";
import { graph, initial, schedule } from "./logic";
import {
  bindShortcutListener,
  defaultKeymap,
  displayKey,
  keymapConflicts,
} from "./keymap";
import { createStorage, normalizeState } from "./storage";
import { recallRate, todayStudyActivity } from "./stats";
import { AnkiTsvExportAdapter, JsonExportAdapter, download } from "./export";
import { buildStudyQueue } from "./queue";
import { searchWords } from "./search";
import { renderDocsView } from "./docs-view";
import { escapeHtml } from "./html";
import { buildReviewHeatmap, heatmapColor } from "./heatmap";
import {
  addExtraGroup,
  dailyNewQuota,
  defaultStudyPlan,
  remainingDays,
  setTargetDays,
} from "./plan";
import {
  icon,
  ratingOptions,
  renderAppShell,
} from "./ui";
import type { Route } from "./ui";
import {
  renderCompletionView,
  renderSpellingView,
  renderStudyView,
} from "./study-view";
import { buildStudyInsights } from "./study-insights";
import type { Action, Keymap, Rating } from "./types";

// ?debug provides an on-page trace when an extension intercepts study keys.
if (/[?&]debug(?:$|&)/.test(location.search)) {
  (window as any).__LEXI_DEBUG__ = true;
}

const words = await loadWords();
const storage = await createStorage();
const loaded = await storage.load();
let state = loaded.state;
let keymap: Keymap = { ...defaultKeymap, ...loaded.keymap };
let route: Route = "study";
let shown = false;
let spellingEnabled =
  localStorage.getItem("lexigraph-spelling-mode") === "true";
let spellingTarget: string | null = null;
let dictionaryQuery = "";
let historyQuery = "";
state.studyPlan ??= defaultStudyPlan();

for (const word of words) state.reviews[word.id] ??= initial(word.id);
const save = () => void storage.save(state, keymap);
const dueWords = () =>
  buildStudyQueue(words, state, new Date(), dailyNewQuota(words.length, state));
save();

const ratingLabels = ratingOptions.map((option) => option.label);

function frame(content: string) {
  const utility =
    route === "study"
      ? dictionaryPanel()
      : route === "history"
        ? historySearchPanel()
        : "";
  const planner =
    route === "data"
      ? `<section class="plan-settings card surface-section"><div class="section-icon">${icon("clock")}</div><div><span class="eyebrow">STUDY PLAN</span><h2>学习计划</h2><p class="muted">系统会按照剩余词量和目标日期，自动计算每天需要学习的新词。</p><form data-plan-form><label>计划在 <input name="days" type="number" min="1" value="${remainingDays(state.studyPlan!)}" aria-label="完成计划所需天数"> 天内完成</label><button class="soft primary">更新计划</button></form><div class="plan-result">当前基础计划：每天约 ${dailyNewQuota(words.length, { ...state, studyPlan: { ...state.studyPlan!, extraGroups: {} } })} 个新词</div></div></section>`
      : "";
  return renderAppShell({
    route,
    keymap,
    utility: utility + planner,
    content,
  });
}

function dictionaryPanel() {
  const results = searchWords(words, dictionaryQuery, 8);
  return `<section class="dictionary-search" aria-label="词典与数据工具">
    <div class="study-toolbar">
      <form class="word-search" data-dictionary-form role="search">
        ${icon("search", "search-icon")}
        <input name="query" value="${escapeHtml(dictionaryQuery)}" aria-label="搜索大纲单词" placeholder="查单词、释义或近似拼写">
        <button type="submit">搜索</button>
      </form>
      <div class="toolbar-actions">
        <button type="button" class="icon-button" data-undo title="撤销上次评分">${icon("undo")}<span>撤销</span><kbd>${displayKey(keymap.undo)}</kbd></button>
        <button type="button" class="icon-button" data-json title="导出学习数据">${icon("download")}<span>导出</span></button>
        <label class="icon-button" title="导入学习数据">${icon("upload")}<span>导入</span><input hidden type="file" accept="application/json" data-import></label>
      </div>
    </div>
    ${dictionaryQuery ? `<div class="search-results" aria-live="polite">${results.map((result) => `<div><b>${escapeHtml(result.word.word)}</b><span>${escapeHtml(result.word.meaning)}</span><small>${result.reason}</small></div>`).join("") || '<p class="empty-inline">没有找到相近的词。</p>'}</div>` : ""}
  </section>`;
}

function historySearchPanel() {
  return `<section class="dictionary-search compact"><form class="word-search" data-history-form role="search">${icon("search", "search-icon")}<input name="query" value="${escapeHtml(historyQuery)}" aria-label="搜索已经复习过的单词" placeholder="搜索已经复习过的单词"><button type="submit">搜索</button></form></section>`;
}

function studyView() {
  if (spellingTarget) {
    return frame(renderSpellingView(words.find((word) => word.id === spellingTarget)?.meaning ?? ""));
  }
  const queue = dueWords();
  const word = queue[0];
  if (!word) return frame(renderCompletionView());

  const quota = dailyNewQuota(words.length, state);
  const activity = todayStudyActivity(state);
  const insights = buildStudyInsights(state);
  return frame(renderStudyView({
    word,
    keymap,
    queueLength: queue.length,
    quota,
    newWordsToday: activity.newWords,
    reviewsToday: activity.reviews,
    daysRemaining: remainingDays(state.studyPlan!),
    dateLabel: new Date().toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
    }),
    isNewWord: !state.history.some((event) => event.wordId === word.id),
    answerShown: shown,
    insights,
  }));
}

function historyView() {
  const learnedIds = new Set(state.history.map((event) => event.wordId));
  const matchedIds = new Set(
    searchWords(
      words.filter((word) => learnedIds.has(word.id)),
      historyQuery,
      100,
    ).map((result) => result.word.id),
  );
  const recent = [...state.history]
    .reverse()
    .filter((event) => !historyQuery || matchedIds.has(event.wordId))
    .slice(0, 100);
  const rows = recent
    .map((event) => {
      const word = words.find((item) => item.id === event.wordId);
      if (!word) return "";
      return `<div class="history-row"><div><b>${escapeHtml(word.word)}</b><span class="history-meaning">${escapeHtml(word.meaning)}</span></div><div class="history-meta"><span class="rating rating-${event.rating}">${ratingLabels[event.rating]}</span><time>${new Date(event.date).toLocaleString("zh-CN")}</time></div><div class="rerate">${ratingLabels.map((label, rating) => `<button data-rerate="${rating}" data-word="${word.id}" title="${label}">${displayKey(keymap[["forgot", "hard", "good", "easy"][rating] as Action])}</button>`).join("")}</div></div>`;
    })
    .join("");
  const forgotten = Object.values(state.reviews)
    .filter((review) => review.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 20);
  return frame(
    `<div class="page-heading"><span class="eyebrow">REVIEW LOG</span><h1>复习记录</h1><p class="muted">检查近期评分、重新标记，或精确撤销最后一次操作。</p></div><div class="history-layout"><section class="card history-card"><div class="section-title"><div><span class="section-caption">最近活动</span><h2>最近 100 条</h2></div><button type="button" class="soft" data-undo>${icon("undo")} 撤销最后一次 <kbd>${displayKey(keymap.undo)}</kbd></button></div>${rows || '<div class="empty-state"><p>还没有复习记录。</p><span>完成第一个单词后，评分会显示在这里。</span></div>'}</section><aside class="card weak-list"><span class="section-caption">MEMORY FRICTION</span><h2>经常遗忘</h2><p class="muted weak-intro">按累计遗忘次数排序，帮助你快速找到薄弱词汇。</p>${forgotten.map((review) => `<div class="pair"><span>${escapeHtml(words.find((word) => word.id === review.wordId)?.word ?? review.wordId)}</span><b>${review.lapses} 次</b></div>`).join("") || '<p class="muted">暂无遗忘记录。</p>'}</aside></div>`,
  );
}

function graphView() {
  const weakIds = new Set(
    Object.values(state.reviews)
      .filter((review) => review.lapses > 0)
      .map((review) => review.wordId),
  );
  const candidates = words.filter((word) => weakIds.has(word.id)).slice(0, 250);
  for (const mistake of state.mistakes)
    for (const id of [mistake.from, mistake.to]) {
      const word = words.find((item) => item.id === id);
      if (word && !candidates.includes(word)) candidates.push(word);
    }
  const pairs = graph(
    candidates.length > 1 ? candidates : words.slice(0, 250),
    state,
  ).slice(0, 30);
  return frame(
    `<div class="page-heading"><span class="eyebrow">CONFUSION GRAPH</span><h1>易混词图谱</h1><p class="muted">依据拼写相似度与真实误认记录构建关联，不把相关性误写成因果关系。</p></div><section class="card graph-card"><div class="section-title"><div><span class="section-caption">PERSONAL CONNECTIONS</span><h2>高权重连接</h2></div><span class="tag">${pairs.length} 组</span></div>${pairs.map((item) => `<div class="pair graph-pair"><div class="word-pair"><b>${escapeHtml(item.a.word)}</b><i>${icon("graph")}</i><b>${escapeHtml(item.b.word)}</b></div><div class="graph-meta"><span>拼写距离 ${item.d}${item.m ? ` · 误认 ${item.m} 次` : ""}</span><strong>${item.score.toFixed(2)}</strong></div></div>`).join("") || '<div class="empty-state"><p>尚未形成个性化连接</p><span>产生遗忘或误认记录后，系统会逐步构建你的易混词网络。</span></div>'}</section>`,
  );
}

function statsView() {
  const heatmap = buildReviewHeatmap(state);
  const monthRow = `<div class="heat-month-row" style="grid-template-columns:repeat(${heatmap.weeks},1fr)">${heatmap.monthLabels.map((month) => `<span style="grid-column:${month.column + 1}">${month.label}</span>`).join("")}</div>`;
  const cells = heatmap.cells
    .map((cell) =>
      cell.count === null
        ? '<span class="heat-cell empty"></span>'
        : `<span class="heat-cell" style="background:${heatmapColor(cell.count)}" title="${cell.label}: ${cell.count} 次复习"></span>`,
    )
    .join("");
  const legend = [0, 1, 4, 9, 16]
    .map(
      (count) =>
        `<span class="heat-legend-swatch" style="background:${heatmapColor(count)}"></span>`,
    )
    .join("");
  return frame(
    `<div class="page-heading"><span class="eyebrow">LEARNING INSIGHTS</span><h1>学习统计</h1><p class="muted">用一整年的活动趋势判断节奏，不被单日波动干扰。</p></div><div class="overview-stats"><div class="stat"><span class="stat-icon">${icon("history")}</span><b>${state.history.length}</b><small>累计复习</small></div><div class="stat"><span class="stat-icon">${icon("stats")}</span><b>${(recallRate(state) * 100).toFixed(1)}%</b><small>正常或熟练</small></div><div class="stat"><span class="stat-icon">${icon("spark")}</span><b>${Object.values(state.reviews).reduce((sum, review) => sum + review.lapses, 0)}</b><small>累计遗忘</small></div></div><section class="card heatmap-card"><div class="section-title"><div><span class="section-caption">LAST 365 DAYS</span><h2>复习热力图</h2></div><span class="muted">${heatmap.startYear} – ${heatmap.endYear}</span></div><div class="heatmap-scroll" tabindex="0" aria-label="横向滚动查看全年复习热力图"><div class="heatmap-canvas">${monthRow}<div class="heatmap-grid" style="grid-template-columns:repeat(${heatmap.weeks},1fr)" role="img" aria-label="过去 365 天每天的复习次数">${cells}</div><div class="heat-legend">少 ${legend} 多</div></div></div></section>`,
  );
}

function dataView() {
  const conflicts = keymapConflicts(keymap);
  const actionLabels: Record<Action, string> = {
    reveal: "显示或遮住释义 / Reveal",
    forgot: "完全忘记 / Forgot",
    hard: "回忆困难 / Hard",
    good: "正常掌握 / Good",
    easy: "完全掌握 / Mastered",
    undo: "撤销上次评分 / Undo",
    study: "学习页 / Study",
    history: "最近复习 / History",
    graph: "易混词 / Graph",
    stats: "学习统计 / Statistics",
    data: "数据设置 / Data",
    docs: "使用文档 / Docs",
    help: "快捷键帮助 / Help",
  };
  const mappings = (Object.keys(keymap) as Action[])
    .map(
      (action) =>
        `<label class="pair"><span>${actionLabels[action]}</span><input data-key="${action}" value="${displayKey(keymap[action])}" maxlength="8"></label>`,
    )
    .join("");
  return frame(
    `<div class="page-heading"><span class="eyebrow">PREFERENCES</span><h1>数据与设置</h1><p class="muted">管理个人学习档案、可选功能与键盘工作流。</p></div>
    <div class="settings-grid">
      <section class="card settings-section"><div class="settings-heading"><span class="section-icon">${icon("file")}</span><div><span class="section-caption">PROFILE</span><h2>学习数据</h2></div><span class="tag">${words.length} 词</span></div><p class="muted">Pages 将进度保存在当前浏览器；本地模式自动写入 <code>profiles/default.json</code>。</p><div class="actions"><button type="button" class="soft primary" data-json>${icon("download")} 导出 JSON</button><label class="soft">${icon("upload")} 导入 JSON<input hidden type="file" accept="application/json" data-import></label></div></section>
      <section class="card settings-section"><div class="settings-heading"><span class="section-icon">${icon("spark")}</span><div><span class="section-caption">OPTIONAL FEATURES</span><h2>可选功能</h2></div></div><div class="toggle-list"><label class="toggle-row"><span><b>遗忘词拼写练习</b><small>在“完全忘记”后追加拼写，不改变评分</small></span><input type="checkbox" data-spelling-toggle ${spellingEnabled ? "checked" : ""}></label><label class="toggle-row"><span><b>Anki 导出</b><small>为已学习词汇生成 UTF-8 TSV 文件</small></span><input type="checkbox" data-anki></label><button type="button" class="soft hidden" data-anki-export>导出 Anki TSV</button></div></section>
      <section class="card settings-section keymap-section"><div class="settings-heading"><span class="section-icon">${icon("settings")}</span><div><span class="section-caption">KEYBOARD</span><h2>自定义键盘映射</h2></div></div><p class="muted">字母键优先识别物理键位，不受大小写、Shift 或输入法状态影响。</p>${conflicts.length ? '<p class="warning">存在重复键位，请调整映射。</p>' : ""}<div class="keymap-list">${mappings}</div></section>
    </div>`,
  );
}

function docsView() {
  return frame(renderDocsView());
}

function render() {
  const views = {
    study: studyView,
    history: historyView,
    graph: graphView,
    stats: statsView,
    data: dataView,
    docs: docsView,
  };
  document.querySelector("#app")!.innerHTML = views[route]();
  bind();
}

function bind() {
  document.querySelectorAll<HTMLElement>("[data-add-group]").forEach((button) =>
    button.addEventListener("click", () => {
      const studied = new Set(state.history.map((event) => event.wordId)).size;
      state.studyPlan = addExtraGroup(
        state.studyPlan!,
        words.length,
        studied,
      );
      save();
      render();
    }),
  );
  document
    .querySelector<HTMLFormElement>("[data-plan-form]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const days = Number(
        new FormData(event.currentTarget as HTMLFormElement).get("days"),
      );
      state.studyPlan = setTargetDays(state.studyPlan!, days);
      save();
      render();
    });
  document
    .querySelector<HTMLFormElement>("[data-dictionary-form]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      dictionaryQuery = String(
        new FormData(event.currentTarget as HTMLFormElement).get("query") ?? "",
      );
      render();
    });
  document
    .querySelector<HTMLFormElement>("[data-history-form]")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      historyQuery = String(
        new FormData(event.currentTarget as HTMLFormElement).get("query") ?? "",
      );
      render();
    });
  document.querySelectorAll<HTMLElement>("[data-route]").forEach(
    (element) =>
      (element.onclick = () => {
        route = element.dataset.route as Route;
        render();
      }),
  );
  document
    .querySelector<HTMLElement>("[data-show]")
    ?.addEventListener("click", () => {
      shown = !shown;
      render();
    });
  document.querySelectorAll<HTMLElement>("[data-rate]").forEach(
    (element) =>
      (element.onclick = () => {
        const word = dueWords()[0];
        if (word) applyRating(word.id, Number(element.dataset.rate) as Rating);
      }),
  );
  document
    .querySelectorAll<HTMLElement>("[data-rerate]")
    .forEach(
      (element) =>
        (element.onclick = () =>
          applyRating(
            element.dataset.word!,
            Number(element.dataset.rerate) as Rating,
          )),
    );
  document
    .querySelectorAll<HTMLElement>("[data-undo]")
    .forEach((element) => (element.onclick = undoLastRating));
  const spellingInput =
    document.querySelector<HTMLInputElement>("[data-spelling]");
  spellingInput?.focus();
  spellingInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !spellingTarget) return;
    const correct = words
      .find((word) => word.id === spellingTarget)
      ?.word.toLowerCase();
    const feedback = document.querySelector<HTMLElement>(
      "[data-spelling-feedback]",
    );
    if (spellingInput.value.trim().toLowerCase() === correct) {
      if (feedback) feedback.textContent = "正确";
      setTimeout(() => {
        spellingTarget = null;
        render();
      }, 350);
    } else if (feedback)
      feedback.textContent = `还不正确，再试一次。答案共 ${correct?.length ?? 0} 个字母。`;
  });
  document
    .querySelector<HTMLElement>("[data-spelling-skip]")
    ?.addEventListener("click", () => {
      spellingTarget = null;
      render();
    });
  document
    .querySelector<HTMLInputElement>("[data-spelling-toggle]")
    ?.addEventListener("change", (event) => {
      spellingEnabled = (event.target as HTMLInputElement).checked;
      localStorage.setItem("lexigraph-spelling-mode", String(spellingEnabled));
    });
  document
    .querySelector<HTMLElement>("[data-json]")
    ?.addEventListener("click", () =>
      download(
        new JsonExportAdapter().export(words, state),
        "lexigraph-profile.json",
      ),
    );
  const toggle = document.querySelector<HTMLInputElement>("[data-anki]");
  const ankiButton = document.querySelector<HTMLElement>("[data-anki-export]");
  toggle?.addEventListener("change", () =>
    ankiButton?.classList.toggle("hidden", !toggle.checked),
  );
  ankiButton?.addEventListener("click", () =>
    download(
      new AnkiTsvExportAdapter().export(words, state),
      "lexigraph-anki.tsv",
    ),
  );
  document.querySelectorAll<HTMLInputElement>("[data-key]").forEach((input) =>
    input.addEventListener("change", () => {
      const action = input.dataset.key as Action,
        value = input.value.trim();
      if (value)
        keymap[action] =
          value.toUpperCase() === "SPACE" ? " " : value.toLowerCase();
      save();
      render();
    }),
  );
  document
    .querySelector<HTMLInputElement>("[data-import]")
    ?.addEventListener("change", async (event) => {
      try {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const backup = JSON.parse(await file.text());
        state = normalizeState(backup.state);
        keymap = { ...defaultKeymap, ...backup.keymap };
        for (const word of words) state.reviews[word.id] ??= initial(word.id);
        save();
        render();
      } catch {
        alert("备份文件无效");
      }
    });
}

function applyRating(wordId: string, rating: Rating) {
  const previous = structuredClone(state.reviews[wordId]);
  if (!previous) return;
  state.reviews[wordId] = schedule(previous, rating);
  state.history.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    wordId,
    rating,
    previousReview: previous,
  });
  if (rating === 0 && spellingEnabled) spellingTarget = wordId;
  shown = false;
  save();
  render();
}

function undoLastRating() {
  const event = state.history.at(-1);
  if (!event) return;
  if (!event.previousReview) {
    alert("这条记录来自旧版数据，没有可恢复的状态快照。");
    return;
  }
  state.reviews[event.wordId] = event.previousReview;
  state.history.pop();
  spellingTarget = null;
  route = "study";
  shown = false;
  save();
  render();
}

bindShortcutListener(
  window,
  () => keymap,
  (action, event) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    if (action === "reveal") {
      shown = !shown;
      return render();
    }
    const ratings = { forgot: 0, hard: 1, good: 2, easy: 3 } as const;
    if (action in ratings) {
      const word = dueWords()[0];
      if (word) applyRating(word.id, ratings[action as keyof typeof ratings]);
      return;
    }
    if (action === "undo") return undoLastRating();
    const routes: Partial<Record<Action, Route>> = {
      study: "study",
      history: "history",
      graph: "graph",
      stats: "stats",
      data: "data",
      docs: "docs",
    };
    if (routes[action]) {
      route = routes[action]!;
      render();
    }
  },
);

document.addEventListener(
  "keydown",
  (event) => {
    if (!(window as any).__LEXI_DEBUG__) return;
    const bar = document.getElementById("lexi-key-debug");
    if (!bar) return;
    bar.style.display = "block";
    bar.textContent = `[raw] key="${event.key}" code="${event.code}" target=${String(event.target?.constructor?.name ?? "?")}`;
    bar.style.color = "#c4d4cc";
  },
  { capture: true },
);

const debugBar = document.createElement("div");
debugBar.id = "lexi-key-debug";
Object.assign(debugBar.style, {
  position: "fixed",
  bottom: "0",
  left: "0",
  right: "0",
  background: "#17241f",
  color: "#c4d4cc",
  font: "12px monospace",
  padding: "5px 12px",
  zIndex: "999",
  display: "none",
  opacity: "0.96",
});
document.body.appendChild(debugBar);

render();
