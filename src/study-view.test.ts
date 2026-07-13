// @vitest-environment happy-dom
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { defaultKeymap } from "./keymap";
import { renderStudyView } from "./study-view";

const baseModel = {
  word: {
    id: "adapt",
    word: "adapt",
    phonetic: "/əˈdæpt/",
    meaning: "v. 适应",
    example: "",
  },
  keymap: defaultKeymap,
  queueLength: 18,
  quota: 20,
  newWordsToday: 7,
  reviewsToday: 9,
  daysRemaining: 120,
  dateLabel: "7月13日",
  isNewWord: true,
  answerShown: false,
} as const;

function documentFor(answerShown: boolean) {
  const window = new Window();
  window.document.body.innerHTML = renderStudyView({
    ...baseModel,
    answerShown,
  });
  return window.document as unknown as Document;
}

describe("study view", () => {
  it.each([false, true])("keeps all ratings available when answerShown=%s", (shown) => {
    expect(documentFor(shown).querySelectorAll("[data-rate]")).toHaveLength(4);
  });

  it("switches between a reveal action and the answer without moving feedback", () => {
    expect(documentFor(false).querySelector(".answer-panel.is-hidden")).not.toBeNull();
    expect(documentFor(false).querySelector(".meaning")).toBeNull();
    expect(documentFor(true).querySelector(".answer-panel.is-visible .meaning")?.textContent).toBe(
      "v. 适应",
    );
  });

  it("exposes numerical progress to assistive technology", () => {
    const progress = documentFor(false).querySelector('[role="progressbar"]');
    expect(progress?.getAttribute("aria-valuenow")).toBe("7");
    expect(progress?.getAttribute("aria-valuemax")).toBe("20");
  });

  it("escapes vocabulary content before interpolation", () => {
    const html = renderStudyView({
      ...baseModel,
      word: { ...baseModel.word, word: '<img src=x onerror="alert(1)">' },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
