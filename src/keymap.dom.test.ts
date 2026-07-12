import { Window } from "happy-dom";
import { expect, it } from "vitest";
import { bindShortcutListener, defaultKeymap } from "./keymap";

function dispatch(
  key: string,
  code: string,
  options: { shiftKey?: boolean } = {},
) {
  const window = new Window();
  const actions: string[] = [];
  const unbind = bindShortcutListener(
    window as unknown as EventTarget,
    () => defaultKeymap,
    (action) => actions.push(action),
  );
  window.dispatchEvent(
    new window.KeyboardEvent("keydown", { key, code, ...options }),
  );
  unbind();
  return actions;
}

it.each([
  ["a", "KeyA", "forgot"],
  ["A", "KeyA", "forgot"],
  ["Process", "KeyA", "forgot"],
  ["s", "KeyS", "hard"],
  ["S", "KeyS", "hard"],
  ["d", "KeyD", "good"],
  ["D", "KeyD", "good"],
  ["w", "KeyW", "easy"],
  ["W", "KeyW", "easy"],
  ["z", "KeyZ", "undo"],
  ["Z", "KeyZ", "undo"],
])(
  "maps key=%s code=%s to %s through a real DOM event",
  (key, code, expected) => {
    expect(dispatch(key, code)).toEqual([expected]);
  },
);

it("ignores Shift when resolving a physical letter key", () => {
  expect(dispatch("A", "KeyA", { shiftKey: true })).toEqual(["forgot"]);
});
