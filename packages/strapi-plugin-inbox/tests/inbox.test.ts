import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_INBOX_SETTINGS,
  FORM_UID,
  SUBMISSION_UID,
  SUBSCRIBER_UID,
  ALERT_BANNER_UID,
  SlidingWindowRateLimiter,
  escapeCsvCell,
  isHoneypotTriggered,
  localizeFormForLocale,
  submissionsToCsv,
  testCaptchaSecretKey,
  validateFormSubmission,
  verifyCaptchaToken,
  type FormRecord,
} from '../shared';
import formServiceFactory from '../server/src/services/formService';
import submissionServiceFactory from '../server/src/services/submissionService';
import subscriberServiceFactory from '../server/src/services/subscriberService';
import alertServiceFactory from '../server/src/services/alertService';

function createMockStrapi() {
  const storeMap = new Map<string, unknown>();
  const collections: Record<string, Array<Record<string, unknown>>> = {
    [FORM_UID]: [],
    [SUBMISSION_UID]: [],
    [SUBSCRIBER_UID]: [],
    [ALERT_BANNER_UID]: [],
  };
  let idCounter = 1;
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];

  const strapi: Record<string, unknown> = {
    config: {
      get: (_key: string, def?: unknown) => def ?? {},
    },
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    eventHub: {
      emit: (event: string, payload?: unknown) => {
        emittedEvents.push({ event, payload });
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeMap.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeMap.set(key, value);
      },
    }),
    documents: (uid: string) => ({
      findMany: async (params?: { filters?: Record<string, unknown>; limit?: number }) => {
        const list = collections[uid] || [];
        const filters = params?.filters || {};
        return list.filter((item) =>
          Object.entries(filters).every(([k, v]) => item[k] === v)
        );
      },
      findOne: async ({ documentId }: { documentId: string }) => {
        const list = collections[uid] || [];
        return list.find((item) => item.documentId === documentId) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const doc = {
          ...data,
          documentId: `doc_${idCounter++}`,
        };
        if (!collections[uid]) collections[uid] = [];
        collections[uid].push(doc);
        return doc;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = collections[uid] || [];
        const idx = list.findIndex((item) => item.documentId === documentId);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data };
        return list[idx];
      },
    }),
  };

  const services: Record<string, unknown> = {
    settings: {
      getSettings: async () => ({
        ...DEFAULT_INBOX_SETTINGS,
        supportedLocales: ['es', 'en', 'ar', 'tr'],
      }),
    },
  };

  strapi.plugin = (name: string) => {
    if (name === 'bookings') {
      return {
        service: () => ({
          createBooking: async (input: { serviceSlug: string; date: string }) => ({
            documentId: 'bkg_doc_1',
            referenceCode: `BKG-${input.serviceSlug.toUpperCase()}-${input.date}`,
          }),
        }),
      };
    }
    if (name === 'certificates') {
      return {
        service: () => ({
          issueCertificate: async (input: { templateSlug: string }) => ({
            certificateNumber: `CERT-2026-${input.templateSlug.toUpperCase()}`,
          }),
        }),
      };
    }
    return {
      service: (svcName: string) => services[svcName],
    };
  };

  services.formService = formServiceFactory({ strapi: strapi as never });
  services.submissionService = submissionServiceFactory({ strapi: strapi as never });
  services.subscriberService = subscriberServiceFactory({ strapi: strapi as never });
  services.alertService = alertServiceFactory({ strapi: strapi as never });

  return {
    strapi,
    services: services as {
      formService: ReturnType<typeof formServiceFactory>;
      submissionService: ReturnType<typeof submissionServiceFactory>;
      subscriberService: ReturnType<typeof subscriberServiceFactory>;
      alertService: ReturnType<typeof alertServiceFactory>;
    },
    emittedEvents,
  };
}

