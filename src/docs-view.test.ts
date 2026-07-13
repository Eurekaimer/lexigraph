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
