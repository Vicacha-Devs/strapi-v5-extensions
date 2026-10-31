import React from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { CampaignKind, DonationsSettings } from '../../../../shared';
import { CurrencySelectField } from '../CurrencyCountryInput';
import {
  buildCategoryOptions,
  type CampaignFormState,
  type InputChangeEvent,
  type TranslateFn,
} from './donationsHelpers';

const UtilityInvoiceFields: React.FC<{
  form: CampaignFormState;
  onPatchForm: (patch: Partial<CampaignFormState>) => void;
  t: TranslateFn;
}> = ({ form, onPatchForm, t }) => (
  <>
    <Field.Root name="invoiceProvider">
      <Field.Label>
        {t('composer.field.invoice_provider', 'Utility / Service Provider')}
      </Field.Label>
      <TextInput
        name="invoiceProvider"
        placeholder={t(
          'composer.placeholder.invoice_provider',
          'e.g., Enel, Vanti, Acueducto, ETB'
        )}
        value={form.invoiceProvider}
        onChange={(e: InputChangeEvent) =>
          onPatchForm({ invoiceProvider: e.target.value })
        }
      />
    </Field.Root>

    <Field.Root name="billingPeriod">
      <Field.Label>
        {t('composer.field.billing_period', 'Billing Period')}
      </Field.Label>
      <TextInput
        name="billingPeriod"
        placeholder={t('composer.placeholder.billing_period', 'e.g., March 2026')}
        value={form.billingPeriod}
        onChange={(e: InputChangeEvent) =>
          onPatchForm({ billingPeriod: e.target.value })
        }
      />
    </Field.Root>

    <Field.Root name="dueDate">
      <Field.Label>
        {t('composer.field.due_date', 'Due Date (YYYY-MM-DD)')}
      </Field.Label>
      <TextInput
        name="dueDate"
        placeholder={t('composer.placeholder.due_date', '2026-03-28')}
        value={form.dueDate}
        onChange={(e: InputChangeEvent) =>
          onPatchForm({ dueDate: e.target.value })
        }
      />
    </Field.Root>

    <Field.Root name="invoiceReference">
      <Field.Label>
        {t('composer.field.invoice_reference', 'Invoice Reference Number')}
      </Field.Label>
      <TextInput
        name="invoiceReference"
        placeholder={t(
          'composer.placeholder.invoice_reference',
          'e.g., ENEL-8849201-03'
        )}
        value={form.invoiceReference}
        onChange={(e: InputChangeEvent) =>
          onPatchForm({ invoiceReference: e.target.value })
        }
      />
    </Field.Root>
  </>
);

export interface CampaignComposerSectionProps {
  form: CampaignFormState;
  settings: DonationsSettings | null;
  campaignKindLabels: Record<CampaignKind, string>;
  creatingCampaign: boolean;
  onPatchForm: (patch: Partial<CampaignFormState>) => void;
  onApplyPreset: (
    preset: 'crowdfunding' | 'utility_bill' | 'computer_donation' | 'seasonal_gift'
  ) => void;
  onCancel: () => void;
  onSubmit: () => void;
  t: TranslateFn;
}

