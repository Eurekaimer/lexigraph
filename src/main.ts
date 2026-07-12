import './style.css';
import './docs.css';
import './history.css';
import { loadWords } from './data';
import { graph, initial, schedule } from './logic';
import { actionForEvent, defaultKeymap, displayKey, keymapConflicts } from './keymap';
import { createStorage, normalizeState } from './storage';
import { dailyReviews, recallRate } from './stats';
import { AnkiTsvExportAdapter, JsonExportAdapter, download } from './export';
import type { Action, Keymap, Rating } from './types';

type Route = 'study' | 'history' | 'graph' | 'stats' | 'data' | 'docs';
const words = await loadWords();
const storage = await createStorage();
const loaded = await storage.load();
let state = loaded.state;
let keymap: Keymap = { ...defaultKeymap, ...loaded.keymap };
let route: Route = 'study';
let shown = false;

for (const word of words) state.reviews[word.id] ??= initial(word.id);
const save = () => void storage.save(state, keymap);
const dueWords = () => words.filter(word => new Date(state.reviews[word.id].due) <= new Date());
save();

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]!));
const navItems: [Route, string][] = [['study','学习'],['history','最近复习'],['graph','易混词'],['stats','统计'],['data','数据'],['docs','文档']];
const ratingLabels = ['完全忘记','回忆困难','正常掌握','非常熟练'];

function frame(content: string) {
  const nav = navItems.map(([key, label]) => `<button data-route="${key}" class="${route === key ? 'active' : ''}">${label}</button>`).join('');
  return `<main class="shell"><header class="top"><div><div class="brand">Lexi<i>graph</i></div><span class="subtitle">Words, memory, and the links between them.</span></div><nav class="nav">${nav}</nav></header><div class="page">${content}</div></main>`;
}

function studyView() {
  const queue = dueWords();
  const word = queue[0];
  if (!word) return frame('<h1>今日完成</h1><p class="muted">没有到期单词。</p>');
  const actions: Action[] = ['forgot','hard','good','easy'];
  const ratings = `<div class="ratings">${ratingLabels.map((label, rating) => `<button data-rate="${rating}">${label}<kbd>${displayKey(keymap[actions[rating]])}</kbd></button>`).join('')}</div>`;
  const answer = shown ? `<div class="meaning">${escapeHtml(word.meaning)}</div><div class="example">${escapeHtml(word.category ?? '')}</div><button class="hide-answer" data-show>再次按 ${displayKey(keymap.reveal)} 遮住释义</button>` : `<button class="reveal" data-show>显示释义 <kbd>${displayKey(keymap.reveal)}</kbd></button>`;
  return frame(`<section class="study-grid"><aside class="study-aside"><span class="eyebrow">TODAY</span><h1>保持节奏，<br>一次一个词。</h1><p class="muted">可以先看释义，也可以直接评分。误触后按 Z 撤销。</p><div class="quick-actions"><button class="soft" data-undo>撤销上次（Z）</button><button class="soft" data-json>导出 JSON</button><label class="soft">导入 JSON<input hidden type="file" accept="application/json" data-import></label></div><div class="stats"><div class="stat"><b>${queue.length}</b><small>当前待学习</small></div><div class="stat"><b>${state.history.length}</b><small>累计复习</small></div><div class="stat"><b>${words.length}</b><small>大纲词汇</small></div></div></aside><article class="card hero"><small class="muted">Space 显示或遮住 · WASD 随时评分</small><h1 class="word">${escapeHtml(word.word)}</h1><div class="phonetic">${escapeHtml(word.phonetic || '暂缺音标')}</div>${answer}${ratings}</article></section>`);
}

function historyView() {
  const recent = [...state.history].reverse().slice(0, 100);
  const rows = recent.map(event => {
    const word = words.find(item => item.id === event.wordId);
    if (!word) return '';
    return `<div class="history-row"><div><b>${escapeHtml(word.word)}</b><span class="history-meaning">${escapeHtml(word.meaning)}</span></div><div class="history-meta"><span class="rating rating-${event.rating}">${ratingLabels[event.rating]}</span><time>${new Date(event.date).toLocaleString('zh-CN')}</time></div><div class="rerate">${ratingLabels.map((label,rating)=>`<button data-rerate="${rating}" data-word="${word.id}" title="${label}">${displayKey(keymap[['forgot','hard','good','easy'][rating] as Action])}</button>`).join('')}</div></div>`;
  }).join('');
  const forgotten = Object.values(state.reviews).filter(review => review.lapses > 0).sort((a,b)=>b.lapses-a.lapses).slice(0,20);
  return frame(`<div class="page-heading"><span class="eyebrow">REVIEW LOG</span><h1>最近复习</h1><p class="muted">检查刚才的评分、重新标记，或用 Z 精确撤销最后一次操作。</p></div><div class="history-layout"><section class="card"><div class="section-title"><h2>最近 100 条</h2><button class="soft" data-undo>撤销最后一次（Z）</button></div>${rows || '<p class="muted">还没有复习记录。</p>'}</section><aside class="card weak-list"><h2>经常遗忘</h2>${forgotten.map(review=>`<div class="pair"><span>${escapeHtml(words.find(word=>word.id===review.wordId)?.word ?? review.wordId)}</span><b>${review.lapses} 次</b></div>`).join('') || '<p class="muted">暂无遗忘记录。</p>'}</aside></div>`);
}

