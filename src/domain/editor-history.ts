/** Arrays retain order; object key order does not make a content change. */
export function editorSignature(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}
/** Session history contains editable content only, never answers/accounts/files. */
export function createEditorHistory<T>(initial: T, limit = 50) {
  let present = structuredClone(initial),
    past: T[] = [],
    future: T[] = [],
    group = "",
    last = 0;
  return {
    get present() {
      return structuredClone(present);
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    record(next: T, key = "", time = Date.now()) {
      if (editorSignature(next) === editorSignature(present)) return;
      if (!key || key !== group || time - last > 700)
        past = [...past, present].slice(-limit);
      present = structuredClone(next);
      future = [];
      group = key;
      last = time;
    },
    undo() {
      if (!past.length) return undefined;
      future.unshift(present);
      present = past.pop()!;
      group = "";
      return structuredClone(present);
    },
    redo() {
      if (!future.length) return undefined;
      past.push(present);
      present = future.shift()!;
      group = "";
      return structuredClone(present);
    },
    reset(next: T) {
      present = structuredClone(next);
      past = [];
      future = [];
      group = "";
    },
  };
}
