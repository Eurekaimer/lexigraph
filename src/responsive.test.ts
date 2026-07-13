import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = ["style.css", "docs.css", "history.css", "search.css"]
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");

describe("responsive layout contract", () => {
  it.each([1180, 820, 620])("defines the %dpx product breakpoint", (width) => {
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
});
