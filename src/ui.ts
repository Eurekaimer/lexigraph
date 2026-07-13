import { displayKey } from "./keymap";
import type { Action, Keymap, Rating } from "./types";

export type Route = "study" | "history" | "graph" | "stats" | "data" | "docs";

type IconName =
  | "book"
  | "clock"
  | "download"
  | "file"
  | "graph"
  | "history"
  | "home"
  | "info"
  | "search"
  | "settings"
  | "spark"
  | "stats"
  | "undo"
  | "upload";

export type NavigationItem = {
  route: Route;
  action: Action;
  label: string;
  shortLabel: string;
  icon: IconName;
};

export type RatingOption = {
  rating: Rating;
  action: Extract<Action, "forgot" | "hard" | "good" | "easy">;
  label: string;
  description: string;
  tone: "danger" | "warning" | "success" | "master";
};

export const navigationItems: readonly NavigationItem[] = [
  { route: "study", action: "study", label: "开始学习", shortLabel: "学习", icon: "home" },
  { route: "history", action: "history", label: "复习记录", shortLabel: "记录", icon: "history" },
  { route: "graph", action: "graph", label: "易混词图谱", shortLabel: "图谱", icon: "graph" },
  { route: "stats", action: "stats", label: "学习统计", shortLabel: "统计", icon: "stats" },
  { route: "data", action: "data", label: "数据设置", shortLabel: "设置", icon: "settings" },
  { route: "docs", action: "docs", label: "使用文档", shortLabel: "文档", icon: "book" },
] as const;

export const ratingOptions: readonly RatingOption[] = [
  {
    rating: 0,
    action: "forgot",
    label: "完全忘记",
    description: "约 30 分钟后再见",
    tone: "danger",
  },
  {
    rating: 1,
    action: "hard",
    label: "回忆困难",
    description: "缩短复习间隔",
    tone: "warning",
  },
  {
    rating: 2,
    action: "good",
    label: "正常掌握",
    description: "按计划延长间隔",
    tone: "success",
  },
  {
    rating: 3,
    action: "easy",
    label: "完全掌握",
    description: "移出自动复习",
    tone: "master",
  },
] as const;

const paths: Record<IconName, string> = {
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v15h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>',
  graph: '<circle cx="6" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="18" cy="15" r="2"/><path d="m7 15 4-6m2 0 4 4M8 17h8"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  spark: '<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5.5 14l.8 2.2 2.2.8-2.2.8L5.5 20l-.8-2.2-2.2-.8 2.2-.8z"/>',
  stats: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
  undo: '<path d="m9 7-5 5 5 5"/><path d="M5 12h8a6 6 0 0 1 6 6v1"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14"/>',
};

/** Returns a decorative, dependency-free SVG from the shared icon set. */
export function icon(name: IconName, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

export function renderNavigation(route: Route, keymap: Keymap) {
  return navigationItems
    .map(
      (item) => `<button type="button" data-route="${item.route}" class="nav-item${
        route === item.route ? " active" : ""
      }"${route === item.route ? ' aria-current="page"' : ""} aria-label="${item.label}">
        ${icon(item.icon)}
        <span class="nav-label">${item.shortLabel}</span>
        <kbd>${displayKey(keymap[item.action])}</kbd>
      </button>`,
    )
    .join("");
}

export function renderRatingButtons(keymap: Keymap) {
  return ratingOptions
    .map(
      (option) => `<button type="button" class="rating-button rating-${option.tone}" data-rate="${option.rating}"${
        option.rating === 3
          ? ' title="将移出自动复习；仍可在复习记录中重新评分"'
          : ""
      }>
        <span class="rating-key">${displayKey(keymap[option.action])}</span>
        <span class="rating-copy"><b>${option.label}</b><small>${option.description}</small></span>
      </button>`,
    )
    .join("");
}

type AppShellOptions = {
  route: Route;
  keymap: Keymap;
  content: string;
  utility?: string;
};

/**
 * Owns the application chrome. Feature views only provide page content, which
 * keeps navigation semantics and responsive behavior consistent everywhere.
 */
export function renderAppShell({ route, keymap, content, utility = "" }: AppShellOptions) {
  return `<a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="app-shell">
    <header class="app-header">
      <button type="button" class="brand-link" data-route="study" aria-label="返回学习页">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><b>Lexigraph</b><small>考研英语 · 本地优先</small></span>
      </button>
      <div class="header-status"><span class="status-dot"></span>离线可用</div>
    </header>
    <nav class="primary-nav" aria-label="主要导航">${renderNavigation(route, keymap)}</nav>
    <main class="page" id="main-content" tabindex="-1">${utility}${content}</main>
    <footer class="app-footer"><span>Lexigraph</span><span>专注识记、复习与连接</span></footer>
  </div>`;
}
