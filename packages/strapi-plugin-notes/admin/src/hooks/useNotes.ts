import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  computeNotesSummaryStats,
  normalizeNoteRecord,
  PLUGIN_ID,
  type NoteFilterParams,
  type NoteRecord,
  type NotesSummaryStats,
  type NoteUpsertInput,
} from '../../../shared';
import { getTrad } from '../utils';

function formatEntityIdParam(
  entityId: number | string | null | undefined
): string {
  if (entityId === undefined || entityId === null || entityId === '') {
    return '';
  }
  return String(entityId);
}

function buildNotesQueryString(params: NoteFilterParams = {}): string {
  const entries: Array<[string, string | undefined]> = [
    ['entitySlug', params.entitySlug],
    ['entityDocumentId', params.entityDocumentId],
    ['entityId', formatEntityIdParam(params.entityId)],
    ['entityLocale', params.entityLocale ?? undefined],
    ['includeAllLocales', params.includeAllLocales ? 'true' : undefined],
    [
      'category',
      params.category && params.category !== 'all' ? params.category : undefined,
    ],
    [
      'isPinned',
      typeof params.isPinned === 'boolean' ? String(params.isPinned) : undefined,
    ],
    ['search', params.search],
    ['sort', params.sort],
  ];

  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
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

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: getTrad(id), defaultMessage }),
    [formatMessage]
  );

  const fetchNotes = useCallback(
    async (overrideParams?: NoteFilterParams): Promise<NoteRecord[]> => {
      const merged = { ...initialParams, ...(overrideParams ?? {}) };
      setIsLoading(true);
      try {
        const qs = buildNotesQueryString(merged);
        const res = await get<{
          data?: unknown[];
          meta?: { summary?: NotesSummaryStats };
        }>(`/${PLUGIN_ID}/notes${qs}`);

        const rawItems = Array.isArray(res?.data?.data) ? res.data.data : [];
        const normalized = rawItems.map((item) => normalizeNoteRecord(item));
        setNotes(normalized);
        setSummary(
          res?.data?.meta?.summary ?? computeNotesSummaryStats(normalized)
        );
        return normalized;
      } catch {
        toggleNotification({
          type: 'warning',
          message: t('notes.notification.loadError', 'Unable to load notes.'),
        });
        return [];
      } finally {
        setIsLoading(false);
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
      initialParams.search,
      initialParams.sort,
      t,
      toggleNotification,
    ]
  );

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (payload: NoteUpsertInput): Promise<NoteRecord | null> => {
      setIsMutating(true);
      try {
        const res = await post<{ data?: unknown }>(`/${PLUGIN_ID}/notes`, {
          data: payload,
        });
        const created = res?.data?.data
          ? normalizeNoteRecord(res.data.data)
          : null;
        toggleNotification({
          type: 'success',
          message: t(
            'notes.notification.created',
            'Note has been successfully created.'
          ),
        });
        await fetchNotes();
        return created;
      } catch {
        toggleNotification({
          type: 'warning',
          message: t(
            'notes.notification.createError',
            'Failed to create note.'
          ),
        });
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchNotes, post, t, toggleNotification]
  );

  const updateNote = useCallback(
    async (
      id: string | number,
      body: Partial<NoteUpsertInput>
    ): Promise<NoteRecord | null> => {
      setIsMutating(true);
      try {
        const res = await put<{ data?: unknown }>(
          `/${PLUGIN_ID}/notes/${encodeURIComponent(String(id))}`,
          { data: body }
        );
        const updated = res?.data?.data
          ? normalizeNoteRecord(res.data.data)
          : null;
        toggleNotification({
          type: 'success',
          message: t(
            'notes.notification.updated',
            'Note has been successfully updated.'
          ),
        });
        await fetchNotes();
        return updated;
      } catch {
        toggleNotification({
          type: 'warning',
          message: t(
            'notes.notification.updateError',
            'Failed to update note.'
          ),
        });
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchNotes, put, t, toggleNotification]
  );

  const deleteNote = useCallback(
    async (id: string | number): Promise<boolean> => {
      setIsMutating(true);
      try {
        await del(`/${PLUGIN_ID}/notes/${encodeURIComponent(String(id))}`);
        toggleNotification({
          type: 'success',
          message: t(
            'notes.notification.deleted',
            'Note has been successfully deleted.'
          ),
        });
        await fetchNotes();
        return true;
      } catch {
        toggleNotification({
          type: 'warning',
          message: t(
            'notes.notification.deleteError',
            'Failed to delete note.'
          ),
        });
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [del, fetchNotes, t, toggleNotification]
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
