export interface Context {
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  request?: { body?: unknown };
  state?: Record<string, unknown>;
  body?: unknown;
  status?: number;
  throw(status: number, message?: string): never;
  forbidden?(message?: string): unknown;
  badRequest?(message?: string): unknown;
}
