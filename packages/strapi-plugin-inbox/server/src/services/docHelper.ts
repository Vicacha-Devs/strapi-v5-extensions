import type { Core } from "@strapi/strapi";

export interface DocumentServiceLike {
  findMany(params?: {
    limit?: number;
    locale?: string;
    status?: "draft" | "published";
    filters?: Record<string, unknown>;
    populate?: string[];
    sort?: string;
  }): Promise<Array<Record<string, unknown>>>;
  findOne(params: {
    documentId: string;
    locale?: string;
    populate?: string[];
  }): Promise<Record<string, unknown> | null>;
  create(params: {
    data: Record<string, unknown>;
    locale?: string;
    status?: "draft" | "published";
  }): Promise<Record<string, unknown>>;
  update(params: {
    documentId: string;
    locale?: string;
    status?: "draft" | "published";
    data: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null>;
}

export function getDocuments(
  strapi: Core.Strapi,
  uid: string
): DocumentServiceLike {
  return strapi.documents(uid as never) as unknown as DocumentServiceLike;
}