function graphView() {
  const weakIds = new Set(Object.values(state.reviews).filter(review => review.lapses > 0).map(review => review.wordId));
  const candidates = words.filter(word => weakIds.has(word.id)).slice(0, 250);
  for (const mistake of state.mistakes) for (const id of [mistake.from, mistake.to]) {
    const word = words.find(item => item.id === id);
    if (word && !candidates.includes(word)) candidates.push(word);
  }
  const pairs = graph(candidates.length > 1 ? candidates : words.slice(0, 250), state).slice(0, 30);
  return frame(`<h1>个性化易混词网络</h1><p class="muted">这是关联网络，不宣称因果关系。边权来自拼写相似与真实误认记录。</p><div class="card">${pairs.map(item => `<div class="pair"><div><b>${escapeHtml(item.a.word)} · ${escapeHtml(item.b.word)}</b><div class="muted">拼写距离 ${item.d}${item.m ? `，误认 ${item.m} 次` : ''}</div></div><span class="tag">${item.score.toFixed(2)}</span></div>`).join('') || '<p class="muted">产生遗忘或误认记录后显示个性化连接。</p>'}</div>`);
}

function statsView() {
  const days = dailyReviews(state), max = Math.max(1, ...days.map(day => day.count));
  const bars = days.map(day => `<div class="bar-wrap" title="${day.date}: ${day.count}"><div class="bar" style="height:${Math.max(3, day.count/max*120)}px"></div><small>${day.date.slice(3)}</small></div>`).join('');
  return frame(`<h1>学习统计</h1><div class="stats"><div class="stat"><b>${state.history.length}</b><small>总复习</small></div><div class="stat"><b>${(recallRate(state)*100).toFixed(1)}%</b><small>正常或熟练</small></div><div class="stat"><b>${Object.values(state.reviews).reduce((sum, review) => sum + review.lapses, 0)}</b><small>遗忘次数</small></div></div><div class="card"><h2>近 14 天复习量</h2><div class="chart">${bars}</div></div>`);
}

function dataView() {
  const conflicts = keymapConflicts(keymap);
  const actionLabels:Record<Action,string>={reveal:'显示或遮住释义 / Reveal',forgot:'完全忘记 / Forgot',hard:'回忆困难 / Hard',good:'正常掌握 / Good',easy:'非常熟练 / Easy',undo:'撤销上次评分 / Undo',study:'学习页 / Study',history:'最近复习 / History',graph:'易混词 / Graph',stats:'学习统计 / Statistics',data:'数据设置 / Data',docs:'使用文档 / Docs',help:'快捷键帮助 / Help'};
  const mappings = (Object.keys(keymap) as Action[]).map(action => `<label class="pair"><span>${actionLabels[action]}</span><input data-key="${action}" value="${displayKey(keymap[action])}" maxlength="8"></label>`).join('');
  return frame(`<div class="page-heading"><span class="eyebrow">PREFERENCES</span><h1>数据与接口</h1><p class="muted">Pages 使用浏览器存储；本地模式自动写入 profiles/default.json。</p></div><div class="card"><div class="pair"><b>考研词库</b><span class="tag">${words.length} 词</span></div><div class="actions"><button class="soft" data-json>导出 JSON</button><label class="soft">导入 JSON<input hidden type="file" accept="application/json" data-import></label><label class="toggle"><input type="checkbox" data-anki> 启用 Anki 导出</label><button class="soft hidden" data-anki-export>导出 Anki TSV</button></div><h2>自定义键盘映射</h2>${conflicts.length ? '<p class="warning">存在重复键位，请调整映射。</p>' : ''}${mappings}</div>`);
}

