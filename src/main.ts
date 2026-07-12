import "./style.css";
import "./docs.css";
import "./history.css";
import "./spelling.css";
import "./notice.css";
import "./search.css";
import "./plan.css";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/noto-sans-sc";
import { loadWords } from "./data";
import { graph, initial, schedule } from "./logic";
import {
  bindShortcutListener,
  defaultKeymap,
  displayKey,
  keymapConflicts,
} from "./keymap";
import { createStorage, normalizeState } from "./storage";
import { dailyReviews, recallRate } from "./stats";
import { AnkiTsvExportAdapter, JsonExportAdapter, download } from "./export";
import { buildStudyQueue } from "./queue";
import { searchWords } from "./search";
import { renderDocsView } from "./docs-view";
import {
  addExtraGroup,
  dailyNewQuota,
  defaultStudyPlan,
  remainingDays,
  setTargetDays,
} from "./plan";
import type { Action, Keymap, Rating } from "./types";

type Route = "study" | "history" | "graph" | "stats" | "data" | "docs";

// Enable key debug mode via ?debug in the URL (no console needed)
if (typeof window !== "undefined" && /[?&]debug(?:$|&)/.test(location.search)) {
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

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const navItems: [Route, string][] = [
  ["study", "学习"],
  ["history", "最近复习"],
  ["graph", "易混词"],
  ["stats", "统计"],
  ["data", "数据"],
  ["docs", "文档"],
];
const ratingLabels = ["完全忘记", "回忆困难", "正常掌握", "完全掌握"];

function frame(content: string) {
  const nav = navItems
    .map(
      ([key, label]) =>
        `<button data-route="${key}" class="${route === key ? "active" : ""}">${label}</button>`,
    )
    .join("");
  const notice =
    route === "study"
      ? `<aside class="notice-board"><b>今日计划</b><div class="notice-quota">${dailyNewQuota(words.length, state)} 个新词</div><small>距目标日期 ${remainingDays(state.studyPlan!)} 天</small><button class="soft" data-add-group>再加一组（+20）</button><hr><b>使用提示</b><ul><li>Space 只显示或遮住释义。</li><li>WASD 随时提交回忆结果。</li><li>Z 撤销并返回上一个词。</li><li>新词从 5 个词频层混合抽取。</li><li>“完全掌握”会移出自动复习，请慎重选择。</li></ul></aside>`
      : "";
  const search =
    route === "study"
      ? dictionaryPanel()
      : route === "history"
        ? historySearchPanel()
        : "";
  const planner =
    route === "data"
      ? `<section class="plan-settings card"><h2>学习计划</h2><p class="muted">根据剩余词汇和目标日期动态计算每日新词量。</p><form data-plan-form><label>希望在 <input name="days" type="number" min="1" value="${remainingDays(state.studyPlan!)}"> 天内完成</label><button class="soft">更新计划</button></form><div class="plan-result">当前基础计划：每天约 ${dailyNewQuota(words.length, { ...state, studyPlan: { ...state.studyPlan!, extraGroups: {} } })} 个新词</div></section>`
      : "";
  return `<main class="shell"><header class="top"><div><div class="brand">Lexi<i>graph</i></div><span class="subtitle">Words, memory, and the links between them.</span></div><nav class="nav">${nav}</nav></header>${notice}<div class="page">${search}${planner}${content}</div></main>`;
}

function dictionaryPanel() {
  const results = searchWords(words, dictionaryQuery, 8);
  return `<section class="dictionary-search"><form class="word-search" data-dictionary-form><input name="query" value="${escapeHtml(dictionaryQuery)}" placeholder="搜索单词，也支持近似拼写"><button>搜索</button></form>${dictionaryQuery ? `<div class="search-results">${results.map((result) => `<div><b>${escapeHtml(result.word.word)}</b><span>${escapeHtml(result.word.meaning)}</span><small>${result.reason}</small></div>`).join("") || "<p>没有找到相近的词。</p>"}</div>` : ""}</section>`;
}

function historySearchPanel() {
  return `<section class="dictionary-search compact"><form class="word-search" data-history-form><input name="query" value="${escapeHtml(historyQuery)}" placeholder="搜索已经复习过的单词"><button>搜索</button></form></section>`;
}

function studyView() {
  if (spellingTarget) {
    return frame(
      `<section class="spelling-card card"><span class="eyebrow">OPTIONAL SPELLING</span><h1>拼写练习</h1><p class="muted">根据释义输入刚才忘记的单词。这个练习不会改变复习评分。</p><div class="meaning">${escapeHtml(words.find((word) => word.id === spellingTarget)?.meaning ?? "")}</div><input data-spelling autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入单词后按 Enter"><div class="spelling-feedback" data-spelling-feedback></div><button class="soft" data-spelling-skip>跳过</button></section>`,
    );
  }
  const queue = dueWords();
  const word = queue[0];
  if (!word)
    return frame('<h1>今日完成</h1><p class="muted">没有到期单词。</p>');
  const actions: Action[] = ["forgot", "hard", "good", "easy"];
  const ratings = `<div class="ratings">${ratingLabels.map((label, rating) => `<button data-rate="${rating}" ${rating === 3 ? 'class="master-button" title="移出自动复习，请慎重选择"' : ""}>${label}<kbd>${displayKey(keymap[actions[rating]])}</kbd>${rating === 3 ? "<small>移出复习</small>" : ""}</button>`).join("")}</div>`;
  const answer = shown
    ? `<div class="meaning">${escapeHtml(word.meaning)}</div><div class="example">${escapeHtml(word.category ?? "")}</div><button class="hide-answer" data-show>再次按 ${displayKey(keymap.reveal)} 遮住释义</button>`
    : `<button class="reveal" data-show>显示释义 <kbd>${displayKey(keymap.reveal)}</kbd></button>`;
  return frame(
    `<section class="study-grid"><aside class="study-aside"><span class="eyebrow">TODAY</span><h1>保持节奏，<br>一次一个词。</h1><p class="muted">可以先看释义，也可以直接评分。误触后按 Z 撤销。</p><div class="quick-actions"><button class="soft" data-undo>撤销上次（Z）</button><button class="soft" data-json>导出 JSON</button><label class="soft">导入 JSON<input hidden type="file" accept="application/json" data-import></label></div><div class="stats"><div class="stat"><b>${queue.length}</b><small>当前待学习</small></div><div class="stat"><b>${state.history.length}</b><small>累计复习</small></div><div class="stat"><b>${words.length}</b><small>大纲词汇</small></div></div></aside><article class="card hero"><small class="muted">Space 显示或遮住 · WASD 随时评分</small><h1 class="word">${escapeHtml(word.word)}</h1><div class="phonetic">${escapeHtml(word.phonetic || "暂缺音标")}</div>${answer}${ratings}</article></section>`,
  );
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
    `<div class="page-heading"><span class="eyebrow">REVIEW LOG</span><h1>最近复习</h1><p class="muted">检查刚才的评分、重新标记，或用 Z 精确撤销最后一次操作。</p></div><div class="history-layout"><section class="card"><div class="section-title"><h2>最近 100 条</h2><button class="soft" data-undo>撤销最后一次（Z）</button></div>${rows || '<p class="muted">还没有复习记录。</p>'}</section><aside class="card weak-list"><h2>经常遗忘</h2>${forgotten.map((review) => `<div class="pair"><span>${escapeHtml(words.find((word) => word.id === review.wordId)?.word ?? review.wordId)}</span><b>${review.lapses} 次</b></div>`).join("") || '<p class="muted">暂无遗忘记录。</p>'}</aside></div>`,
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
    `<h1>个性化易混词网络</h1><p class="muted">这是关联网络，不宣称因果关系。边权来自拼写相似与真实误认记录。</p><div class="card">${pairs.map((item) => `<div class="pair"><div><b>${escapeHtml(item.a.word)} · ${escapeHtml(item.b.word)}</b><div class="muted">拼写距离 ${item.d}${item.m ? `，误认 ${item.m} 次` : ""}</div></div><span class="tag">${item.score.toFixed(2)}</span></div>`).join("") || '<p class="muted">产生遗忘或误认记录后显示个性化连接。</p>'}</div>`,
  );
}

