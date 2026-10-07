/** Local aggregate commands share SQLite's single writer. This queue reduces
 * lock contention within one server process; database locks/revisions remain
 * authoritative across processes. A future Postgres adapter can replace it. */
const pending = new Map<string, Promise<void>>();
export async function withSchoolWrite<T>(
  schoolId: string,
  work: () => Promise<T>,
): Promise<T> {
  const previous = pending.get(schoolId) ?? Promise.resolve();
  let release!: () => void;
  const tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  pending.set(schoolId, tail);
  await previous;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await work();
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? error.code
            : "";
        // Retry only rolled-back transactions with transient database timeouts.
        // The command receipt still prevents duplicates after successful commits.
        if (attempt >= 2 || !["P1008", "P2028"].includes(String(code)))
          throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1)),
        );
      }
    }
  } finally {
    release();
    if (pending.get(schoolId) === tail) pending.delete(schoolId);
  }
}
