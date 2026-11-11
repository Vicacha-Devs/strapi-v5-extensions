import type { Core } from "@strapi/strapi";

export const UNSAFE_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function isSafeObjectKey(key: unknown): key is string {
  return (
    typeof key === "string" && key.length > 0 && !UNSAFE_OBJECT_KEYS.has(key)
  );
}

export function sanitizePlainRecord(
  val: unknown,
  depth = 0
): Record<string, unknown> | undefined {
  if (!val || typeof val !== "object" || Array.isArray(val) || depth > 6) {
    return undefined;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(val as Record<string, unknown>)) {
    if (!isSafeObjectKey(key)) continue;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      clean[key] = sanitizePlainRecord(entry, depth + 1);
    } else {
      clean[key] = entry;
    }
  }
  return clean;
}

export class BookingValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

export class BookingForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "BookingForbiddenError";
  }
}

export class BookingNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

const strapiResourceLocks = new WeakMap<
  Core.Strapi,
  Map<string, Promise<void>>
>();

export async function withResourceLock<T>(
  strapi: Core.Strapi,
  lockKey: string,
  fn: () => Promise<T>
): Promise<T> {
  let locks = strapiResourceLocks.get(strapi);
  if (!locks) {
    locks = new Map<string, Promise<void>>();
    strapiResourceLocks.set(strapi, locks);
  }

  const prev = locks.get(lockKey) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prev.then(
    () => current,
    () => current
  );
  locks.set(lockKey, tail);

  await prev.catch(() => undefined);
  try {
    if (typeof strapi.db?.transaction === "function") {
      return await strapi.db.transaction(async () => fn());
    }
    return await fn();
  } finally {
    release();
    if (locks.get(lockKey) === tail) {
      locks.delete(lockKey);
    }
  }
}

export function clearResourceLocks(strapi: Core.Strapi): void {
  strapiResourceLocks.delete(strapi);
}
