import { escapeHtml } from "./html";
import { displayKey } from "./keymap";
import type { Keymap, Word } from "./types";
import { icon, renderRatingButtons } from "./ui";
import { heatmapColor } from "./heatmap";
import type { StudyInsights } from "./study-insights";

export type StudyViewModel = {
  word: Word;
  keymap: Keymap;
  queueLength: number;
  quota: number;
  newWordsToday: number;
  reviewsToday: number;
  daysRemaining: number;
  dateLabel: string;
  isNewWord: boolean;
  answerShown: boolean;
  insights: StudyInsights;
};

export function renderCompletionView() {
  return `<section class="completion-state card"><span class="completion-mark">${icon("spark")}</span><span class="eyebrow">SESSION COMPLETE</span><h1>今天的计划已经完成</h1><p class="muted">当前没有到期单词。你可以休息一下，或再增加一组新词。</p><button type="button" class="soft primary" data-add-group>继续学习 20 个新词</button></section>`;
}

export function renderSpellingView(meaning: string) {
  return `<section class="spelling-card card"><span class="eyebrow">OPTIONAL SPELLING</span><h1>拼写练习</h1><p class="muted">根据释义输入刚才忘记的单词。这个练习不会改变复习评分。</p><div class="meaning">${escapeHtml(meaning)}</div><input data-spelling autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="输入单词拼写" placeholder="输入单词后按 Enter"><div class="spelling-feedback" data-spelling-feedback aria-live="polite"></div><button type="button" class="soft" data-spelling-skip>跳过</button></section>`;
}

/** Renders the focused review surface from an immutable presentation model. */
export function renderStudyView(model: StudyViewModel) {
  const {
    word,
    keymap,
    queueLength,
    quota,
    newWordsToday,
    reviewsToday,
    daysRemaining,
    dateLabel,
    isNewWord,
    answerShown,
    insights,
  } = model;
  const progress = Math.min(
    100,
    Math.round((newWordsToday / Math.max(1, quota)) * 100),
  );
  const ratings = `<div class="ratings" aria-label="回忆程度">${renderRatingButtons(keymap)}</div>`;
  const answer = answerShown
    ? `<div class="answer-panel is-visible" aria-live="polite"><span class="answer-label">释义</span><div class="meaning">${escapeHtml(word.meaning)}</div>${word.category ? `<div class="example">${escapeHtml(word.category)}</div>` : ""}<button type="button" class="hide-answer" data-show>${icon("history")}遮住释义 <kbd>${displayKey(keymap.reveal)}</kbd></button></div>`
    : `<div class="answer-panel is-hidden"><button type="button" class="reveal" data-show><span>${icon("spark")}显示释义</span><kbd>${displayKey(keymap.reveal)}</kbd></button><p>先在脑中回忆，再查看答案</p></div>`;
  const activityPeak = Math.max(
    1,
    ...insights.activity.map((point) => point.count),
  );
  const activityBars = insights.activity
    .map(
      (point) =>
        `<div class="activity-day" title="${escapeHtml(point.key)}：${point.count} 次"><span class="activity-value">${point.count || ""}</span><i style="height:${point.count ? Math.max(12, Math.round((point.count / activityPeak) * 100)) : 4}%"></i><small>${point.label}</small></div>`,
    )
    .join("");
  const compactHeatmap = insights.heatmapCells
    .map((cell) =>
      cell.count === null
        ? '<i class="study-heat-cell empty"></i>'
        : `<i class="study-heat-cell" style="background:${heatmapColor(cell.count)}" title="${escapeHtml(cell.label)}：${cell.count} 次"></i>`,
    )
    .join("");

  return `<section class="study-layout">
    <aside class="session-panel card" aria-label="今日学习进度">
      <div class="panel-heading"><span class="eyebrow">TODAY</span><span class="date-label">${escapeHtml(dateLabel)}</span></div>
      <h2>今日进度</h2>
      <div class="progress-copy"><b>${newWordsToday}</b><span>/ ${quota} 个新词</span></div>
      <div class="progress-track" role="progressbar" aria-label="今日新词进度" aria-valuemin="0" aria-valuemax="${quota}" aria-valuenow="${newWordsToday}"><i style="width:${progress}%"></i></div>
      <div class="session-metrics"><div><b>${queueLength}</b><span>当前队列</span></div><div><b>${reviewsToday}</b><span>今日复习</span></div></div>
      <section class="side-insight weekly-insight" aria-labelledby="weekly-activity-title">
        <div class="side-insight-heading"><div><span class="section-caption">LAST 7 DAYS</span><h3 id="weekly-activity-title">本周节奏</h3></div><strong>${insights.weeklyReviews}<small> 次</small></strong></div>
        <div class="weekly-bars" role="img" aria-label="最近七天复习次数柱状图">${activityBars}</div>
        <p class="insight-summary">最近 7 天活跃 ${insights.activeDays} 天 · 新词按难度层均衡抽取</p>
      </section>
    </aside>

    <article class="review-card card" aria-labelledby="current-word">
      <header class="review-card-header"><span class="word-status"><i></i>${isNewWord ? "今日新词" : "到期复习"}</span><span>${queueLength} 个待处理</span></header>
      <div class="word-stage">
        <span class="word-overline">ENGLISH WORD</span>
        <h1 class="word" id="current-word">${escapeHtml(word.word)}</h1>
        <div class="phonetic">${escapeHtml(word.phonetic || "暂缺音标")}</div>
        ${answer}
      </div>
      <footer class="review-card-footer"><div class="feedback-heading"><b>这次回忆得怎么样？</b><span>无需显示答案，也可以直接评分</span></div>${ratings}<div class="shortcut-note"><span><kbd>${displayKey(keymap.reveal)}</kbd> 显示 / 遮住</span><span><kbd>W A S D</kbd> 评分</span><span><kbd>${displayKey(keymap.undo)}</kbd> 撤销</span></div></footer>
    </article>

    <aside class="plan-panel card" aria-label="今日计划与记忆概况">
      <div class="plan-icon">${icon("clock")}</div><span class="eyebrow">DAILY PLAN</span><h2>${quota} 个新词</h2><p>距离目标日期还有 <b>${daysRemaining}</b> 天。</p>
      <button type="button" class="soft primary full" data-add-group>增加一组 <span>+20</span></button>
      <div class="plan-divider"></div>
      <section class="side-insight memory-insight" aria-labelledby="memory-insight-title">
        <div class="side-insight-heading"><div><span class="section-caption">MEMORY</span><h3 id="memory-insight-title">记忆概况</h3></div><strong>${Math.round(insights.recallRate * 100)}<small>%</small></strong></div>
        <div class="memory-metrics"><div><span>已学习</span><b>${insights.learnedWords}</b></div><div><span>累计遗忘</span><b>${insights.lapses}</b></div></div>
        <div class="mini-heatmap-heading"><span>近 13 周复习</span><span>少 → 多</span></div>
        <div class="study-heatmap" style="--study-heat-weeks:${insights.heatmapWeeks}" role="img" aria-label="近十三周复习热力图">${compactHeatmap}</div>
      </section>
      <p class="mastery-note">${icon("info")}<span><b>完全掌握</b>会移出自动复习，请谨慎选择。</span></p>
    </aside>
  </section>`;
}
