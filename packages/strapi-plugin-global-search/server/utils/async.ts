/** Rejects if `factory()` has not settled within `ms`. Always clears its timer. */
export const withTimeout = <T>(factory: () => T | Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;

  return Promise.race([
    Promise.resolve()
      .then(factory)
      .finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`GLOBAL_SEARCH_TIMEOUT:${label}`)), ms);
    }),
  ]);
};

/**
 * Runs `worker` over `items` with at most `concurrency` in flight, so an app with
 * 60 content types cannot exhaust the database pool on a single keystroke.
 */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array(items.length) as R[];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);

  return results;
};
