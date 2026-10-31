import type {
  AutomationRuleRecord,
  BroadcastChannel,
  BroadcastSettings,
  StarterCampaignTemplate,
  WhatsAppDriver,
} from "./types";

export const PLUGIN_ID = "broadcasts";

export const CAMPAIGN_UID = "plugin::broadcasts.campaign";
export const AUTOMATION_RULE_UID = "plugin::broadcasts.automation-rule";
export const DELIVERY_LOG_UID = "plugin::broadcasts.delivery-log";

export const SUPPORTED_CHANNELS: readonly BroadcastChannel[] = [
  "email",
  "telegram",
  "whatsapp",
] as const;

export const SUPPORTED_WHATSAPP_DRIVERS: readonly WhatsAppDriver[] = [
  "meta-cloud",
  "openwa",
  "evolution",
] as const;

export const DEFAULT_BROADCAST_TOPICS = [
  "announcements",
  "events",
  "courses",
  "ramadan_eid",
  "urgent_janazah",
  "newsletter",
] as const;

export const DEFAULT_BROADCAST_SETTINGS: BroadcastSettings = {
  primaryCalendar: "gregory",
  secondaryCalendars: ["islamic-umalqura"],
  defaultLocale: "es",
  supportedLocales: ["es", "en", "ar", "tr"],
  availableTopics: [...DEFAULT_BROADCAST_TOPICS],
  dryRun: true,
  enableInboxSubscriberBridge: true,
  enableEventHubAutomations: true,
  enableEmailDesignerBridge: true,
  defaultEmailTemplateRef: "",
  siteBaseUrl: "https://mezquitabogota.org",
  organizationName: "Mezquita Central Abu Bakr As-Siddiq — Bogotá",
  emailFromAddress: "no-reply@mezquitabogota.org",
  emailReplyToAddress: "info@mezquitabogota.org",
  telegramEnabled: true,
  telegramBotToken: "",
  telegramDefaultChatId: "@MezquitaCentralBogota",
  telegramTopicChatMap: {},
  telegramTopicThreadMap: {},
  whatsappEnabled: true,
  whatsappDriver: "meta-cloud",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappGatewayUrl: "",
  whatsappGatewaySession: "default",
  whatsappGatewayApiKey: "",
  whatsappDefaultRecipients: [],
  whatsappTopicGroupMap: {},
  allowLocalhostGateways: false,
  publicChannelLinks: [
    {
      id: "telegram-main",
      channel: "telegram",
      label: "Canal Oficial de Telegram",
      handle: "@MezquitaCentralBogota",
      inviteUrl: "https://t.me/MezquitaCentralBogota",
      topic: "announcements",
      localizedLabels: {
        es: "Canal Oficial de Telegram",
        en: "Official Telegram Channel",
        ar: "القناة الرسمية على تيليجرام",
        tr: "Resmi Telegram Kanalı",
      },
      localizedDescriptions: {
        es: "Horarios de Jumu’ah, avistamiento lunar de Ramadán, cursos y avisos urgentes.",
        en: "Jumu’ah schedules, Ramadan moon sighting, courses, and urgent community notices.",
        ar: "مواعيد صلاة الجمعة، تحري هلال رمضان، الدورات والإعلانات العاجلة.",
        tr: "Cuma vakitleri, Ramazan hilal gözlemi, kurslar ve acil duyurular.",
      },
    },
    {
      id: "whatsapp-community",
      channel: "whatsapp",
      label: "Comunidad Oficial de WhatsApp",
      handle: "+57 310 000 0000",
      inviteUrl: "https://whatsapp.com/channel/0029VaMezquitaBogota",
      topic: "announcements",
      localizedLabels: {
        es: "Comunidad Oficial de WhatsApp",
        en: "Official WhatsApp Community",
        ar: "مجتمع واتساب الرسمي",
        tr: "Resmi WhatsApp Topluluğu",
      },
      localizedDescriptions: {
        es: "Alertas directas de oración funeraria (Janazah), eventos comunitarios y boletín semanal.",
        en: "Direct Janazah funeral prayer alerts, community events, and weekly newsletter.",
        ar: "تنبيهات صلاة الجنازة العاجلة، الفعاليات المجتمعية والنشرة الأسبوعية.",
        tr: "Acil cenaze namazı duyuruları, topluluk etkinlikleri ve haftalık bülten.",
      },
    },
  ],
};

