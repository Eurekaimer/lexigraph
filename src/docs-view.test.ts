// @vitest-environment happy-dom
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderDocsView } from "./docs-view";

function renderDocs() {
  const window = new Window();
  window.document.body.innerHTML = renderDocsView();
  return window.document as unknown as Document;
}

describe("documentation view", () => {
  it("keeps every table-of-contents link connected to a section", () => {
    const document = renderDocs();
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".docs-toc a"),
    );
    expect(links).toHaveLength(8);
    for (const link of links) expect(document.querySelector(link.hash)).not.toBeNull();
  });

  it("explains the public demo boundary and local profile", () => {
    const text = renderDocs().body.textContent;
    expect(text).toContain("网页没有权限修改 GitHub 仓库");
    expect(text).toContain("profiles/default.json");
    expect(text).toContain("?debug");
  });

  it("presents the project scope, scheduling, ownership, and interfaces", () => {
    const document = renderDocs();
    const cards = document.querySelectorAll(".overview-grid article");
    expect(cards).toHaveLength(4);
    const text = document.body.textContent;
    expect(text).toContain("明确的学习范围");
    expect(text).toContain("可解释的复习调度");
    expect(text).toContain("由使用者掌握的数据");
    expect(text).toContain("一致的 Web 与 TUI 体验");
  });

  it("keeps the two hero statements as intact semantic lines", () => {
    const lines = renderDocs().querySelectorAll(".docs-hero h2 > span");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.textContent).toBe("专注考研英语词汇，");
    expect(lines[1]?.textContent).toBe("系统安排每一次复习。");
  });

  it("gives the memory diagram an accessible title and description", () => {
    const document = renderDocs();
    const chart = document.querySelector(".memory-svg");
    expect(chart?.getAttribute("aria-labelledby")).toBe(
      "memory-title memory-desc",
    );
    expect(chart?.querySelector("title")?.textContent).toContain("记忆曲线");
    expect(chart?.querySelector("desc")?.textContent).toContain("复习间隔");
  });

  it("documents direct and declarative NixOS installation separately", () => {
    const text = renderDocs().body.textContent;
    expect(text).toContain("nix profile install github:Eurekaimer/lexigraph");
    expect(text).toContain("inputs.lexigraph.nixosModules.default");
    expect(text).toContain("~/.local/share/lexigraph/profile.json");
  });
});
