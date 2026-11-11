import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

import {
  computeNotesSummaryStats,
  normalizeNoteRecord,
  PLUGIN_ID,
  sortNotesPinnedFirst,
  type NoteFilterParams,
  type NoteRecord,
  type NotesSummaryStats,
  type NoteUpsertInput,
} from "../../../shared";
import { getTrad } from "../utils";

function formatEntityIdParam(
  entityId: number | string | null | undefined
): string {
  if (entityId === undefined || entityId === null || entityId === "") {
    return "";
  }
  return String(entityId);
}

function formatOptionalIntParam(value: number | undefined): string | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? String(Math.trunc(value))
    : undefined;
}

function buildNotesQueryString(params: NoteFilterParams = {}): string {
  const entries: Array<[string, string | undefined]> = [
    ["entitySlug", params.entitySlug],
    ["entityDocumentId", params.entityDocumentId],
    ["entityId", formatEntityIdParam(params.entityId)],
    ["entityLocale", params.entityLocale ?? undefined],
    ["includeAllLocales", params.includeAllLocales ? "true" : undefined],
    [
      "category",
      params.category && params.category !== "all"
        ? params.category
        : undefined,
    ],
    [
      "isPinned",
      typeof params.isPinned === "boolean"
        ? String(params.isPinned)
        : undefined,
    ],
    ["search", params.search],
    ["sort", params.sort],
    ["limit", formatOptionalIntParam(params.limit)],
    ["offset", formatOptionalIntParam(params.offset)],
  ];

  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function matchesNoteIdentifier(
  note: NoteRecord,
  targetId: string | number
): boolean {
  const cleanTarget = String(targetId);
  return (
    String(note.id) === cleanTarget || String(note.documentId) === cleanTarget
  );
}

export function useNotes(initialParams: NoteFilterParams = {}) {
  const { get, post, put, del } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [summary, setSummary] = useState<NotesSummaryStats>(() =>
    computeNotesSummaryStats([])
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const pendingMutationsRef = useRef<number>(0);
  const notesRef = useRef<NoteRecord[]>([]);

  const beginMutation = useCallback(() => {
    pendingMutationsRef.current += 1;
    setIsMutating(true);
  }, []);

  const endMutation = useCallback(() => {
    pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    if (pendingMutationsRef.current === 0) {
      setIsMutating(false);
    }
  }, []);

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: getTrad(id), defaultMessage }),
    [formatMessage]
  );

  const applyLocalNotesState = useCallback(
    (updater: (prev: NoteRecord[]) => NoteRecord[]) => {
      const next = sortNotesPinnedFirst(
        updater(notesRef.current),
        initialParams.sort ?? "DESC"
      );
      notesRef.current = next;
      setNotes(next);
      setSummary(computeNotesSummaryStats(next));
    },
    [initialParams.sort]
  );

  const fetchNotes = useCallback(
    async (overrideParams?: NoteFilterParams): Promise<NoteRecord[]> => {
      const requestId = ++requestIdRef.current;
      const merged = { ...initialParams, ...overrideParams };
      setIsLoading(true);
      try {
        const qs = buildNotesQueryString(merged);
        const res = await get<{
          data?: unknown[];
          meta?: { summary?: NotesSummaryStats };
        }>(`/${PLUGIN_ID}/notes${qs}`);

        const rawItems = Array.isArray(res?.data?.data) ? res.data.data : [];
        const normalized = rawItems.map((item) => normalizeNoteRecord(item));
        if (requestId === requestIdRef.current) {
          notesRef.current = normalized;
          setNotes(normalized);
          setSummary(
            res?.data?.meta?.summary ?? computeNotesSummaryStats(normalized)
          );
        }
        return normalized;
      } catch {
        if (requestId === requestIdRef.current) {
          toggleNotification({
            type: "warning",
            message: t("notes.notification.loadError", "Unable to load notes."),
          });
        }
        return [];
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      get,
      initialParams.category,
      initialParams.entityDocumentId,
      initialParams.entityId,
      initialParams.entityLocale,
      initialParams.entitySlug,
      initialParams.includeAllLocales,
      initialParams.isPinned,
      initialParams.limit,
      initialParams.offset,
      initialParams.search,
      initialParams.sort,
      t,
      toggleNotification,
    ]
  );

  useEffect(() => {
    void fetchNotes();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchNotes]);

  const createNote = useCallback(
    async (payload: NoteUpsertInput): Promise<NoteRecord | null> => {
      beginMutation();
      try {
        const res = await post<{ data?: unknown }>(`/${PLUGIN_ID}/notes`, {
          data: payload,
        });
        const created = res?.data?.data
          ? normalizeNoteRecord(res.data.data)
          : null;
        if (created) {
          applyLocalNotesState((prev) => [created, ...prev]);
        }
        toggleNotification({
          type: "success",
          message: t(
            "notes.notification.created",
            "Note has been successfully created."
          ),
        });
        await fetchNotes();
        return created;
      } catch {
        toggleNotification({
          type: "warning",
          message: t(
            "notes.notification.createError",
            "Failed to create note."
          ),
        });
        return null;
      } finally {
        endMutation();
      }
    },
    [
      applyLocalNotesState,
      beginMutation,
      endMutation,
      fetchNotes,
      post,
      t,
      toggleNotification,
    ]
  );

  const updateNote = useCallback(
    async (
      id: string | number,
      body: Partial<NoteUpsertInput>
    ): Promise<NoteRecord | null> => {
      beginMutation();
      try {
        const res = await put<{ data?: unknown }>(
          `/${PLUGIN_ID}/notes/${encodeURIComponent(String(id))}`,
          { data: body }
        );
        const updated = res?.data?.data
          ? normalizeNoteRecord(res.data.data)
          : null;
        if (updated) {
          applyLocalNotesState((prev) =>
            prev.map((item) =>
              matchesNoteIdentifier(item, id) ? updated : item
            )
          );
        }
        toggleNotification({
          type: "success",
          message: t(
            "notes.notification.updated",
            "Note has been successfully updated."
          ),
        });
        await fetchNotes();
        return updated;
      } catch {
        toggleNotification({
          type: "warning",
          message: t(
            "notes.notification.updateError",
            "Failed to update note."
          ),
        });
        return null;
      } finally {
        endMutation();
      }
    },
    [
      applyLocalNotesState,
      beginMutation,
      endMutation,
      fetchNotes,
      put,
      t,
      toggleNotification,
    ]
  );

  const deleteNote = useCallback(
    async (id: string | number): Promise<boolean> => {
      beginMutation();
      try {
        await del(`/${PLUGIN_ID}/notes/${encodeURIComponent(String(id))}`);
        applyLocalNotesState((prev) =>
          prev.filter((item) => !matchesNoteIdentifier(item, id))
        );
        toggleNotification({
          type: "success",
          message: t(
            "notes.notification.deleted",
            "Note has been successfully deleted."
          ),
        });
        await fetchNotes();
        return true;
      } catch {
        toggleNotification({
          type: "warning",
          message: t(
            "notes.notification.deleteError",
            "Failed to delete note."
          ),
        });
        return false;
      } finally {
        endMutation();
      }
    },
    [
      applyLocalNotesState,
      beginMutation,
      del,
      endMutation,
      fetchNotes,
      t,
      toggleNotification,
    ]
  );

  return {
    notes,
    summary,
    isLoading,
    isMutating,
    refetch: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}

export const useNote = useNotes;
