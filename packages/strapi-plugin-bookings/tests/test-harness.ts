import serverPlugin from "../server/src/index.ts";
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from "../server/src/types.ts";

export function getFutureMonday(daysAhead = 14): string {
  const cursor = new Date(Date.now() + daysAhead * 86_400_000);
  while (cursor.getUTCDay() !== 1) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cursor.toISOString().slice(0, 10);
}

function matchesOrClause(
  row: Record<string, unknown>,
  clause: Record<string, unknown>
): boolean {
  for (const [field, cond] of Object.entries(clause)) {
    const eqVal = (cond as { $eq?: unknown } | undefined)?.$eq;
    if (field === "documentId") {
      if (String(row.documentId ?? row.id) === String(eqVal)) return true;
    } else if (String(row[field] ?? "") === String(eqVal)) {
      return true;
    }
  }
  return false;
}

function matchesMockFilters(
  row: Record<string, unknown>,
  filters?: Record<string, unknown>
): boolean {
  if (!filters) return true;
  if (filters.isActive !== undefined) {
    const eq = (filters.isActive as { $eq?: boolean }).$eq;
    if (eq !== undefined && Boolean(row.isActive) !== eq) return false;
  }
  if (Array.isArray(filters.$or)) {
    const ok = (filters.$or as Array<Record<string, unknown>>).some((c) =>
      matchesOrClause(row, c)
    );
    if (!ok) return false;
  }
  if (filters.endDate) {
    const gte = (filters.endDate as { $gte?: string }).$gte;
    if (gte && Date.parse(String(row.endDate)) < Date.parse(gte)) return false;
  }
  if (filters.startDate) {
    const lte = (filters.startDate as { $lte?: string }).$lte;
    if (lte && Date.parse(String(row.startDate)) > Date.parse(lte)) {
      return false;
    }
  }
  if (filters.status) {
    const stCond = filters.status as { $in?: string[]; $eq?: string };
    const rowSt = String(row.status ?? "pending");
    if (Array.isArray(stCond.$in) && !stCond.$in.includes(rowSt)) return false;
    if (stCond.$eq && rowSt !== stCond.$eq) return false;
  }
  if (filters.resource) {
    const resId = (filters.resource as { documentId?: { $eq?: string } })
      .documentId?.$eq;
    const rawRel = row.resource;
    const rowResId =
      rawRel && typeof rawRel === "object"
        ? String((rawRel as Record<string, unknown>).documentId ?? "")
        : String(rawRel ?? row.resourceDocumentId ?? "");
    if (resId && rowResId !== resId) return false;
  }
  return true;
}

export function createTestHarness(extraConfig: Record<string, unknown> = {}) {
  const storeData = new Map<string, unknown>();
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  let idCounter = 1;
  let txCount = 0;

  const ensureCollection = (uid: string) => {
    if (!collections.has(uid)) {
      collections.set(uid, new Map());
    }
    return collections.get(uid)!;
  };

  const strapi: Record<string, unknown> = {
    config: {
      get(key: string) {
        if (key === "plugin::bookings") {
          return {
            defaultTimezone: "UTC",
            defaultSlotDurationMinutes: 60,
            defaultCapacityPerSlot: 2,
            ...extraConfig,
          };
        }
        return {};
      },
    },
    log: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    db: {
      async transaction<T>(cb: () => Promise<T>): Promise<T> {
        txCount += 1;
        return cb();
      },
    },
    contentTypes: {
      "admin::user": { uid: "admin::user", kind: "collectionType" },
      "plugin::users-permissions.user": {
        uid: "plugin::users-permissions.user",
        kind: "collectionType",
      },
      "plugin::bookings.booking": {
        uid: "plugin::bookings.booking",
        kind: "collectionType",
        attributes: { title: { type: "string" } },
      },
    },
    customFields: { register() {} },
    eventHub: { emit() {} },
    store() {
      return {
        async get({ key }: { key: string }) {
          return storeData.get(key);
        },
        async set({ key, value }: { key: string; value: unknown }) {
          storeData.set(key, value);
        },
      };
    },
    documents(uid: string) {
      const col = ensureCollection(uid);
      return {
        async findMany(params?: {
          filters?: Record<string, unknown>;
          sort?: string;
          limit?: number;
        }) {
          await new Promise((r) => setTimeout(r, 1));
          let rows = Array.from(col.values()).filter((row) =>
            matchesMockFilters(row, params?.filters)
          );
          if (params?.sort === "startDate:asc") {
            rows = rows.sort(
              (a, b) =>
                Date.parse(String(a.startDate ?? "")) -
                Date.parse(String(b.startDate ?? ""))
            );
          } else if (params?.sort === "name:asc") {
            rows = rows.sort((a, b) =>
              String(a.name ?? "").localeCompare(String(b.name ?? ""))
            );
          }
          const cap = params?.limit ?? 500;
          return rows.slice(0, cap);
        },
        async create({ data }: { data: Record<string, unknown> }) {
          await new Promise((r) => setTimeout(r, 1));
          const documentId = `doc-${idCounter++}`;
          const record = { ...data, documentId };
          col.set(documentId, record);
          return record;
        },
        async update({
          documentId,
          data,
        }: {
          documentId: string;
          data: Record<string, unknown>;
        }) {
          const existing = col.get(documentId);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          col.set(documentId, updated);
          return updated;
        },
      };
    },
    plugin(name: string) {
      if (name === "bookings") {
        return {
          service(svcName: string) {
            return servicesMap[svcName];
          },
        };
      }
      return {};
    },
  };

  const servicesMap: Record<string, unknown> = {
    settings: serverPlugin.services.settings({ strapi: strapi as never }),
    availability: serverPlugin.services.availability({
      strapi: strapi as never,
    }),
    reservation: serverPlugin.services.reservation({ strapi: strapi as never }),
  };

  return {
    strapi,
    services: {
      settings: servicesMap.settings as SettingsService,
      availability: servicesMap.availability as AvailabilityService,
      reservation: servicesMap.reservation as ReservationService,
    },
    ensureCollection,
    getTxCount: () => txCount,
  };
}

export function createMockHttpCtx(overrides: {
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  headers?: Record<string, string | undefined>;
}) {
  const headersOut: Record<string, string> = {};
  return {
    query: overrides.query ?? {},
    params: overrides.params ?? {},
    request: {
      body: overrides.body,
      headers: overrides.headers,
    },
    body: null as unknown,
    status: 200,
    headersOut,
    set(k: string, v: string) {
      headersOut[k] = v;
    },
    badRequest(message: string) {
      this.status = 400;
      this.body = { error: { status: 400, message } };
    },
    forbidden(message: string) {
      this.status = 403;
      this.body = { error: { status: 403, message } };
    },
    notFound(message: string) {
      this.status = 404;
      this.body = { error: { status: 404, message } };
    },
  };
}