export const STARTER_CAMPAIGN_TEMPLATES: StarterCampaignTemplate[] = [
  {
    id: "jumuah-weekly-reminder",
    slug: "jumuah-weekly-reminder",
    title: "Recordatorio Semanal de Khutbah y Oración del Viernes (Jumu’ah)",
    topic: "announcements",
    channels: ["email", "telegram", "whatsapp"],
    priority: "normal",
    subject: "🕌 Jumu’ah en {{organizationName}} ({{secondaryDate}})",
    bodyText:
      "As-salamu alaykum {{recipientName}}. Te esperamos este viernes para la Khutbah y oración de Jumu’ah en {{organizationName}}. Fecha Hijri: {{secondaryDate}}.",
    bodyHtml:
      "<p>As-salamu alaykum <strong>{{recipientName}}</strong>,</p><p>Te esperamos este viernes para la Khutbah y oración congregacional de <strong>Jumu’ah</strong> en {{organizationName}}.</p><p>Calendario Hijri: <em>{{secondaryDate}}</em></p>",
    ctaLabel: "Ver Horarios de Oración",
    ctaUrl: "https://mezquitabogota.org/es/horarios",
    translations: {
      es: {
        subject: "🕌 Jumu’ah en {{organizationName}} ({{secondaryDate}})",
        bodyText:
          "As-salamu alaykum {{recipientName}}. Te esperamos este viernes para la Khutbah y oración de Jumu’ah en {{organizationName}}. Fecha Hijri: {{secondaryDate}}.",
        bodyHtml:
          "<p>As-salamu alaykum <strong>{{recipientName}}</strong>,</p><p>Te esperamos este viernes para la Khutbah y oración congregacional de <strong>Jumu’ah</strong> en {{organizationName}}.</p><p>Calendario Hijri: <em>{{secondaryDate}}</em></p>",
        ctaLabel: "Ver Horarios de Oración",
        ctaUrl: "https://mezquitabogota.org/es/horarios",
      },
      en: {
        subject: "🕌 Friday Jumu’ah Reminder — {{organizationName}} ({{secondaryDate}})",
        bodyText:
          "As-salamu alaykum {{recipientName}}. Join us this Friday for the Jumu’ah Khutbah and congregational prayer at {{organizationName}}. Hijri date: {{secondaryDate}}.",
        bodyHtml:
          "<p>As-salamu alaykum <strong>{{recipientName}}</strong>,</p><p>Join us this Friday for the <strong>Jumu’ah Khutbah</strong> and congregational prayer at {{organizationName}}.</p><p>Hijri date: <em>{{secondaryDate}}</em></p>",
        ctaLabel: "View Prayer Schedule",
        ctaUrl: "https://mezquitabogota.org/en/prayer-times",
      },
      ar: {
        subject: "🕌 تذكير صلاة وخطبة الجمعة — {{organizationName}} ({{secondaryDate}})",
        bodyText:
          "السلام عليكم {{recipientName}}، ندعوكم لحضور خطبة وصلاة الجمعة في {{organizationName}}. التاريخ الهجري: {{secondaryDate}}.",
        bodyHtml:
          "<p>السلام عليكم <strong>{{recipientName}}</strong>،</p><p>ندعوكم لحضور خطبة وصلاة <strong>الجمعة</strong> في {{organizationName}}.</p><p>التاريخ الهجري: <em>{{secondaryDate}}</em></p>",
        ctaLabel: "عرض مواقيت الصلاة",
        ctaUrl: "https://mezquitabogota.org/ar/prayer-times",
      },
      tr: {
        subject:
          "🕌 Cuma Hutbesi ve Namazı Hatırlatması — {{organizationName}} ({{secondaryDate}})",
        bodyText:
          "Es-selamu aleyküm {{recipientName}}. Bu Cuma {{organizationName}} bünyesinde Cuma hutbesi ve namazına davetlisiniz. Hicri Tarih: {{secondaryDate}}.",
        bodyHtml:
          "<p>Es-selamu aleyküm <strong>{{recipientName}}</strong>,</p><p>Bu Cuma {{organizationName}} bünyesinde <strong>Cuma Hutbesi ve Namazına</strong> davetlisiniz.</p><p>Hicri Tarih: <em>{{secondaryDate}}</em></p>",
        ctaLabel: "Namaz Vakitlerini Gör",
        ctaUrl: "https://mezquitabogota.org/tr/prayer-times",
      },
    },
  },
  {
    id: "urgent-janazah-alert",
    slug: "urgent-janazah-alert",
    title: "Aviso Urgente de Oración Funeraria (Salat al-Janazah)",
    topic: "urgent_janazah",
    channels: ["telegram", "whatsapp", "email"],
    priority: "urgent",
    subject: "🕯️ Aviso Urgente: Salat al-Janazah en {{organizationName}}",
    bodyText:
      "Inna lillahi wa inna ilayhi raji’un. Informamos a la comunidad que se realizará la oración funeraria (Salat al-Janazah) en {{organizationName}} después de la oración de Dhuhr ({{secondaryDate}}).",
    bodyHtml:
      "<p><strong>Inna lillahi wa inna ilayhi raji’un</strong></p><p>Informamos a la comunidad que se realizará la oración funeraria (<strong>Salat al-Janazah</strong>) en {{organizationName}} después de la oración de Dhuhr ({{secondaryDate}}).</p>",
    ctaLabel: "Detalles y Ubicación",
    ctaUrl: "https://mezquitabogota.org/es/avisos",
    translations: {
      es: {
        subject: "🕯️ Aviso Urgente: Salat al-Janazah en {{organizationName}}",
        bodyText:
          "Inna lillahi wa inna ilayhi raji’un. Informamos a la comunidad que se realizará la oración funeraria (Salat al-Janazah) en {{organizationName}} después de la oración de Dhuhr ({{secondaryDate}}).",
        ctaLabel: "Detalles y Ubicación",
        ctaUrl: "https://mezquitabogota.org/es/avisos",
      },
      en: {
        subject: "🕯️ Urgent Community Notice: Salat al-Janazah at {{organizationName}}",
        bodyText:
          "Inna lillahi wa inna ilayhi raji’un. Funeral prayer (Salat al-Janazah) will be held at {{organizationName}} following Dhuhr prayer ({{secondaryDate}}).",
        ctaLabel: "Details & Location",
        ctaUrl: "https://mezquitabogota.org/en/announcements",
      },
      ar: {
        subject: "🕯️ إعلان عاجل: صلاة الجنازة في {{organizationName}}",
        bodyText:
          "إنا لله وإنا إليه راجعون. تُقام صلاة الجنازة في {{organizationName}} عقب صلاة الظهر ({{secondaryDate}}).",
        ctaLabel: "التفاصيل والموقع",
        ctaUrl: "https://mezquitabogota.org/ar/announcements",
      },
      tr: {
        subject: "🕯️ Acil Duyuru: {{organizationName}} Cenaze Namazı",
        bodyText:
          "İnna lillahi ve inna ileyhi raciun. Öğle namazını müteakip {{organizationName}} camiimizde cenaze namazı kılınacaktır ({{secondaryDate}}).",
        ctaLabel: "Detaylar ve Konum",
        ctaUrl: "https://mezquitabogota.org/tr/announcements",
      },
    },
  },
];

