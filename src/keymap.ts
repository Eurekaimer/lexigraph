import type { Action, Keymap } from './types';

export const defaultKeymap: Keymap = {
  reveal: ' ',
  forgot: 'a',
  hard: 's',
  good: 'd',
  easy: 'w',
  undo: 'z',
  study: '1',
  history: '6',
  graph: '2',
  stats: '3',
  data: '4',
  docs: '5',
  help: '?',
};

export function normalizeKey(key: string) {
  return key === 'Space' || key === 'Spacebar' ? ' ' : key.toLowerCase();
}

export function actionForKey(keymap: Keymap, key: string): Action | undefined {
  const normalized = normalizeKey(key);
  return (Object.keys(keymap) as Action[]).find(action => normalizeKey(keymap[action]) === normalized);
}

export function actionForEvent(keymap: Keymap, key: string, code = ''): Action | undefined {
  const physicalKey = code === 'Space' ? ' ' : /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(code) ? code.slice(5) : '';
  return actionForKey(keymap, physicalKey || key) ?? actionForKey(keymap, key);
}

export function keymapConflicts(keymap: Keymap) {
  const seen = new Map<string, Action>();
  const conflicts: [Action, Action][] = [];
  for (const action of Object.keys(keymap) as Action[]) {
    const key = normalizeKey(keymap[action]);
    const previous = seen.get(key);
    if (previous) conflicts.push([previous, action]);
    else seen.set(key, action);
  }
  return conflicts;
}

export function displayKey(key: string) {
  return key === ' ' ? 'Space' : key.toUpperCase();
}