function docsView() {
  return frame(`<article class="docs"><h1>Lexigraph 使用文档</h1><section><h2>两种运行模式</h2><div class="workflow"><span>Pages Demo</span><b>→</b><span>浏览器存储</span><b>→</b><span>导出 JSON</span></div><div class="workflow"><span>npm run local</span><b>→</b><span>本地服务</span><b>→</b><span>profiles/default.json</span></div><p>公共 Demo 无权修改仓库。个人模式只监听 127.0.0.1，并自动保存本地 JSON。</p></section><section><h2>四级记忆反馈</h2><table><tr><th>反馈</th><th>含义</th><th>默认键</th></tr><tr><td>完全忘记</td><td>无法回忆或回答错误</td><td>A</td></tr><tr><td>回忆困难</td><td>最终想起但明显犹豫</td><td>S</td></tr><tr><td>正常掌握</td><td>在合理时间正确回忆</td><td>D</td></tr><tr><td>非常熟练</td><td>几乎立即准确回忆</td><td>W</td></tr></table></section><section><h2>记忆与复习工作流</h2><div class="curve"><div class="curve-line"></div><span>记忆强度随时间下降；每次成功回忆提高强度并延长下一间隔。</span></div><div class="workflow"><span>显示单词</span><b>→</b><span>主动回忆</span><b>→</b><span>显示答案</span><b>→</b><span>评分</span><b>→</b><span>安排下次复习</span></div></section><section><h2>Anki 接口</h2><p>Anki 默认关闭。开启后可将已经学习的词导出为 UTF-8 TSV，再在 Anki 中选择制表符分隔导入。领域层不依赖 Anki；导出由独立 ExportAdapter 完成。</p></section><section><h2>项目自动发布</h2><div class="workflow"><span>Push main</span><b>→</b><span>Test</span><b>→</b><span>Build PWA</span><b>→</b><span>Deploy Pages</span></div></section></article>`);
}

function render() {
  const views = { study: studyView, history: historyView, graph: graphView, stats: statsView, data: dataView, docs: docsView };
  document.querySelector('#app')!.innerHTML = views[route]();
  bind();
}

function bind() {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach(element => element.onclick = () => { route = element.dataset.route as Route; render(); });
  document.querySelector<HTMLElement>('[data-show]')?.addEventListener('click', () => { shown = !shown; render(); });
  document.querySelectorAll<HTMLElement>('[data-rate]').forEach(element => element.onclick = () => {
    const word = dueWords()[0]; if (word) applyRating(word.id, Number(element.dataset.rate) as Rating);
  });
  document.querySelectorAll<HTMLElement>('[data-rerate]').forEach(element => element.onclick = () => applyRating(element.dataset.word!, Number(element.dataset.rerate) as Rating));
  document.querySelectorAll<HTMLElement>('[data-undo]').forEach(element => element.onclick = undoLastRating);
  document.querySelector<HTMLElement>('[data-json]')?.addEventListener('click', () => download(new JsonExportAdapter().export(words, state), 'lexigraph-profile.json'));
  const toggle = document.querySelector<HTMLInputElement>('[data-anki]');
  const ankiButton = document.querySelector<HTMLElement>('[data-anki-export]');
  toggle?.addEventListener('change', () => ankiButton?.classList.toggle('hidden', !toggle.checked));
  ankiButton?.addEventListener('click', () => download(new AnkiTsvExportAdapter().export(words, state), 'lexigraph-anki.tsv'));
  document.querySelectorAll<HTMLInputElement>('[data-key]').forEach(input => input.addEventListener('change', () => {
    const action = input.dataset.key as Action, value = input.value.trim();
    if (value) keymap[action] = value.toUpperCase() === 'SPACE' ? ' ' : value.toLowerCase();
    save(); render();
  }));
  document.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', async event => {
    try {
      const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
      const backup = JSON.parse(await file.text());
      state = normalizeState(backup.state);
      keymap = { ...defaultKeymap, ...backup.keymap };
      for (const word of words) state.reviews[word.id] ??= initial(word.id);
      save(); render();
    } catch { alert('备份文件无效'); }
  });
}

function applyRating(wordId:string, rating:Rating) {
  const previous = structuredClone(state.reviews[wordId]);
  if (!previous) return;
  state.reviews[wordId] = schedule(previous, rating);
  state.history.push({ id:crypto.randomUUID(), date:new Date().toISOString(), wordId, rating, previousReview:previous });
  shown = false;
  save();
  render();
}

function undoLastRating() {
  const event = state.history.at(-1);
  if (!event) return;
  if (!event.previousReview) {
    alert('这条记录来自旧版数据，没有可恢复的状态快照。');
    return;
  }
  state.reviews[event.wordId] = event.previousReview;
  state.history.pop();
  save();
  render();
}

window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement) return;
  const action = actionForEvent(keymap, event.key, event.code); if (!action) return;
  event.preventDefault();
  if (action === 'reveal') { shown = !shown; return render(); }
  const ratings = { forgot:0, hard:1, good:2, easy:3 } as const;
  if (action in ratings) {
    const word=dueWords()[0];
    if (word) applyRating(word.id, ratings[action as keyof typeof ratings]);
    return;
  }
  if (action === 'undo') return undoLastRating();
  const routes: Partial<Record<Action,Route>> = { study:'study', history:'history', graph:'graph', stats:'stats', data:'data', docs:'docs' };
  if (routes[action]) { route = routes[action]!; render(); }
});

render();
