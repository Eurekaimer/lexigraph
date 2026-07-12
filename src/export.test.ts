import { expect, it } from "vitest";
import { AnkiTsvExportAdapter } from "./export";
it("exports studied words and sanitizes tabs", async () => {
  const blob = new AnkiTsvExportAdapter().export(
    [
      {
        id: "adapt",
        word: "adapt",
        phonetic: "/əˈdæpt/",
        meaning: "适应\t改编",
        example: "",
      },
    ],
    {
      reviews: {},
      mistakes: [],
      history: [{ date: "2026-01-01", wordId: "adapt", rating: 2 }],
    },
  );
  expect(await blob.text()).toContain("adapt\t/əˈdæpt/\t适应 改编");
});
it("does not export unstudied words to Anki", async () => {
  const blob = new AnkiTsvExportAdapter().export(
    [{ id: "x", word: "x", phonetic: "", meaning: "x", example: "" }],
    { reviews: {}, mistakes: [], history: [] },
  );
  expect(await blob.text()).not.toContain("\nx\t");
});
