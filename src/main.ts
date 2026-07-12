import './style.css';
import { words } from './data';
import { graph, initial, schedule } from './logic';
import type { Rating, State } from './types';

const STORAGE_KEY = 'lexigraph-v1';
const emptyState = (): State => ({ reviews: {}, mistakes: [], history: [] });

export function normalizeState(value: unknown): State {
  if (!value || typeof value !== 'object') return emptyState();
  const candidate = value as Partial<State>;
  return {
    reviews: candidate.reviews && typeof candidate.reviews === 'object' ? candidate.reviews : {},
    mistakes: Array.isArray(candidate.mistakes) ? candidate.mistakes : [],
    history: Array.isArray(candidate.history) ? candidate.history : [],
  };
}

function loadState(): State {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    return emptyState();
  }
}

let state = loadState();
let route = 'study';
let shown = false;

function prepareState() {
  for (const word of words) state.reviews[word.id] ??= initial(word.id);
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function dueWords() {
  return words.filter(word => new Date(state.reviews[word.id].due) <= new Date());
}

prepareState();
save();

function frame(content: string) {
  const navigation = [['study', '学习'], ['graph', '易混词'], ['data', '数据']]
    .map(([key, name]) => `<button data-route="${key}" class="${route === key ? 'active' : ''}">${name}</button>`)
    .join('');
  return `<main class="shell"><header class="top"><div class="brand">Lexi<i>graph</i></div><span class="muted">离线词汇图谱</span></header>${content}</main><nav class="nav">${navigation}</nav>`;
}

function studyView() {
  const queue = dueWords();
  const word = queue[0];
  if (!word) return frame('<h1>今日完成</h1><p class="muted">没有到期单词，明天再见。</p>');
  const answer = shown
    ? `<div class="meaning">${word.meaning}</div><div class="example">${word.example}</div><div class="ratings">${['忘记', '模糊', '认识', '简单'].map((label, rating) => `<button data-rate="${rating}">${label}</button>`).join('')}</div>`
    : '<button class="reveal" data-show>显示释义</button>';
  return frame(`<div class="stats"><div class="stat"><b>${queue.length}</b><small>待复习</small></div><div class="stat"><b>${state.history.length}</b><small>总复习</small></div><div class="stat"><b>${graph(words, state).length}</b><small>易混连接</small></div></div><article class="card hero"><small class="muted">今日词汇</small><h1 class="word">${word.word}</h1><div class="phonetic">${word.phonetic}</div>${answer}</article>`);
}

function graphView() {
  const pairs = graph(words, state).slice(0, 18).map(item =>
    `<div class="pair"><div><b>${item.a.word} · ${item.b.word}</b><div class="muted">拼写距离 ${item.d}${item.m ? `，误认 ${item.m} 次` : ''}</div></div><span class="tag">${item.score.toFixed(2)}</span></div>`
  ).join('');
  return frame(`<h1>易混词图谱</h1><p class="muted">拼写越相似、误认越频繁，关系越强。</p><div class="card">${pairs}</div>`);
}

function dataView() {
  return frame(`<h1>数据与词库</h1><p class="muted">所有记录仅保存在当前设备。</p><div class="card"><div class="pair"><b>演示词库</b><span class="tag">${words.length} 词</span></div><div class="actions"><button class="soft" data-export>导出 JSON</button><label class="soft">导入 JSON<input hidden type="file" accept="application/json" data-import></label><button class="soft" data-demo>模拟误认</button></div></div>`);
}

function render() {
  document.querySelector('#app')!.innerHTML = route === 'study' ? studyView() : route === 'graph' ? graphView() : dataView();
  document.querySelectorAll<HTMLElement>('[data-route]').forEach(element => element.onclick = () => {
    route = element.dataset.route!;
    render();
  });
  document.querySelector<HTMLElement>('[data-show]')?.addEventListener('click', () => {
    shown = true;
    render();
  });
  document.querySelectorAll<HTMLElement>('[data-rate]').forEach(element => element.onclick = () => {
    const word = dueWords()[0];
    if (!word) return;
    const rating = Number(element.dataset.rate) as Rating;
    state.reviews[word.id] = schedule(state.reviews[word.id], rating);
    state.history.push({ date: new Date().toISOString(), wordId: word.id, rating });
    save();
    shown = false;
    render();
  });
  document.querySelector<HTMLElement>('[data-demo]')?.addEventListener('click', () => {
    const mistake = state.mistakes.find(item => item.from === 'adapt' && item.to === 'adopt');
    mistake ? mistake.count++ : state.mistakes.push({ from: 'adapt', to: 'adopt', count: 1 });
    save();
    route = 'graph';
    render();
  });
  document.querySelector<HTMLElement>('[data-export]')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, state }, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'lexigraph-backup.json' });
    link.click();
    URL.revokeObjectURL(url);
  });
  document.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', async event => {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const backup = JSON.parse(await file.text());
      state = normalizeState(backup.state);
      prepareState();
      save();
      render();
    } catch {
      alert('备份文件无效');
    }
  });
}

render();
