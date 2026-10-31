import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  Field,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import {
  ISO_3166_COUNTRIES,
  formatCountryOptionLabel,
  getOrderedCurrencyOptions,
} from '../../../shared';

export interface CurrencySelectFieldProps {
  name?: string;
  label?: string;
  hint?: string;
  value: string;
  onChange: (nextCurrencyCode: string) => void;
  supportedCurrencies?: string[];
  required?: boolean;
  disabled?: boolean;
}

export const CurrencySelectField: React.FC<CurrencySelectFieldProps> = ({
  name = 'currency',
  label,
  hint,
  value,
  onChange,
  supportedCurrencies,
  required = false,
  disabled = false,
}) => {
  const { locale } = useIntl();
  const normalizedValue = (value || 'COP').trim().toUpperCase();
  const options = useMemo(
    () => getOrderedCurrencyOptions(supportedCurrencies, locale || 'en', normalizedValue),
    [supportedCurrencies, locale, normalizedValue]
  );

  return (
    <Field.Root name={name} required={required}>
      {label ? <Field.Label>{label}</Field.Label> : null}
      <SingleSelect
        name={name}
        value={normalizedValue}
        disabled={disabled}
        onChange={(val: string | number) => onChange(String(val).toUpperCase())}
      >
        {options.map((opt) => (
          <SingleSelectOption key={opt.code} value={opt.code}>
            {opt.isConfigured ? `${opt.label} ★` : opt.label}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {hint ? <Field.Hint>{hint}</Field.Hint> : null}
    </Field.Root>
  );
};

export interface StrapiCustomFieldInputProps {
  name: string;
  value?: unknown;
  onChange: (event: { target: { name: string; value: string; type: string } }) => void;
  label?: string;
  intlLabel?: { id: string; defaultMessage: string };
  description?: { id: string; defaultMessage: string };
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export const CurrencyCustomFieldInput: React.FC<StrapiCustomFieldInputProps> = ({
  name,
  value,
  onChange,
  label,
  intlLabel,
  description,
  hint,
  required,
  disabled,
  error,
}) => {
  const { formatMessage, locale } = useIntl();
  const effectiveLabel =
    label ||
    (intlLabel ? formatMessage(intlLabel) : 'Currency (ISO 4217)');
  const effectiveHint =
    hint || (description ? formatMessage(description) : undefined);
  const currentCode = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'COP';
  const options = useMemo(
    () => getOrderedCurrencyOptions(['COP', 'USD', 'EUR', 'TRY'], locale || 'en', currentCode),
    [locale, currentCode]
  );

  return (
    <Field.Root name={name} required={required} error={error}>
      <Field.Label>{effectiveLabel}</Field.Label>
      <SingleSelect
        name={name}
        value={currentCode}
        disabled={disabled}
        onChange={(val: string | number) =>
          onChange({
            target: {
              name,
              value: String(val).toUpperCase(),
              type: 'string',
            },
          })
        }
      >
        {options.map((opt) => (
          <SingleSelectOption key={opt.code} value={opt.code}>
            {opt.label}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {effectiveHint ? <Field.Hint>{effectiveHint}</Field.Hint> : null}
      <Field.Error />
    </Field.Root>
  );
};

export const CountryCustomFieldInput: React.FC<StrapiCustomFieldInputProps> = ({
  name,
  value,
  onChange,
  label,
  intlLabel,
  description,
  hint,
  required,
  disabled,
  error,
}) => {
  const { formatMessage, locale } = useIntl();
  const effectiveLabel =
    label ||
    (intlLabel ? formatMessage(intlLabel) : 'Country / Region (ISO 3166-1)');
  const effectiveHint =
    hint || (description ? formatMessage(description) : undefined);
  const currentCode = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'CO';

  return (
    <Field.Root name={name} required={required} error={error}>
      <Field.Label>{effectiveLabel}</Field.Label>
      <SingleSelect
        name={name}
        value={currentCode}
        disabled={disabled}
        onChange={(val: string | number) =>
          onChange({
            target: {
              name,
              value: String(val).toUpperCase(),
              type: 'string',
            },
          })
        }
      >
        {ISO_3166_COUNTRIES.map((country) => (
          <SingleSelectOption key={country.code} value={country.code}>
            {formatCountryOptionLabel(country.code, locale || 'en')}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {effectiveHint ? <Field.Hint>{effectiveHint}</Field.Hint> : null}
      <Field.Error />
    </Field.Root>
  );
};
