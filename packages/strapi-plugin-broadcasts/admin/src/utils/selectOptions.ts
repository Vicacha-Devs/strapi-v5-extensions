import type { BroadcastChannel, WhatsAppDriver } from "../../../shared/types";

export function getBroadcastTopicOptions(
  t: (id: string, defaultMessage: string) => string
): Array<{ value: string; label: string }> {
  return [
    {
      value: "announcements",
      label: t(
        "option.topic.announcements",
        "announcements — General Mosque Announcements"
      ),
    },
    {
      value: "events",
      label: t(
        "option.topic.events",
        "events — Community Events & Conferences"
      ),
    },
    {
      value: "courses",
      label: t(
        "option.topic.courses",
        "courses — Arabic, Quran & Islamic Studies Courses"
      ),
    },
    {
      value: "ramadan_eid",
      label: t(
        "option.topic.ramadan_eid",
        "ramadan_eid — Ramadan, Suhoor/Iftar & Eid Bulletins"
      ),
    },
    {
      value: "urgent_janazah",
      label: t(
        "option.topic.urgent_janazah",
        "urgent_janazah — Urgent Janazah & Funeral Alerts"
      ),
    },
    {
      value: "newsletter",
      label: t(
        "option.topic.newsletter",
        "newsletter — Weekly Jumu'ah & Community Newsletter"
      ),
    },
    {
      value: "khutbahs",
      label: t(
        "option.topic.khutbahs",
        "khutbahs — Friday Khutbah Summaries & Audio"
      ),
    },
    {
      value: "charity_campaigns",
      label: t(
        "option.topic.charity_campaigns",
        "charity_campaigns — Zakat & Relief Campaigns"
      ),
    },
    {
      value: "youth_programs",
      label: t(
        "option.topic.youth_programs",
        "youth_programs — Youth, Sisters & Family Programs"
      ),
    },
    {
      value: "new_muslims",
      label: t(
        "option.topic.new_muslims",
        "new_muslims — New Muslim Circle & Mentorship"
      ),
    },
  ];
}

export function getBroadcastChannelOptions(
  t: (id: string, defaultMessage: string) => string
): Array<{ value: BroadcastChannel; label: string }> {
  return [
    {
      value: "email",
      label: t("option.channel.email", "email — Email Newsletter & Bulletins"),
    },
    {
      value: "telegram",
      label: t(
        "option.channel.telegram",
        "telegram — Telegram Bot & Forum Topics"
      ),
    },
    {
      value: "whatsapp",
      label: t(
        "option.channel.whatsapp",
        "whatsapp — WhatsApp Cloud API / Gateway"
      ),
    },
  ];
}

export function getWhatsAppDriverOptions(
  t: (id: string, defaultMessage: string) => string
): Array<{ value: WhatsAppDriver; label: string }> {
  return [
    {
      value: "meta-cloud",
      label: t(
        "option.driver.meta_cloud",
        "Meta WhatsApp Cloud API (Official WABA — meta-cloud)"
      ),
    },
    {
      value: "evolution",
      label: t(
        "option.driver.evolution",
        "Evolution API v2 Self-Hosted Gateway (evolution)"
      ),
    },
    {
      value: "openwa",
      label: t("option.driver.openwa", "OpenWA Self-Hosted Gateway (openwa)"),
    },
  ];
}

export const BROADCAST_TOPIC_OPTIONS = getBroadcastTopicOptions(
  (_id, fallback) => fallback
);

export const BROADCAST_CHANNEL_OPTIONS = getBroadcastChannelOptions(
  (_id, fallback) => fallback
);
