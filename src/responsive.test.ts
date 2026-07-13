import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = [
  "tokens.css",
  "style.css",
  "docs.css",
  "history.css",
  "search.css",
]
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");

describe("responsive layout contract", () => {
  it.each([1180, 960, 820, 620])("defines the %dpx product breakpoint", (width) => {
    expect(styles).toContain(`@media (max-width: ${width}px)`);
  });

  it("reserves safe-area space for mobile bottom navigation", () => {
    expect(styles).toContain("env(safe-area-inset-bottom)");
    expect(styles).toMatch(/\.primary-nav\s*\{[^}]*position:\s*fixed/s);
  });

  it("provides a two-column tablet study layout and a single-column mobile layout", () => {
    expect(styles).toMatch(
      /@media \(max-width: 1180px\)[\s\S]*?\.study-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 240px/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 820px\)[\s\S]*?\.study-layout\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  it("uses an expanded, equal-height desktop study canvas", () => {
    expect(styles).toContain("--content: 1680px");
    expect(styles).toMatch(
      /@media \(min-width: 1181px\)[\s\S]*?\.study-layout\s*\{[^}]*min-height:\s*650px/,
    );
    expect(styles).toMatch(
      /\.study-layout\s*\{[^}]*grid-template-columns:\s*minmax\(220px, 0\.82fr\)[^}]*align-items:\s*stretch/s,
    );
  });

  it("places the iPad card above two balanced insight panels", () => {
    expect(styles).toMatch(
      /@media \(max-width: 960px\)[\s\S]*?\.study-layout\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 960px\)[\s\S]*?\.review-card\s*\{[^}]*grid-column:\s*1 \/ -1/,
    );
  });
});
