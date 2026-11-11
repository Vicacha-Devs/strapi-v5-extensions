import type {
  CalendarItemStatus,
  CalendarSourceMapping,
  TimeSlotWindow,
} from "../../../shared/types";

const DEFAULT_TIME_SLOTS: Record<string, TimeSlotWindow> = {
  morning: { start: "09:00:00", end: "11:00:00" },
  afternoon: { start: "14:00:00", end: "16:00:00" },
  evening: { start: "18:00:00", end: "20:00:00" },
};

function resolveDateOnlyWithSlot(
  rawStart: string,
  rawSlot: unknown,
  source: CalendarSourceMapping
) {
  if (typeof rawSlot === "string" && rawSlot) {
    const mapped = { ...DEFAULT_TIME_SLOTS, ...source.timeSlotMap }[rawSlot];
    if (mapped) {
      return {
        startDate: `${rawStart}T${mapped.start}.000Z`,
        endDate: `${rawStart}T${mapped.end}.000Z`,
        allDay: false,
      };
    }
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawSlot)) {
      const normalizedTime = rawSlot.length === 5 ? `${rawSlot}:00` : rawSlot;
      return {
        startDate: `${rawStart}T${normalizedTime}.000Z`,
        endDate: null,
        allDay: false,
      };
    }
  }
  return {
    startDate: `${rawStart}T00:00:00.000Z`,
    endDate: `${rawStart}T23:59:59.000Z`,
    allDay: source.defaultAllDay ?? true,
  };
}

export function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping
) {
  const rawStart = doc[source.fields.startDate];
  if (!rawStart || typeof rawStart !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    const rawSlot = source.fields.timeSlot ? doc[source.fields.timeSlot] : null;
    return resolveDateOnlyWithSlot(rawStart, rawSlot, source);
  }
  const rawEnd = source.fields.endDate ? doc[source.fields.endDate] : null;
  const allDay =
    typeof doc.allDay === "boolean"
      ? doc.allDay
      : Boolean(source.defaultAllDay);
  return {
    startDate: rawStart,
    endDate: typeof rawEnd === "string" && rawEnd ? rawEnd : null,
    allDay,
  };
}

const STATUS_MAP: Record<string, CalendarItemStatus> = {
  cancelled: "cancelled",
  canceled: "cancelled",
  rejected: "cancelled",
  postponed: "postponed",
  pending: "postponed",
  rescheduled: "rescheduled",
};

export function mapStatus(rawStatus: unknown): CalendarItemStatus {
  if (typeof rawStatus !== "string") return "scheduled";
  return STATUS_MAP[rawStatus.toLowerCase()] ?? "scheduled";
}