export const STARTER_AUTOMATION_RULES: Array<
  Omit<AutomationRuleRecord, "documentId" | "lastTriggeredAt" | "triggerCount">
> = [
  {
    slug: "auto-alert-banner-broadcast",
    name: "Auto-Broadcast Urgent Site Alert Banners",
    eventName: "inbox.alert.published",
    topic: "announcements",
    channels: ["telegram", "whatsapp"],
    active: true,
    priority: "urgent",
    subjectTemplate: "🚨 {{title}} — {{organizationName}}",
    bodyTextTemplate: "🚨 {{title}}: {{message}} ({{secondaryDate}})",
    bodyHtmlTemplate:
      "<p><strong>🚨 {{title}}</strong></p><p>{{message}}</p><p><em>{{secondaryDate}}</em></p>",
    ctaLabelTemplate: "Ver Aviso Oficial",
    ctaUrlTemplate: "{{siteBaseUrl}}",
  },
  {
    slug: "auto-event-published-broadcast",
    name: "Auto-Broadcast Newly Published Community Events",
    eventName: "event.published",
    targetContentType: "api::event.event",
    topic: "events",
    channels: ["telegram", "email"],
    active: true,
    priority: "normal",
    subjectTemplate: "📅 Nuevo Evento: {{title}} ({{secondaryDate}})",
    bodyTextTemplate:
      "Nuevo evento comunitario en {{organizationName}}: {{title}}. {{summary}} ({{secondaryDate}}).",
    bodyHtmlTemplate:
      "<p>Nuevo evento comunitario en <strong>{{organizationName}}</strong>:</p><h3>{{title}}</h3><p>{{summary}}</p><p><em>{{secondaryDate}}</em></p>",
    ctaLabelTemplate: "Inscribirse al Evento",
    ctaUrlTemplate: "{{siteBaseUrl}}/events",
  },
];
