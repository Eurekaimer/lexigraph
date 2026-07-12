import type { Keymap, State } from "./types";
import { defaultStudyPlan } from "./plan";

/** Persistence boundary shared by browser and local-file modes. */
export interface StorageAdapter {
  load(): Promise<{ state: State; keymap?: Partial<Keymap> }>;
  save(state: State, keymap: Keymap): Promise<void>;
}

const KEY = "lexigraph-profile-v2";
export const emptyState = (): State => ({
  reviews: {},
  mistakes: [],
  history: [],
  studyPlan: defaultStudyPlan(),
});

/** Migrates partial or legacy JSON into the current state shape. */
export function normalizeState(value: unknown): State {
  if (!value || typeof value !== "object") return emptyState();
  const state = value as Partial<State>;
  return {
    reviews:
      state.reviews && typeof state.reviews === "object" ? state.reviews : {},
    mistakes: Array.isArray(state.mistakes) ? state.mistakes : [],
    history: Array.isArray(state.history) ? state.history : [],
    studyPlan: state.studyPlan?.targetDate
      ? state.studyPlan
      : defaultStudyPlan(),
  };
}

class BrowserStorage implements StorageAdapter {
  async load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      return { state: normalizeState(value.state), keymap: value.keymap };
    } catch {
      return { state: emptyState() };
    }
  }
  async save(state: State, keymap: Keymap) {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, state, keymap }));
  }
}

class LocalFileStorage implements StorageAdapter {
  async load() {
    const response = await fetch("/api/profile");
    if (!response.ok) throw new Error("Cannot load local profile");
    const value = await response.json();
    return { state: normalizeState(value.state), keymap: value.keymap };
  }
  async save(state: State, keymap: Keymap) {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: 2,
        updatedAt: new Date().toISOString(),
        state,
        keymap,
      }),
    });
    if (!response.ok) throw new Error("Cannot save local profile");
  }
}

export async function createStorage(): Promise<StorageAdapter> {
  try {
    const response = await fetch("/api/mode");
    if (response.ok && (await response.json()).mode === "local-file")
      return new LocalFileStorage();
  } catch {
    /* Pages and Vite dev mode use browser storage. */
  }
  return new BrowserStorage();
}
