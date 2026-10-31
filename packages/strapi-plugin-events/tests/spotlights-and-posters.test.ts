import { describe, expect, it } from "vitest";

import contentApiControllerFactory from "../server/src/controllers/content-api";
import icalFactory from "../server/src/services/ical";
import occurrenceFactory from "../server/src/services/occurrence";
import rsvpFactory from "../server/src/services/rsvp";
import settingsFactory from "../server/src/services/settings";
import { EVENT_CONTENT_TYPE_UID, REGISTRATION_CONTENT_TYPE_UID } from "../shared/pluginId";
import {
  isEventSpotlightActiveOnDate,
  normalizeEventActionLinks,
  normalizeEventPoster,
  normalizeEventSpotlightConfig,
  sanitizeEventUrl,
} from "../shared/spotlightHelpers";

function createSpotlightMockStrapi() {
  const storeData: Record<string, unknown> = {};
  const db: Record<string, Array<Record<string, unknown>>> = {
    [EVENT_CONTENT_TYPE_UID]: [],
    [REGISTRATION_CONTENT_TYPE_UID]: [],
    "api::event.event": [],
  };

  const strapi: any = {
    config: {
      get: () => ({
        defaultTimezone: "America/Bogota",
        sources: [
          {
            id: "public-events",
            label: "Public Events",
            uid: "api::event.event",
            color: "#0D9488",
            enabled: true,
            fields: {
              title: "title",
              startDate: "date",
              endDate: "endDate",
              rrule: "recurrence",
              location: "location",
              category: "category",
              summary: "description",
              poster: "poster",
              actionLinks: "actionLinks",
              spotlightConfig: "spotlightConfig",
            },
          },
        ],
      }),
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeData[key] ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeData[key] = value;
      },
    }),
    documents: (uid: string) => ({
      findMany: async () => [...(db[uid] ?? [])],
      findOne: async ({ documentId }: { documentId: string }) =>
        (db[uid] ?? []).find((d) => d.documentId === documentId) ?? null,
    }),
    log: {
      debug: () => {},
    },
    plugin: (name: string) => {
      if (name === "events") {
        return {
          service: (svcName: string) => services[svcName],
        };
      }
      return null;
    },
  };

  const services: Record<string, any> = {};
  services.settings = settingsFactory({ strapi });
  services.rsvp = rsvpFactory({ strapi });
  services.occurrence = occurrenceFactory({ strapi });
  services.ical = icalFactory({ strapi });

  const contentApi = contentApiControllerFactory({ strapi });
  return { strapi, services, contentApi, db };
}

