export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  calendar: {
    enabled: true,
    config: {
      defaultView: "dayGridMonth",
      defaultTimezone: env("CALENDAR_DEFAULT_TIMEZONE", "UTC"),
      defaultLocale: "auto",
      firstDay: 1,
      weekNumbers: true,
      weekNumberCalculation: "ISO",
      hour24: false,
      weekends: true,
      slotMinTime: "07:00:00",
      slotMaxTime: "22:00:00",
      slotDuration: "00:30:00",
      feedTitle: "Unified Organization Calendar",
      secondaryCalendars: [
        {
          id: "hijri",
          label: "Hijri (Umm al-Qura)",
          intlCalendar: "islamic-umalqura",
          dayOffset: 0,
          overrideField: "hijriDate",
          enabled: true,
        },
      ],
      sources: [
        {
          id: "bookings",
          label: "Bookings & Tours",
          uid: "api::booking.booking",
          color: "#2563EB",
          enabled: true,
          fields: {
            title: "visitorName",
            startDate: "preferredDate",
            timeSlot: "preferredTimeSlot",
            status: "bookingStatus",
            notes: "notes",
          },
          categoryColors: {
            confirmed: "#16A34A",
            pending: "#D97706",
            cancelled: "#DC2626",
          },
        },
      ],
    },
  },
  notes: {
    enabled: true,
    config: {
      defaultSortOrder: "DESC",
      enableLocaleScoping: true,
    },
  },
  seo: {
    enabled: true,
  },
});