function statsView() {
  const days = dailyReviews(state),
    max = Math.max(1, ...days.map((day) => day.count));
  const bars = days
    .map(
      (day) =>
        `<div class="bar-wrap" title="${day.date}: ${day.count}"><div class="bar" style="height:${Math.max(3, (day.count / max) * 120)}px"></div><small>${day.date.slice(3)}</small></div>`,
    )
    .join("");
  return frame(
    `<h1>学习统计</h1><div class="stats"><div class="stat"><b>${state.history.length}</b><small>总复习</small></div><div class="stat"><b>${(recallRate(state) * 100).toFixed(1)}%</b><small>正常或熟练</small></div><div class="stat"><b>${Object.values(state.reviews).reduce((sum, review) => sum + review.lapses, 0)}</b><small>遗忘次数</small></div></div><div class="card"><h2>近 14 天复习量</h2><div class="chart">${bars}</div></div>`,
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
    `<div class="page-heading"><span class="eyebrow">PREFERENCES</span><h1>数据与接口</h1><p class="muted">Pages 使用浏览器存储；本地模式自动写入 profiles/default.json。</p></div><div class="card"><div class="pair"><b>考研词库</b><span class="tag">${words.length} 词</span></div><div class="actions"><button class="soft" data-json>导出 JSON</button><label class="soft">导入 JSON<input hidden type="file" accept="application/json" data-import></label><label class="toggle"><input type="checkbox" data-spelling-toggle ${spellingEnabled ? "checked" : ""}> 启用遗忘词拼写练习</label><label class="toggle"><input type="checkbox" data-anki> 启用 Anki 导出</label><button class="soft hidden" data-anki-export>导出 Anki TSV</button></div><h2>自定义键盘映射</h2>${conflicts.length ? '<p class="warning">存在重复键位，请调整映射。</p>' : ""}${mappings}</div>`,
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
      const studied = new Set(state.history.map((e) => e.wordId)).size;
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

// One-time debug bar — lives outside #app so render() can't destroy it
const debugBar = document.createElement("div");
debugBar.id = "lexi-key-debug";
Object.assign(debugBar.style, {
  position: "fixed",
  bottom: "0",
  left: "0",
  right: "0",
  background: "#1a1a2e",
  color: "#ccc",
  font: "12px monospace",
  padding: "4px 12px",
  zIndex: "999",
  display: "none",
  opacity: "0.9",
});
document.body.appendChild(debugBar);

render();