describe("Generic Event Poster, Action Links & Spotlight Corner Popup Service", () => {
  it("sanitizes URLs and normalizes Strapi Media poster objects, nested attributes, and fallback URLs", () => {
    expect(sanitizeEventUrl("https://turkiyeburslari.gov.tr")).toBe(
      "https://turkiyeburslari.gov.tr"
    );
    expect(sanitizeEventUrl("/uploads/ytb_poster_2026.webp")).toBe("/uploads/ytb_poster_2026.webp");
    expect(sanitizeEventUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeEventUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeEventUrl("//evil.example.com/payload")).toBeNull();

    const mediaPoster = normalizeEventPoster({
      url: "/uploads/diyanet_2026.jpg",
      alternativeText: "Diyanet Bursları 2026 Poster",
      mime: "image/jpeg",
      width: 1080,
      height: 1350,
    });
    expect(mediaPoster).toEqual({
      url: "/uploads/diyanet_2026.jpg",
      alt: "Diyanet Bursları 2026 Poster",
      mime: "image/jpeg",
      width: 1080,
      height: 1350,
    });

    const stringPoster = normalizeEventPoster(
      "https://cdn.example.org/posters/ytb.webp",
      "YTB Scholarship Poster"
    );
    expect(stringPoster).toEqual({
      url: "https://cdn.example.org/posters/ytb.webp",
      alt: "YTB Scholarship Poster",
    });

    expect(normalizeEventPoster({ url: "javascript:evil()" })).toBeUndefined();
  });

  it("normalizes actionLinks and filters out unsafe URLs", () => {
    const links = normalizeEventActionLinks([
      {
        label: "Apply on Türkiye Bursları",
        url: "https://turkiyeburslari.gov.tr",
        variant: "primary",
      },
      {
        label: "Malicious Link",
        url: "javascript:alert(document.cookie)",
      },
      {
        label: "Requirements Guide",
        url: "/es/events/ytb-scholarships",
        variant: "outline",
      },
    ]);

    expect(links).toHaveLength(2);
    expect(links?.[0]).toEqual({
      label: "Apply on Türkiye Bursları",
      url: "https://turkiyeburslari.gov.tr",
      variant: "primary",
      external: true,
    });
    expect(links?.[1]).toEqual({
      label: "Requirements Guide",
      url: "/es/events/ytb-scholarships",
      variant: "outline",
      external: false,
    });
  });

  it("evaluates spotlight active windows and returns priority-sorted active spotlights via GET /spotlights", async () => {
    const { services, contentApi, db } = createSpotlightMockStrapi();
    await services.settings.ensureInitialized();

    // 1. Diyanet Scholarship (priority 10)
    db["api::event.event"].push({
      documentId: "evt-diyanet-2026",
      title: "Becas TDV Diyanet (Turquía)",
      date: "2026-02-01",
      endDate: "2026-02-28",
      category: "education",
      description: "Convocatoria anual de becas de la Fundación Diyanet de Turquía.",
      poster: {
        url: "/images/events/diyanet-scholarship-poster.svg",
        alternativeText: "Afiche Becas Diyanet",
        mime: "image/svg+xml",
        width: 800,
        height: 1100,
      },
      actionLinks: [
        {
          label: "Portal Oficial TDV",
          url: "https://diyanetburslari.tdv.org",
          variant: "primary",
        },
      ],
      spotlightConfig: {
        enabled: true,
        badgeText: "Convocatoria Abierta",
        priority: 10,
        position: "bottom-end",
        showCountdown: true,
        startAt: "2026-02-01",
        endAt: "2026-02-28",
      },
    });

    // 2. YTB Türkiye Bursları (priority 20 -> should sort first!)
    db["api::event.event"].push({
      documentId: "evt-ytb-2026",
      title: "Becas Türkiye Bursları (YTB)",
      date: "2026-01-10",
      endDate: "2026-02-20",
      category: "education",
      description: "Becas completas del Gobierno de Turquía para pregrado y posgrado.",
      poster: {
        url: "/images/events/ytb-scholarship-poster.svg",
        alternativeText: "Afiche Türkiye Bursları YTB",
        mime: "image/svg+xml",
        width: 800,
        height: 1100,
      },
      actionLinks: [
        {
          label: "Postular en YTB",
          url: "https://turkiyeburslari.gov.tr",
          variant: "primary",
        },
        {
          label: "Requisitos y Guía",
          url: "/es/events",
          variant: "outline",
        },
      ],
      spotlightConfig: {
        enabled: true,
        badgeText: "Inscripciones Febrero",
        priority: 20,
        position: "bottom-end",
        showCountdown: true,
        startAt: "2026-01-10",
        endAt: "2026-02-20",
      },
    });

    // 3. Regular non-spotlight event in February
    db["api::event.event"].push({
      documentId: "evt-regular-lecture",
      title: "Conferencia Mensual",
      date: "2026-02-14",
      endDate: "2026-02-14",
      category: "lecture",
    });

    // Query active spotlights on Feb 12, 2026 -> both YTB (priority 20) and Diyanet (priority 10) active
    const ctx: any = {
      query: {
        date: "2026-02-12T12:00:00.000Z",
        locale: "es",
      },
      set: () => {},
      badRequest: () => {},
    };
    await contentApi.listSpotlights(ctx);

    const activeFeb12 = ctx.body.data;
    expect(activeFeb12).toHaveLength(2);
    expect(activeFeb12[0].documentId).toBe("evt-ytb-2026");
    expect(activeFeb12[0].poster?.url).toBe("/images/events/ytb-scholarship-poster.svg");
    expect(activeFeb12[0].actionLinks).toHaveLength(2);
    expect(activeFeb12[0].spotlightConfig?.badgeText).toBe("Inscripciones Febrero");

    expect(activeFeb12[1].documentId).toBe("evt-diyanet-2026");
    expect(activeFeb12[1].spotlightConfig?.priority).toBe(10);

    // Query active spotlights on Feb 25, 2026 -> YTB ended Feb 20, only Diyanet remains active
    const activeFeb25 = await services.occurrence.getActiveSpotlights({
      date: "2026-02-25T12:00:00.000Z",
      includeDrafts: true,
    });
    expect(activeFeb25).toHaveLength(1);
    expect(activeFeb25[0].documentId).toBe("evt-diyanet-2026");

    // Direct helper check outside window
    expect(
      isEventSpotlightActiveOnDate({
        spotlightConfig: normalizeEventSpotlightConfig({
          enabled: true,
          startAt: "2026-02-01",
          endAt: "2026-02-28",
        }),
        eventStartDate: "2026-02-01T00:00:00.000Z",
        eventEndDate: "2026-02-28T23:59:59.000Z",
        referenceDate: "2026-03-05T00:00:00.000Z",
      })
    ).toBe(false);
  });
});