export const CampaignComposerSection: React.FC<CampaignComposerSectionProps> = ({
  form,
  settings,
  campaignKindLabels,
  creatingCampaign,
  onPatchForm,
  onApplyPreset,
  onCancel,
  onSubmit,
  t,
}) => {
  const categoryOptions = buildCategoryOptions(
    settings,
    form.isCustomCategory,
    form.category
  );
  const categorySelectValue = form.isCustomCategory
    ? '__custom__'
    : form.category || 'general_fund';

  const handleCategoryChange = (val: string | number) => {
    const nextVal = String(val);
    if (nextVal === '__custom__') {
      onPatchForm({ isCustomCategory: true });
    } else {
      onPatchForm({ isCustomCategory: false, category: nextVal });
    }
  };

  return (
    <Box
      marginBottom={6}
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ border: '1px solid rgba(79, 70, 229, 0.35)' }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom={4}
        wrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="beta" as="h2">
            {t(
              'composer.title',
              'Open New Donation Campaign, Utility Bill or Micro-Need'
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              'composer.subtitle',
              'Use a quick preset below or fill in custom parameters. Both description and body are Rich Text compatible with Strapi default RichText, Tiptap Editor, or CKEditor.'
            )}
          </Typography>
        </Box>
        <Flex gap={2} wrap="wrap">
          <Button
            size="S"
            variant="secondary"
            onClick={() => onApplyPreset('crowdfunding')}
          >
            {t('composer.preset.crowdfunding', 'Preset: Major Crowdfunding')}
          </Button>
          <Button
            size="S"
            variant="secondary"
            onClick={() => onApplyPreset('utility_bill')}
          >
            {t('composer.preset.utility_bill', 'Preset: Service / Utility Bill')}
          </Button>
          <Button
            size="S"
            variant="secondary"
            onClick={() => onApplyPreset('computer_donation')}
          >
            {t('composer.preset.computer_donation', 'Preset: Computers / Equipment')}
          </Button>
          <Button
            size="S"
            variant="secondary"
            onClick={() => onApplyPreset('seasonal_gift')}
          >
            {t('composer.preset.seasonal_gift', 'Preset: Kurban / Ramadan Gifts')}
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
        <Field.Root name="title" required>
          <Field.Label>
            {t('composer.field.title', 'Campaign / Bill Title')}
          </Field.Label>
          <TextInput
            name="title"
            placeholder={t(
              'composer.placeholder.title',
              'e.g., Classroom Computers Donation or Electricity Bill'
            )}
            value={form.title}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ title: e.target.value })
            }
          />
        </Field.Root>

        <Field.Root name="slug">
          <Field.Label>
            {t('composer.field.slug', 'Slug (auto-generated if empty)')}
          </Field.Label>
          <TextInput
            name="slug"
            placeholder={t(
              'composer.placeholder.slug',
              'e.g., classroom-computers-2026'
            )}
            value={form.slug}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ slug: e.target.value })
            }
          />
        </Field.Root>

        <Field.Root name="campaignKind">
          <Field.Label>{t('composer.field.kind', 'Campaign Kind')}</Field.Label>
          <SingleSelect
            value={form.kind}
            onChange={(val: string | number) =>
              onPatchForm({ kind: String(val) as CampaignKind })
            }
          >
            <SingleSelectOption value="major_campaign">
              {campaignKindLabels.major_campaign}
            </SingleSelectOption>
            <SingleSelectOption value="utility_invoice">
              {campaignKindLabels.utility_invoice}
            </SingleSelectOption>
            <SingleSelectOption value="micro_need">
              {campaignKindLabels.micro_need}
            </SingleSelectOption>
          </SingleSelect>
        </Field.Root>

        <Field.Root name="categoryKey">
          <Field.Label>{t('composer.field.category', 'Category Key')}</Field.Label>
          <SingleSelect
            value={categorySelectValue}
            onChange={handleCategoryChange}
          >
            {categoryOptions.map((opt) => (
              <SingleSelectOption key={opt.key} value={opt.key}>
                {opt.label}
              </SingleSelectOption>
            ))}
            <SingleSelectOption key="__custom__" value="__custom__">
              {t('composer.field.category_custom', '+ Type Custom Category Key...')}
            </SingleSelectOption>
          </SingleSelect>
          {form.isCustomCategory && (
            <Box paddingTop={2}>
              <TextInput
                name="customCategoryKey"
                placeholder={t(
                  'composer.placeholder.custom_category',
                  'e.g., orphan_sponsorship, winter_relief'
                )}
                value={form.category}
                onChange={(e: InputChangeEvent) =>
                  onPatchForm({ category: e.target.value })
                }
              />
            </Box>
          )}
        </Field.Root>

        <Field.Root name="goalAmount" required>
          <Field.Label>
            {t('composer.field.goal_amount', 'Goal / Total Bill Amount')}
          </Field.Label>
          <TextInput
            name="goalAmount"
            type="number"
            value={form.goalAmount}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ goalAmount: e.target.value })
            }
          />
        </Field.Root>

        <Field.Root name="raisedAmount">
          <Field.Label>
            {t('composer.field.raised_amount', 'Initial Raised Amount')}
          </Field.Label>
          <TextInput
            name="raisedAmount"
            type="number"
            value={form.raisedAmount}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ raisedAmount: e.target.value })
            }
          />
        </Field.Root>

        <CurrencySelectField
          name="currency"
          label={t('composer.field.currency', 'Currency (ISO 4217)')}
          value={form.currency}
          supportedCurrencies={settings?.supportedCurrencies}
          onChange={(nextCode) => onPatchForm({ currency: nextCode })}
        />

        {form.kind === 'utility_invoice' && (
          <UtilityInvoiceFields
            form={form}
            onPatchForm={onPatchForm}
            t={t}
          />
        )}
      </Box>

      <Box
        paddingTop={4}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
      >
        <Field.Root name="description">
          <Field.Label>
            {t(
              'composer.field.description',
              'Short Summary / Pitch (Rich Text compatible)'
            )}
          </Field.Label>
          <Textarea
            name="description"
            placeholder={t(
              'composer.placeholder.description',
              'Short summary displayed on campaign cards...'
            )}
            value={form.description}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ description: e.target.value })
            }
          />
        </Field.Root>

        <Field.Root name="body">
          <Field.Label>
            {t(
              'composer.field.body',
              'Full Rich Text Body (Markdown / HTML / Tiptap compatible)'
            )}
          </Field.Label>
          <Textarea
            name="body"
            placeholder={t(
              'composer.placeholder.body',
              'Write full campaign story, breakdown of needs, or impact report...'
            )}
            value={form.body}
            onChange={(e: InputChangeEvent) =>
              onPatchForm({ body: e.target.value })
            }
          />
        </Field.Root>
      </Box>

      <Flex justifyContent="flex-end" gap={2} paddingTop={4}>
        <Button variant="tertiary" onClick={onCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button onClick={onSubmit} loading={creatingCampaign}>
          {t('composer.submit', 'Create & Publish Campaign')}
        </Button>
      </Flex>
    </Box>
  );
};
