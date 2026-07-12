import type { Action, Keymap } from './types';

export const defaultKeymap: Keymap = {
  reveal: ' ',
  forgot: 'a',
  hard: 's',
  good: 'd',
  easy: 'w',
  study: '1',
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

export function displayKey(key: string) {
  return key === ' ' ? 'Space' : key.toUpperCase();
}
