// @vitest-environment happy-dom
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { defaultKeymap } from "./keymap";
import {
  navigationItems,
  ratingOptions,
  renderAppShell,
  renderRatingButtons,
} from "./ui";

function documentFor(html: string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

describe("application shell", () => {
  it("renders one semantic primary navigation with every route", () => {
    const document = documentFor(
      renderAppShell({ route: "study", keymap: defaultKeymap, content: "ok" }),
    );
    const nav = document.querySelector('nav[aria-label="主要导航"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll("[data-route]")).toHaveLength(
      navigationItems.length,
    );
  });

  it("marks exactly one route as current", () => {
    const document = documentFor(
      renderAppShell({ route: "docs", keymap: defaultKeymap, content: "ok" }),
    );
    const current = document.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect((current[0] as HTMLElement).dataset.route).toBe("docs");
  });

  it("keeps a keyboard-accessible skip link and main landmark", () => {
    const document = documentFor(
      renderAppShell({ route: "study", keymap: defaultKeymap, content: "ok" }),
    );
    expect(document.querySelector<HTMLAnchorElement>(".skip-link")?.hash).toBe(
      "#main-content",
    );
    expect(document.querySelector("main#main-content")).not.toBeNull();
  });
});

describe("rating controls", () => {
  it("keeps ratings and keyboard actions in the scheduling order", () => {
    expect(ratingOptions.map(({ rating, action }) => [rating, action])).toEqual([
      [0, "forgot"],
      [1, "hard"],
      [2, "good"],
      [3, "easy"],
    ]);
  });

  it("renders all four controls with their physical key labels", () => {
    const document = documentFor(
      `<div>${renderRatingButtons(defaultKeymap)}</div>`,
    );
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-rate]"),
    );
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.dataset.rate)).toEqual(["0", "1", "2", "3"]);
    expect(buttons.map((button) => button.querySelector(".rating-key")?.textContent)).toEqual([
      "A",
      "S",
      "D",
      "W",
    ]);
  });
});