describe('@vicacha-devs/strapi-plugin-inbox', () => {
  it('1. localizes forms across >2 languages (es, en, ar, tr) and validates field rules', () => {
    const form: FormRecord = {
      title: 'Contact Form',
      slug: 'contact-form',
      category: 'contact',
      active: true,
      translations: {
        es: { title: 'Formulario de Contacto', submitButtonLabel: 'Enviar' },
        en: { title: 'Contact Form', submitButtonLabel: 'Submit' },
        ar: { title: 'نموذج الاتصال', submitButtonLabel: 'إرسال' },
        tr: { title: 'İletişim Formu', submitButtonLabel: 'Gönder' },
      },
      fields: [
        {
          id: 'f1',
          type: 'heading',
          name: 'header',
          label: 'Header',
          required: false,
        },
        {
          id: 'f2',
          type: 'text',
          name: 'fullName',
          label: 'Full Name',
          required: true,
          localizedLabels: {
            es: 'Nombre completo',
            en: 'Full Name',
            ar: 'الاسم الكامل',
            tr: 'Ad Soyad',
          },
          validation: [{ type: 'minLength', value: 3 }],
        },
        {
          id: 'f3',
          type: 'email',
          name: 'email',
          label: 'Email',
          required: true,
        },
      ],
      settings: {},
    };

    const trLocalized = localizeFormForLocale(form, 'tr');
    assert.equal(trLocalized.title, 'İletişim Formu');
    assert.equal(trLocalized.settings.submitButtonLabel, 'Gönder');
    assert.equal(trLocalized.fields[1].label, 'Ad Soyad');

    const arInvalid = validateFormSubmission(form.fields, { fullName: '', email: 'bad' }, 'ar');
    assert.equal(arInvalid.valid, false);
    assert.ok(arInvalid.errors.fullName[0].includes('الاسم الكامل'));
    assert.ok(arInvalid.errors.email.length > 0);

    const validRes = validateFormSubmission(
      form.fields,
      { fullName: '  Ahmad Al-Mansoor  ', email: 'ahmad@example.org', header: 'ignored' },
      'en'
    );
    assert.equal(validRes.valid, true);
    assert.equal(validRes.cleanedData.fullName, 'Ahmad Al-Mansoor');
    assert.equal('header' in validRes.cleanedData, false);
  });

  it('2. enforces Honeypot, Sliding-Window IP Rate Limiting, and fail-closed CAPTCHA verification', async () => {
    assert.equal(isHoneypotTriggered({ _website_url: '' }, '_website_url'), false);
    assert.equal(
      isHoneypotTriggered({ _website_url: 'https://spam.bot' }, '_website_url'),
      true
    );

    const limiter = new SlidingWindowRateLimiter();
    const t0 = 1_700_000_000_000;
    assert.equal(limiter.check('10.0.0.1', 'contact', 2, t0).allowed, true);
    assert.equal(limiter.check('10.0.0.1', 'contact', 2, t0 + 1000).allowed, true);
    const blocked = limiter.check('10.0.0.1', 'contact', 2, t0 + 2000);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 3500);

    // After 1 hour window expires, request is allowed again
    assert.equal(
      limiter.check('10.0.0.1', 'contact', 2, t0 + 3600 * 1000 + 5).allowed,
      true
    );

    // Fail-closed CAPTCHA check
    const okCaptcha = await verifyCaptchaToken(
      'turnstile',
      'sec_123',
      'tok_abc',
      '10.0.0.1',
      async () => ({ json: async () => ({ success: true }) })
    );
    assert.equal(okCaptcha, true);

    const networkFailureCaptcha = await verifyCaptchaToken(
      'recaptcha',
      'sec_123',
      'tok_abc',
      '10.0.0.1',
      async () => {
        throw new Error('Provider timeout');
      }
    );
    assert.equal(networkFailureCaptcha, false);

    const secretCheck = await testCaptchaSecretKey(
      'turnstile',
      'bad_secret',
      async () => ({
        json: async () => ({ 'error-codes': ['invalid-input-secret'] }),
      })
    );
    assert.equal(secretCheck.ok, false);
  });

  it('3. handles Service-Desk Casework workflow, checklist verification, Bookings & Certificates bridges, and safe CSV export', async () => {
    const { services } = createMockStrapi();

    const serviceForm = await services.formService.createFromTemplate(
      'service-desk-application',
      {
        slug: 'nikah-application',
        title: 'Nikah Application',
      }
    );
    assert.equal(serviceForm.slug, 'nikah-application');
    assert.equal(serviceForm.checklistTemplate?.length, 2);

    const sub = await services.submissionService.submitForm(
      'nikah-application',
      {
        applicantName: 'Yusuf & Amina',
        applicantEmail: 'yusuf@example.org',
        applicantPhone: '+573001112233',
        preferredDate: '2026-05-15',
        details: '=SUM(1,2) Requesting Nikah ceremony',
      },
      {
        ip: '192.168.1.50',
        locale: 'es',
        nowMs: Date.parse('2026-04-10T14:00:00.000Z'),
      }
    );

    assert.ok(sub.referenceCode.startsWith('INB-20260410-'));
    assert.equal(sub.status, 'new');
    assert.equal(sub.checklistItems?.length, 2);
    assert.ok(sub.secondaryDate?.formatted);

    // 1-Click Booking Bridge
    const booked = await services.submissionService.scheduleBookingFromSubmission(
      sub.documentId!,
      {
        serviceSlug: 'matrimonio',
        date: '2026-05-15',
        startTime: '10:00',
      }
    );
    assert.equal(booked.submission.status, 'scheduled');
    assert.equal(booked.bookingId, 'BKG-MATRIMONIO-2026-05-15');

    // Attempt Certificate Bridge before checklist items are verified -> should fail
    await assert.rejects(
      () =>
        services.submissionService.issueCertificateFromSubmission(sub.documentId!, {
          templateSlug: 'nikah-certificate',
          requireChecklistVerified: true,
        }),
      /required document\(s\) are not yet verified/
    );

    // Verify all checklist items
    const verifiedChecklist = (booked.submission.checklistItems || []).map((item) => ({
      ...item,
      verified: true,
      verifiedBy: 'Sheikh Ahmad',
    }));
    await services.submissionService.updateCasework(sub.documentId!, {
      status: 'under_review',
      checklistItems: verifiedChecklist,
      staffNotes: 'All civil & religious documents verified.',
    });

    // Issue Certificate Bridge now succeeds
    const certified = await services.submissionService.issueCertificateFromSubmission(
      sub.documentId!,
      {
        templateSlug: 'nikah-certificate',
        requireChecklistVerified: true,
      }
    );
    assert.equal(certified.submission.status, 'completed');
    assert.equal(certified.certificateNumber, 'CERT-2026-NIKAH-CERTIFICATE');

    // CSV Export neutralizes formula injection (=SUM...)
    const csv = await services.submissionService.exportCsv('nikah-application');
    assert.ok(csv.includes("'=SUM(1,2) Requesting Nikah ceremony"));
    assert.equal(escapeCsvCell('=cmd|'), "'=cmd|");
    const manualCsv = submissionsToCsv([certified.submission], serviceForm.fields);
    assert.ok(manualCsv.includes('CERT-2026-NIKAH-CERTIFICATE'));
  });

  it('4. manages Double Opt-In Subscribers (confirmToken & one-click unsubscribeToken)', async () => {
    const { services } = createMockStrapi();

    const sub = await services.subscriberService.subscribe({
      email: 'fatima@example.org',
      fullName: 'Fatima Zahra',
      locale: 'ar',
      topics: ['announcements', 'courses'],
    });

    assert.equal(sub.status, 'pending');
    assert.ok(sub.confirmToken);
    assert.ok(sub.unsubscribeToken);

    const confirmed = await services.subscriberService.confirmSubscription(
      sub.confirmToken!
    );
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.confirmToken, null);
    assert.ok(confirmed.confirmedAt);

    const unsubscribed = await services.subscriberService.unsubscribe(
      sub.unsubscribeToken
    );
    assert.equal(unsubscribed.status, 'unsubscribed');
    assert.ok(unsubscribed.unsubscribedAt);
  });

  it('5. filters and localizes time-bounded Site-Wide Alert Banners with secondary calendar labels', async () => {
    const { services } = createMockStrapi();

    await services.alertService.upsertAlertBanner({
      code: 'eid-al-fitr-2026',
      title: 'Eid al-Fitr Prayer Announcement',
      message: 'Eid prayer will take place at 7:00 AM.',
      severity: 'celebration',
      priority: 100,
      active: true,
      startsAt: '2026-03-19T00:00:00.000Z',
      endsAt: '2026-03-22T23:59:59.000Z',
      translations: {
        es: {
          title: 'Anuncio de la Oración de Eid al-Fitr',
          message: 'La oración de Eid se realizará a las 7:00 AM.',
          ctaLabel: 'Ver horarios',
          ctaUrl: '/es/events',
        },
        ar: {
          title: 'إعلان صلاة عيد الفطر',
          message: 'ستقام صلاة العيد في تمام الساعة 7:00 صباحاً.',
          ctaLabel: 'عرض المواعيد',
          ctaUrl: '/ar/events',
        },
      },
    });

    await services.alertService.upsertAlertBanner({
      code: 'expired-alert',
      title: 'Old Alert',
      message: 'Should not appear',
      severity: 'info',
      priority: 50,
      active: true,
      startsAt: '2025-01-01T00:00:00.000Z',
      endsAt: '2025-01-02T00:00:00.000Z',
    });

    const activeEs = await services.alertService.getActiveAlerts({
      locale: 'es',
      nowIso: '2026-03-20T12:00:00.000Z',
    });
    assert.equal(activeEs.length, 1);
    assert.equal(activeEs[0].code, 'eid-al-fitr-2026');
    assert.equal(activeEs[0].title, 'Anuncio de la Oración de Eid al-Fitr');
    assert.ok(activeEs[0].secondaryDateLabel);

    const activeAr = await services.alertService.getActiveAlerts({
      locale: 'ar',
      nowIso: '2026-03-20T12:00:00.000Z',
    });
    assert.equal(activeAr[0].title, 'إعلان صلاة عيد الفطر');
  });
});
