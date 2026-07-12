import type { State, Word } from "./types";

export interface ExportAdapter {
  readonly id: string;
  readonly label: string;
  export(words: Word[], state: State): Blob;
}

export class JsonExportAdapter implements ExportAdapter {
  readonly id = "json";
  readonly label = "Lexigraph JSON";
  export(_words: Word[], state: State) {
    return new Blob(
      [
        JSON.stringify(
          { version: 2, exportedAt: new Date().toISOString(), state },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
  }
}

export class AnkiTsvExportAdapter implements ExportAdapter {
  readonly id = "anki-tsv";
  readonly label = "Anki TSV";
  export(words: Word[], state: State) {
    const studied = new Set(state.history.map((item) => item.wordId));
    const escape = (value: string) => value.replace(/[\t\r\n]+/g, " ").trim();
    const rows = words
      .filter((word) => studied.has(word.id))
      .map((word) =>
        [
          word.word,
          word.phonetic,
          word.meaning,
          word.category ?? "",
          "lexigraph",
        ]
          .map(escape)
          .join("\t"),
      );
    return new Blob(
      [
        "#separator:tab\n#html:false\n#columns:Front\tPhonetic\tBack\tCategory\tTags\n",
        rows.join("\n"),
      ],
      { type: "text/tab-separated-values;charset=utf-8" },
    );
  }
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  }).click();
  URL.revokeObjectURL(url);
}
