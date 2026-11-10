import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StrapiKoaContext } from "../server/src/types";
import {
  isEventSpotlightActiveOnDate,
  normalizeEventActionLinks,
  normalizeEventPoster,
  normalizeEventSpotlightConfig,
  sanitizeEventUrl,
} from "../shared/spotlightHelpers";
import type { ExpandedOccurrence } from "../shared/types";
import { createMockStrapi } from "./mockStrapiHelper";

describe("Event Poster, Action Links & Spotlight Corner Popup Service", () => {
  it("sanitizes URLs, blocks backslash relative URLs, and disallows mailto on posters", () => {
    assert.equal(
      sanitizeEventUrl("https://turkiyeburslari.gov.tr"),
      "https://turkiyeburslari.gov.tr"
    );
    assert.equal(
      sanitizeEventUrl("/uploads/ytb_poster_2026.webp"),
      "/uploads/ytb_poster_2026.webp"
    );
    assert.equal(sanitizeEventUrl("javascript:alert(1)"), null);
    assert.equal(
      sanitizeEventUrl("data:text/html,<script>alert(1)</script>"),
      null
    );
    assert.equal(sanitizeEventUrl("//evil.example.com/payload"), null);
    assert.equal(sanitizeEventUrl("/\\evil.org"), null);
    assert.equal(sanitizeEventUrl("/path\\evil"), null);
    assert.equal(
      sanitizeEventUrl("mailto:info@example.org", { allowMailto: false }),
      null
    );

    const mediaPoster = normalizeEventPoster({
      url: "/uploads/diyanet_2026.jpg",
      alternativeText: "Diyanet Bursları 2026 Poster",
      mime: "image/jpeg",
      width: 1080,
      height: 1350,
    });
    assert.deepEqual(mediaPoster, {
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
    assert.deepEqual(stringPoster, {
      url: "https://cdn.example.org/posters/ytb.webp",
      alt: "YTB Scholarship Poster",
    });

    assert.equal(normalizeEventPoster({ url: "javascript:evil()" }), undefined);
    assert.equal(normalizeEventPoster("mailto:attacker@evil.org"), undefined);
    assert.equal(
      normalizeEventPoster({ url: "/\\evil.org/img.png" }),
      undefined
    );
  });

  it("normalizes actionLinks and filters out unsafe URLs while allowing mailto CTAs", () => {
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
        label: "Backslash Bypass",
        url: "/\\evil.org",
      },
      {
        label: "Requirements Guide",
        url: "/es/events/ytb-scholarships",
        variant: "outline",
      },
      {
        label: "Contact Organizer",
        url: "mailto:events@example.org",
      },
    ]);

    assert.equal(links?.length, 3);
    assert.deepEqual(links?.[0], {
      label: "Apply on Türkiye Bursları",
      url: "https://turkiyeburslari.gov.tr",
      variant: "primary",
      external: true,
    });
    assert.deepEqual(links?.[1], {
      label: "Requirements Guide",
      url: "/es/events/ytb-scholarships",
      variant: "outline",
      external: false,
    });
    assert.equal(links?.[2]?.url, "mailto:events@example.org");
  });

  it("evaluates spotlight active windows, sanitizes virtualUrl, and returns priority-sorted spotlights", async () => {
    const { services, controllers, db } = createMockStrapi({
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
    });
    await services.settings.ensureInitialized();

    db["api::event.event"].push({
      documentId: "evt-diyanet-2026",
      title: "Becas TDV Diyanet (Turquía)",
      date: "2026-02-01",
      endDate: "2026-02-28",
      category: "education",
      virtualUrl: "javascript:alert(1)",
      poster: {
        url: "/images/events/diyanet-scholarship-poster.svg",
        alternativeText: "Afiche Becas Diyanet",
        mime: "image/svg+xml",
        width: 800,
        height: 1100,
      },
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

    db["api::event.event"].push({
      documentId: "evt-ytb-2026",
      title: "Becas Türkiye Bursları (YTB)",
      date: "2026-01-10",
      endDate: "2026-02-20",
      category: "education",
      virtualUrl: "https://meet.example.org/ytb",
      poster: {
        url: "/images/events/ytb-scholarship-poster.svg",
      },
      actionLinks: [
        {
          label: "Postular en YTB",
          url: "https://turkiyeburslari.gov.tr",
          variant: "primary",
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

    db["api::event.event"].push({
      documentId: "evt-regular-lecture",
      title: "Conferencia Mensual",
      date: "2026-02-14",
      endDate: "2026-02-14",
      category: "lecture",
      recurrence: {
        rrule: "FREQ=DAILY;INTERVAL=1",
        timezone: "UTC",
      },
    });

    const ctx: StrapiKoaContext = {
      query: {
        date: "2026-02-12T12:00:00.000Z",
        locale: "es",
      },
      set: () => {},
      badRequest: () => {},
    };
    await controllers.contentApi.listSpotlights(ctx);

    const activeFeb12 = (ctx.body as { data: ExpandedOccurrence[] }).data;
    assert.equal(activeFeb12.length, 2);
    assert.equal(activeFeb12[0].documentId, "evt-ytb-2026");
    assert.equal(activeFeb12[0].virtualUrl, "https://meet.example.org/ytb");
    assert.equal(activeFeb12[1].documentId, "evt-diyanet-2026");
    assert.equal(activeFeb12[1].virtualUrl, undefined);

    const activeFeb25 = await services.occurrence.getActiveSpotlights({
      date: "2026-02-25T12:00:00.000Z",
      includeDrafts: true,
    });
    assert.equal(activeFeb25.length, 1);
    assert.equal(activeFeb25[0].documentId, "evt-diyanet-2026");

    assert.equal(
      isEventSpotlightActiveOnDate({
        spotlightConfig: normalizeEventSpotlightConfig({
          enabled: true,
          startAt: "2026-02-01",
          endAt: "2026-02-28",
        }),
        eventStartDate: "2026-02-01T00:00:00.000Z",
        eventEndDate: "2026-02-28T23:59:59.000Z",
        referenceDate: "2026-03-05T00:00:00.000Z",
      }),
      false
    );
  });
});
