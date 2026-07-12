import type { State, Word } from "./types";

function hash(text: string) {
  let value = 2166136261;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function seededSample<T>(items: T[], count: number, seed: string) {
  const copy = [...items];
  let value = hash(seed);
  for (let index = copy.length - 1; index > 0; index--) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    const target = value % (index + 1);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy.slice(0, count);
}

/**
 * Builds a deterministic daily queue.
 *
 * Due reviews are interleaved with a fixed quota sampled from five frequency
 * strata. The date is part of the seed, so reloading never changes today's set.
 */
export function buildStudyQueue(
  words: Word[],
  state: State,
  now = new Date(),
  newWordQuota = 20,
  strata = 5,
) {
  const studied = new Set(state.history.map((event) => event.wordId));
  const due = words.filter(
    (word) =>
      studied.has(word.id) &&
      !state.reviews[word.id].mastered &&
      new Date(state.reviews[word.id].due) <= now,
  );
  const unseen = words.filter((word) => !studied.has(word.id));
  const date = now.toISOString().slice(0, 10);
  const indexById = new Map(words.map((word, index) => [word.id, index]));
  const introducedToday = state.history.filter(
    (event) =>
      event.date.slice(0, 10) === date &&
      event.previousReview?.repetitions === 0,
  );
  const quotas = Array.from(
    { length: strata },
    (_, layer) =>
      Math.floor(newWordQuota / strata) +
      (layer < newWordQuota % strata ? 1 : 0),
  );
  const layers = Array.from({ length: strata }, (_, layer) => {
    const start = Math.floor((unseen.length * layer) / strata);
    const end = Math.floor((unseen.length * (layer + 1)) / strata);
    const used = introducedToday.filter((event) => {
      const index = indexById.get(event.wordId) ?? -1;
      return (
        index >= Math.floor((words.length * layer) / strata) &&
        index < Math.floor((words.length * (layer + 1)) / strata)
      );
    }).length;
    const layerWords = unseen.filter((word) => {
      const index = indexById.get(word.id) ?? -1;
      return (
        index >= Math.floor((words.length * layer) / strata) &&
        index < Math.floor((words.length * (layer + 1)) / strata)
      );
    });
    return seededSample(
      layerWords,
      Math.max(0, quotas[layer] - used),
      `${date}:${layer}`,
    );
  });
  const newWords = Array.from({ length: Math.max(...quotas, 0) }, (_, round) =>
    layers.map((layer) => layer[round]),
  )
    .flat()
    .filter(Boolean);
  const queue: Word[] = [];
  let oldIndex = 0,
    newIndex = 0;
  while (oldIndex < due.length || newIndex < newWords.length) {
    for (let count = 0; count < 2 && oldIndex < due.length; count++)
      queue.push(due[oldIndex++]);
    if (newIndex < newWords.length) queue.push(newWords[newIndex++]);
  }
  return queue;
}
