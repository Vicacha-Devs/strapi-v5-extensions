import {
  formatSecondaryDate,
  type BroadcastSettings,
  type CampaignRecord,
  type CampaignStatus,
  type SubscriberRecipient,
} from "../../../shared";
import { mapRawSubscriber } from "./campaignChannelDispatch";

const ALLOWED_INITIAL_STATUSES = new Set<CampaignStatus>([
  "draft",
  "scheduled",
]);

const ALLOWED_USER_STATUS_TRANSITIONS: Record<
  CampaignStatus,
  readonly CampaignStatus[]
> = {
  draft: ["draft", "scheduled", "cancelled"],
  scheduled: ["draft", "scheduled", "cancelled"],
  sending: [],
  sent: ["sent"],
  failed: ["draft", "scheduled", "cancelled"],
  cancelled: ["cancelled", "draft"],
};

export function resolveInitialStatus(
  rawStatus: CampaignStatus | undefined
): CampaignStatus {
  if (rawStatus === undefined) return "draft";
  if (!ALLOWED_INITIAL_STATUSES.has(rawStatus)) {
    throw new Error('Initial campaign status must be "draft" or "scheduled"');
  }
  return rawStatus;
}

export function resolveUpdatedStatus(
  currentStatus: CampaignStatus,
  requestedStatus: CampaignStatus | undefined
): CampaignStatus {
  if (currentStatus === "sending") {
    throw new Error("Cannot modify a campaign while it is sending");
  }
  if (requestedStatus === undefined || requestedStatus === currentStatus) {
    return currentStatus;
  }
  const allowed = ALLOWED_USER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(requestedStatus)) {
    throw new Error(
      `Invalid campaign status transition from "${currentStatus}" to "${requestedStatus}"`
    );
  }
  return requestedStatus;
}

export function computeCampaignSecondaryDate(
  campaign: CampaignRecord,
  settings: BroadcastSettings
): NonNullable<CampaignRecord["secondaryDate"]> {
  if (campaign.secondaryDate?.formatted) {
    return campaign.secondaryDate;
  }
  const secondaryCal = settings.secondaryCalendars?.[0] || "islamic-umalqura";
  return formatSecondaryDate(
    new Date().toISOString().slice(0, 10),
    secondaryCal,
    settings.defaultLocale || "es"
  );
}

function toOptionalPlainString(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface RawDispatchOptions {
  customRecipients?: unknown;
  testRecipientEmail?: unknown;
  testRecipientPhone?: unknown;
  testTelegramChatId?: unknown;
}

export interface SanitizedDispatchOptions {
  hasCustomRecipientsList: boolean;
  customRecipients: SubscriberRecipient[];
  testRecipientEmail?: string;
  testRecipientPhone?: string;
  testTelegramChatId?: string;
}

export function sanitizeDispatchOptions(
  rawOptions: RawDispatchOptions | undefined,
  defaultLocale: string
): SanitizedDispatchOptions {
  const safeObj =
    rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)
      ? rawOptions
      : {};

  const testRecipientEmail = toOptionalPlainString(safeObj.testRecipientEmail);
  const testRecipientPhone = toOptionalPlainString(safeObj.testRecipientPhone);
  const testTelegramChatId = toOptionalPlainString(safeObj.testTelegramChatId);

  const hasCustomRecipientsList =
    Array.isArray(safeObj.customRecipients) &&
    safeObj.customRecipients.length > 0;

  const customRecipients: SubscriberRecipient[] = hasCustomRecipientsList
    ? (safeObj.customRecipients as unknown[])
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item)
        )
        .map((item) => mapRawSubscriber(item, defaultLocale))
    : [];

  return {
    hasCustomRecipientsList,
    customRecipients,
    testRecipientEmail,
    testRecipientPhone,
    testTelegramChatId,
  };
}

export async function buildSelectedRecipients(
  campaign: CampaignRecord,
  settings: BroadcastSettings,
  options: RawDispatchOptions,
  resolveTopicRecipients: (topic: string) => Promise<SubscriberRecipient[]>
): Promise<{
  isTestDispatch: boolean;
  testTelegramChatId?: string;
  recipients: SubscriberRecipient[];
}> {
  const clean = sanitizeDispatchOptions(
    options,
    settings.defaultLocale || "es"
  );
  const isTestDispatch = Boolean(
    clean.testRecipientEmail ||
    clean.testRecipientPhone ||
    clean.testTelegramChatId
  );
  if (isTestDispatch) {
    return {
      isTestDispatch: true,
      testTelegramChatId: clean.testTelegramChatId,
      recipients: [
        {
          email: clean.testRecipientEmail,
          phone: clean.testRecipientPhone,
          telegramChatId: clean.testTelegramChatId,
          fullName: "Test Recipient",
          locale: settings.defaultLocale,
          topics: [campaign.topic],
        },
      ],
    };
  }
  if (clean.hasCustomRecipientsList) {
    return { isTestDispatch: false, recipients: clean.customRecipients };
  }
  return {
    isTestDispatch: false,
    recipients: await resolveTopicRecipients(campaign.topic),
  };
}
