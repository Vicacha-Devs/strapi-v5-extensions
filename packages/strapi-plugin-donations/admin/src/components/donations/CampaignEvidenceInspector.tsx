import React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Textarea,
  Typography,
} from '@strapi/design-system';
import {
  extractRichTextPlainText,
  type CampaignEvidenceItem,
  type CampaignEvidenceType,
  type DonationCampaignItem,
} from '../../../../shared';
import { AddEvidenceFormSection } from './AddEvidenceFormSection';
import {
  openInContentManager,
  type EvidenceFormState,
  type InputChangeEvent,
  type TranslateFn,
} from './donationsHelpers';

function formatEvidenceMetaLine(ev: CampaignEvidenceItem): string {
  const parts = [ev.date];
  const secFormatted = ev.secondaryDates?.[0]?.formatted;
  if (secFormatted) {
    parts[0] = `${ev.date} (${secFormatted})`;
  }
  if (ev.amountSpent > 0) {
    parts.push(`${ev.amountSpent.toLocaleString()} ${ev.currency}`);
  }
  if (ev.verifiedBy) {
    parts.push(ev.verifiedBy);
  }
  return parts.join(' • ');
}

const EvidenceItemCard: React.FC<{
  ev: CampaignEvidenceItem;
  evidenceTypeLabels: Record<CampaignEvidenceType, string>;
  onRemoveEvidence: (evidenceId: string) => void;
  t: TranslateFn;
}> = ({ ev, evidenceTypeLabels, onRemoveEvidence, t }) => {
  const badgeLabel = evidenceTypeLabels[ev.evidenceType] || ev.evidenceType;
  const metaLine = formatEvidenceMetaLine(ev);
  const hasMedia = Array.isArray(ev.mediaUrls) && ev.mediaUrls.length > 0;

  return (
    <Box
      padding={4}
      background="neutral100"
      hasRadius
      style={{ border: '1px solid rgba(128, 128, 128, 0.25)' }}
    >
      <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Badge>{badgeLabel}</Badge>
        <Button
          size="S"
          variant="danger-light"
          onClick={() => onRemoveEvidence(ev.id)}
        >
          {t('common.remove', 'Remove')}
        </Button>
      </Flex>

      <Box paddingTop={2}>
        <Typography fontWeight="bold">{ev.title}</Typography>
      </Box>
      <Typography variant="pi" textColor="neutral600">
        {metaLine}
      </Typography>

      {ev.body ? (
        <Box paddingTop={2}>
          <Typography variant="omega">
            {extractRichTextPlainText(ev.body)}
          </Typography>
        </Box>
      ) : null}

      {ev.documentUrl ? (
        <Box paddingTop={2}>
          <a
            href={ev.documentUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#4f46e5', fontWeight: 600, fontSize: 13 }}
          >
            {t(
              'evidence.view_document',
              'View Official Receipt / Bill Document →'
            )}
          </a>
        </Box>
      ) : null}

      {hasMedia ? (
        <Box
          paddingTop={3}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: 8,
          }}
        >
          {ev.mediaUrls.map((url, idx) => (
            <a
              key={`${ev.id}-media-${idx}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid rgba(128,128,128,0.25)',
              }}
            >
              <img
                src={url}
                alt={`${ev.title} ${idx + 1}`}
                style={{
                  width: '100%',
                  height: 68,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </a>
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export interface CampaignEvidenceInspectorProps {
  selectedCampaign: DonationCampaignItem;
  editingDescriptionText: string;
  editingBodyText: string;
  savingBody: boolean;
  evForm: EvidenceFormState;
  savingEvidence: boolean;
  evidenceTypeLabels: Record<CampaignEvidenceType, string>;
  onChangeDescription: (next: string) => void;
  onChangeBody: (next: string) => void;
  onSaveRichText: () => void;
  onPatchEvForm: (patch: Partial<EvidenceFormState>) => void;
  onApplyEvidencePreset: (preset: CampaignEvidenceType) => void;
  onAddEvidence: () => void;
  onRemoveEvidence: (evidenceId: string) => void;
  onClose: () => void;
  t: TranslateFn;
}

export const CampaignEvidenceInspector: React.FC<
  CampaignEvidenceInspectorProps
> = ({
  selectedCampaign,
  editingDescriptionText,
  editingBodyText,
  savingBody,
  evForm,
  savingEvidence,
  evidenceTypeLabels,
  onChangeDescription,
  onChangeBody,
  onSaveRichText,
  onPatchEvForm,
  onApplyEvidencePreset,
  onAddEvidence,
  onRemoveEvidence,
  onClose,
  t,
}) => {
  const evidences = selectedCampaign.evidences || [];

  return (
    <Box
      marginBottom={6}
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ border: '2px solid #4f46e5' }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        marginBottom={4}
        wrap="wrap"
        gap={3}
      >
        <Box>
          <Flex gap={2} alignItems="center">
            <Badge active>{selectedCampaign.campaignKind}</Badge>
            <Badge>{selectedCampaign.invoiceStatus.toUpperCase()}</Badge>
            <Badge>{selectedCampaign.progressPercent}%</Badge>
          </Flex>
          <Box paddingTop={2}>
            <Typography variant="beta" as="h2">
              {selectedCampaign.title} —{' '}
              {t(
                'inspector.header_suffix',
                'Impact Evidences & Rich Text Story'
              )}
            </Typography>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {t(
              'inspector.summary',
              'Raised {raised} of {goal} {currency} • {count} published impact evidences',
              {
                raised: selectedCampaign.raisedAmount.toLocaleString(),
                goal: selectedCampaign.goalAmount.toLocaleString(),
                currency: selectedCampaign.currency,
                count: selectedCampaign.evidenceCount || 0,
              }
            )}
          </Typography>
        </Box>
        <Flex gap={2}>
          {selectedCampaign.documentId ? (
            <Button
              variant="secondary"
              onClick={() => openInContentManager(selectedCampaign.documentId)}
            >
              {t(
                'inspector.open_in_cm_richtext',
                'Open in Content Manager (Tiptap / RichText Editor)'
              )}
            </Button>
          ) : null}
          <Button variant="tertiary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </Flex>
      </Flex>

      <Divider />

      <Box paddingTop={5} paddingBottom={5}>
        <Box marginBottom={2} style={{ marginBottom: 8 }}>
          <Typography variant="delta" tag="h3">
            {t(
              'inspector.section1.title',
              'Campaign Rich Text Body & Effectiveness Narrative'
            )}
          </Typography>
        </Box>
        <Typography variant="pi" textColor="neutral600">
          {t(
            'inspector.section1.subtitle',
            'Compatible with standard Strapi Rich Text (Markdown), @notum-cz/strapi-plugin-tiptap-editor, CKEditor, or HTML. Edit directly below or open in Content Manager for full media embeds.'
          )}
        </Typography>

        <Box
          paddingTop={3}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}
        >
          <Field.Root name="editDescription">
            <Field.Label>
              {t('inspector.field.description', 'Summary Description (description)')}
            </Field.Label>
            <Textarea
              name="editDescription"
              value={editingDescriptionText}
              onChange={(e: InputChangeEvent) =>
                onChangeDescription(e.target.value)
              }
            />
          </Field.Root>

          <Field.Root name="editBody">
            <Field.Label>
              {t(
                'inspector.field.body',
                'Full Rich Text Story & Impact Report (body)'
              )}
            </Field.Label>
            <Textarea
              name="editBody"
              placeholder={t(
                'inspector.placeholder.body',
                'Write Markdown, HTML, or rich text narrative of how donations were used...'
              )}
              value={editingBodyText}
              onChange={(e: InputChangeEvent) => onChangeBody(e.target.value)}
            />
          </Field.Root>
        </Box>

        <Flex justifyContent="flex-end" paddingTop={3}>
          <Button size="S" onClick={onSaveRichText} loading={savingBody}>
            {t('inspector.save_richtext', 'Save Rich Text Body')}
          </Button>
        </Flex>
      </Box>

      <Divider />

      <Box paddingTop={5} paddingBottom={5}>
        <Box marginBottom={3} style={{ marginBottom: 12 }}>
          <Typography variant="delta" tag="h3">
            {t(
              'inspector.section2.title',
              'Published Impact Evidences & Transparency Proofs ({count})',
              { count: evidences.length }
            )}
          </Typography>
        </Box>

        {evidences.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography textColor="neutral600">
              {t(
                'inspector.section2.empty',
                'No impact evidences uploaded yet for this campaign. Use the form below to attach a paid utility bill receipt, photos of donated computers/equipment, or Kurban/Ramadan gift distribution photos.'
              )}
            </Typography>
          </Box>
        ) : (
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {evidences.map((ev) => (
              <EvidenceItemCard
                key={ev.id}
                ev={ev}
                evidenceTypeLabels={evidenceTypeLabels}
                onRemoveEvidence={onRemoveEvidence}
                t={t}
              />
            ))}
          </Box>
        )}
      </Box>

      <Divider />

      <AddEvidenceFormSection
        selectedCampaign={selectedCampaign}
        evForm={evForm}
        evidenceTypeLabels={evidenceTypeLabels}
        savingEvidence={savingEvidence}
        onPatchEvForm={onPatchEvForm}
        onApplyPreset={onApplyEvidencePreset}
        onAddEvidence={onAddEvidence}
        t={t}
      />
    </Box>
  );
};
