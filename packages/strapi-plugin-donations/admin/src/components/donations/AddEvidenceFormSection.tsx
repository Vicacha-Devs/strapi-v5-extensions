import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type {
  CampaignEvidenceType,
  DonationCampaignItem,
} from '../../../../shared';
import type {
  EvidenceFormState,
  InputChangeEvent,
  TranslateFn,
} from './donationsHelpers';

export const AddEvidenceFormSection: React.FC<{
  selectedCampaign: DonationCampaignItem;
  evForm: EvidenceFormState;
  evidenceTypeLabels: Record<CampaignEvidenceType, string>;
  savingEvidence: boolean;
  onPatchEvForm: (patch: Partial<EvidenceFormState>) => void;
  onApplyPreset: (preset: CampaignEvidenceType) => void;
  onAddEvidence: () => void;
  t: TranslateFn;
}> = ({
  selectedCampaign,
  evForm,
  evidenceTypeLabels,
  savingEvidence,
  onPatchEvForm,
  onApplyPreset,
  onAddEvidence,
  t,
}) => (
  <Box paddingTop={5}>
    <Flex
      justifyContent="space-between"
      alignItems="center"
      marginBottom={3}
      wrap="wrap"
      gap={2}
    >
      <Box>
        <Typography variant="delta" as="h3">
          {t(
            'inspector.section3.title',
            '3. Add New Evidence of Donation Effectiveness'
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            'inspector.section3.subtitle',
            'Attach proof of paid utility bills, photos of donated computers/equipment, or photos of Kurban & Ramadan gift distributions.'
          )}
        </Typography>
      </Box>
      <Flex gap={2} wrap="wrap">
        <Button
          size="S"
          variant="secondary"
          onClick={() => onApplyPreset('paid_receipt')}
        >
          {t('evidence.preset.btn.paid_bill', '+ Paid Service Bill')}
        </Button>
        <Button
          size="S"
          variant="secondary"
          onClick={() => onApplyPreset('photo_gallery')}
        >
          {t('evidence.preset.btn.computers', '+ Donated Computers Photos')}
        </Button>
        <Button
          size="S"
          variant="secondary"
          onClick={() => onApplyPreset('delivery_report')}
        >
          {t('evidence.preset.btn.gifts', '+ Kurban / Ramadan Gifts')}
        </Button>
        <Button
          size="S"
          variant="secondary"
          onClick={() => onApplyPreset('audit_document')}
        >
          {t('evidence.preset.btn.audit', '+ Financial Audit')}
        </Button>
      </Flex>
    </Flex>

    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      <Field.Root name="evTitle" required>
        <Field.Label>{t('evidence.field.title', 'Evidence Title')}</Field.Label>
        <TextInput
          name="evTitle"
          placeholder={t(
            'evidence.placeholder.title',
            'e.g., Enel Paid Receipt Feb 2026 or 10 Laptops Delivered'
          )}
          value={evForm.title}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ title: e.target.value })
          }
        />
      </Field.Root>

      <Field.Root name="evType">
        <Field.Label>{t('evidence.field.type', 'Evidence Type')}</Field.Label>
        <SingleSelect
          value={evForm.type}
          onChange={(val: string | number) =>
            onPatchEvForm({ type: String(val) as CampaignEvidenceType })
          }
        >
          <SingleSelectOption value="paid_receipt">
            {evidenceTypeLabels.paid_receipt}
          </SingleSelectOption>
          <SingleSelectOption value="photo_gallery">
            {evidenceTypeLabels.photo_gallery}
          </SingleSelectOption>
          <SingleSelectOption value="delivery_report">
            {evidenceTypeLabels.delivery_report}
          </SingleSelectOption>
          <SingleSelectOption value="audit_document">
            {evidenceTypeLabels.audit_document}
          </SingleSelectOption>
          <SingleSelectOption value="beneficiary_update">
            {evidenceTypeLabels.beneficiary_update}
          </SingleSelectOption>
        </SingleSelect>
      </Field.Root>

      <Field.Root name="evDate">
        <Field.Label>
          {t('evidence.field.date', 'Execution / Payment Date')}
        </Field.Label>
        <TextInput
          name="evDate"
          placeholder={t('evidence.placeholder.date', 'YYYY-MM-DD')}
          value={evForm.date}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ date: e.target.value })
          }
        />
      </Field.Root>

      <Field.Root name="evAmountSpent">
        <Field.Label>
          {t('evidence.field.amount_spent', 'Amount Spent / Paid ({currency})', {
            currency: selectedCampaign.currency,
          })}
        </Field.Label>
        <TextInput
          name="evAmountSpent"
          type="number"
          placeholder={t('evidence.placeholder.amount_spent', 'e.g., 1850000')}
          value={evForm.amountSpent}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ amountSpent: e.target.value })
          }
        />
      </Field.Root>

      <Field.Root name="evDocumentUrl">
        <Field.Label>
          {t(
            'evidence.field.document_url',
            'Receipt / Invoice Document URL (PDF or Scan)'
          )}
        </Field.Label>
        <TextInput
          name="evDocumentUrl"
          placeholder={t(
            'evidence.placeholder.document_url',
            'https://.../uploads/paid-bill-receipt.pdf'
          )}
          value={evForm.documentUrl}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ documentUrl: e.target.value })
          }
        />
      </Field.Root>

      <Field.Root name="evMediaUrls">
        <Field.Label>
          {t('evidence.field.media_urls', 'Photo Gallery URLs (comma-separated)')}
        </Field.Label>
        <TextInput
          name="evMediaUrls"
          placeholder={t(
            'evidence.placeholder.media_urls',
            'https://.../computers-1.jpg, https://.../kurban-gifts.jpg'
          )}
          value={evForm.mediaUrls}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ mediaUrls: e.target.value })
          }
        />
      </Field.Root>
    </Box>

    <Box paddingTop={3}>
      <Field.Root name="evBody">
        <Field.Label>
          {t(
            'evidence.field.body',
            'Evidence Rich Text Narrative (body — Markdown / HTML / Tiptap compatible)'
          )}
        </Field.Label>
        <Textarea
          name="evBody"
          placeholder={t(
            'evidence.placeholder.body',
            'Describe the impact, invoice payment reference, serial numbers of donated computers, or number of families reached during Kurban/Ramadan...'
          )}
          value={evForm.body}
          onChange={(e: InputChangeEvent) =>
            onPatchEvForm({ body: e.target.value })
          }
        />
      </Field.Root>
    </Box>

    <Flex
      justifyContent="space-between"
      alignItems="center"
      paddingTop={4}
      wrap="wrap"
      gap={3}
    >
      <Flex gap={4} wrap="wrap">
        <Checkbox
          checked={evForm.markPaid}
          onCheckedChange={(val: boolean) =>
            onPatchEvForm({ markPaid: Boolean(val) })
          }
        >
          {t(
            'evidence.checkbox.mark_paid',
            'Mark Campaign / Utility Bill status as PAID (100%)'
          )}
        </Checkbox>
        <Checkbox
          checked={evForm.appendBody}
          onCheckedChange={(val: boolean) =>
            onPatchEvForm({ appendBody: Boolean(val) })
          }
        >
          {t(
            'evidence.checkbox.append_body',
            'Also append this evidence section into the Campaign Rich Text body'
          )}
        </Checkbox>
      </Flex>

      <Button onClick={onAddEvidence} loading={savingEvidence}>
        {t('evidence.submit', 'Publish Impact Evidence')}
      </Button>
    </Flex>
  </Box>
);
