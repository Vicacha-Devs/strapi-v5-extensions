import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import { mergeSelectOptions } from "@vicacha-devs/plugin-shared";
import * as React from "react";

import type {
  BroadcastChannel,
  EmailDesignerTemplateSummary,
} from "../../../shared/types";
import {
  EmailTemplateSelectorField,
  RequiredTextField,
} from "./CampaignsTableSection";
import type { TranslateFn } from "./DeliveryLedgerSection";
import {
  getBroadcastChannelOptions,
  getBroadcastTopicOptions,
} from "./OrganizationEmailTab";

export interface CampaignComposerFormProps {
  t: TranslateFn;
  editingCampaignId: string | null;
  isBusy: boolean;
  newSlug: string;
  setNewSlug: (val: string) => void;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newTopic: string;
  setNewTopic: (val: string) => void;
  newChannels: BroadcastChannel[];
  setNewChannels: (val: BroadcastChannel[]) => void;
  newEmailTemplateRef: string;
  setNewEmailTemplateRef: (val: string) => void;
  newSubject: string;
  setNewSubject: (val: string) => void;
  newBodyText: string;
  setNewBodyText: (val: string) => void;
  emailTemplates: EmailDesignerTemplateSummary[];
  onCancelEdit: () => void;
  onSave: () => void;
}

export const CampaignComposerForm: React.FC<CampaignComposerFormProps> = ({
  t,
  editingCampaignId,
  isBusy,
  newSlug,
  setNewSlug,
  newTitle,
  setNewTitle,
  newTopic,
  setNewTopic,
  newChannels,
  setNewChannels,
  newEmailTemplateRef,
  setNewEmailTemplateRef,
  newSubject,
  setNewSubject,
  newBodyText,
  setNewBodyText,
  emailTemplates,
  onCancelEdit,
  onSave,
}) => {
  const campaignFormTitle = editingCampaignId
    ? `${t("page.ui.edit_broadcast_campaign", "Edit Broadcast Campaign")} (${newSlug})`
    : t(
        "page.ui.compose_new_omnichannel_broadcast",
        "Compose New Omnichannel Broadcast"
      );
  const topicOpts = mergeSelectOptions(getBroadcastTopicOptions(t), [newTopic]);
  const channelOpts = getBroadcastChannelOptions(t);

  return (
    <Box
      padding={5}
      marginBottom={5}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta" tag="h3" fontWeight="bold">
          {campaignFormTitle}
        </Typography>
        {editingCampaignId && (
          <Badge active>{t("common.editing_mode", "Editing Mode")}</Badge>
        )}
      </Flex>
      <Box
        paddingTop={3}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        <RequiredTextField
          name="slug"
          label={t("field.campaign_slug", "Campaign Slug")}
          hint={t(
            "page.ui.unique_url_safe_identifier_for_idempotency_track",
            "Unique URL-safe identifier for idempotency tracking."
          )}
          placeholder={t(
            "placeholder.e_g_friday_khutbah_bulletin",
            "e.g., friday-khutbah-bulletin"
          )}
          value={newSlug}
          onChange={setNewSlug}
        />
        <RequiredTextField
          name="title"
          label={t("field.campaign_title", "Campaign Title")}
          hint={t(
            "page.ui.internal_display_name_in_the_campaign_table",
            "Internal display name in the campaign table."
          )}
          placeholder={t(
            "placeholder.e_g_bolet_n_semanal_de_jumu_ah",
            "e.g., Boletín Semanal de Jumu'ah"
          )}
          value={newTitle}
          onChange={setNewTitle}
        />
        <Field.Root
          name="topic"
          hint={t(
            "page.ui.target_subscriber_segment_and_telegram_forum_thr",
            "Target subscriber segment and Telegram forum thread."
          )}
        >
          <Field.Label>{t("field.topic_segment", "Topic Segment")}</Field.Label>
          <SingleSelect
            name="topic"
            value={newTopic || "announcements"}
            onChange={(val: string | number) => setNewTopic(String(val))}
          >
            {topicOpts.map((opt) => (
              <SingleSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Hint />
        </Field.Root>
        <Field.Root
          name="channels"
          hint={t(
            "page.ui.channels_hint_combination",
            "Any combination of: email, telegram, whatsapp"
          )}
        >
          <Field.Label>{t("field.channels", "Channels")}</Field.Label>
          <MultiSelect
            name="channels"
            withTags
            placeholder={t("placeholder.select_channels", "Select channels...")}
            value={newChannels}
            onChange={(nextValues: string[]) =>
              setNewChannels(
                nextValues.length > 0
                  ? (nextValues as BroadcastChannel[])
                  : ["email"]
              )
            }
            onClear={() => setNewChannels(["email"])}
          >
            {channelOpts.map((opt) => (
              <MultiSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </MultiSelectOption>
            ))}
          </MultiSelect>
          <Field.Hint />
        </Field.Root>

        <EmailTemplateSelectorField
          t={t}
          emailTemplates={emailTemplates}
          value={newEmailTemplateRef}
          onChange={setNewEmailTemplateRef}
        />

        <RequiredTextField
          name="subject"
          label={t("field.subject_headline", "Subject / Headline")}
          hint={t(
            "page.ui.email_subject_line_and_bold_header_on_telegram_w",
            "Email subject line and bold header on Telegram/WhatsApp."
          )}
          placeholder={t(
            "placeholder.e_g_as_salamu_alaykum_horarios_y_anuncios",
            "e.g., As-salamu alaykum — Prayer Times & Announcements"
          )}
          value={newSubject}
          onChange={setNewSubject}
        />
        <Box style={{ gridColumn: "1 / -1" }}>
          <RequiredTextField
            name="bodyText"
            label={t(
              "field.message_body_with_placeholders",
              "Message Body (supports '{{recipientName}}', '{{secondaryDate}}', '{{organizationName}}')"
            )}
            hint={t(
              "page.ui.main_text_dispatched_across_email_telegram_and_w",
              "Main text dispatched across Email, Telegram, and WhatsApp channels."
            )}
            placeholder={t(
              "placeholder.e_g_hola_recipientname_hoy_secondarydate_te_invi",
              "e.g., Hello '{{recipientName}}', today ('{{secondaryDate}}') we invite you to..."
            )}
            value={newBodyText}
            onChange={setNewBodyText}
          />
        </Box>
      </Box>
      <Flex justifyContent="flex-end" paddingTop={3} gap={2}>
        {editingCampaignId && (
          <Button
            variant="tertiary"
            disabled={isBusy}
            onClick={() => onCancelEdit()}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        )}
        <Button loading={isBusy} disabled={isBusy} onClick={onSave}>
          {editingCampaignId
            ? t("page.ui.save_campaign_changes", "Save Campaign Changes")
            : t("page.ui.create_campaign", "Create Campaign")}
        </Button>
      </Flex>
    </Box>
  );
};
