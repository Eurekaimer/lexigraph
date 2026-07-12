import type { Action, Keymap } from "./types";

export const defaultKeymap: Keymap = {
  reveal: " ",
  forgot: "a",
  hard: "s",
  good: "d",
  easy: "w",
  undo: "z",
  study: "1",
  history: "6",
  graph: "2",
  stats: "3",
  data: "4",
  docs: "5",
  help: "?",
};

export function normalizeKey(key: string) {
  return key === "Space" || key === "Spacebar" ? " " : key.toLowerCase();
}

export function actionForKey(keymap: Keymap, key: string): Action | undefined {
  const normalized = normalizeKey(key);
  return (Object.keys(keymap) as Action[]).find(
    (action) => normalizeKey(keymap[action]) === normalized,
  );
}

export function actionForEvent(
  keymap: Keymap,
  key: string,
  code = "",
): Action | undefined {
  const physicalMatch = (Object.keys(keymap) as Action[]).find(
    (action) => bindingToCode(keymap[action]) === code,
  );
  return physicalMatch ?? actionForKey(keymap, key);
}

/** Converts a user-facing binding into a layout-independent KeyboardEvent.code. */
export function bindingToCode(binding: string) {
  const key = normalizeKey(binding);
  if (key === " ") return "Space";
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return undefined;
}

/**
 * Binds the same DOM event path used by the application and by integration
 * tests. The returned function removes the listener.
 */
export function bindShortcutListener(
  target: EventTarget,
  getKeymap: () => Keymap,
  handler: (action: Action, event: KeyboardEvent) => void,
) {
  const listener = (rawEvent: Event) => {
    const event = rawEvent as KeyboardEvent;
    const action = actionForEvent(getKeymap(), event.key, event.code);
    if (action) handler(action, event);
  };
  target.addEventListener("keydown", listener);
  return () => target.removeEventListener("keydown", listener);
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
  return key === " " ? "Space" : key.toUpperCase();
}
