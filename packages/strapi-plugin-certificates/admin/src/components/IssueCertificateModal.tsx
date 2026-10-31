import { useIntl } from 'react-intl';
import React, { useState } from 'react';
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
import type { CertificateIssueInput, CertificateTemplate } from '../../../shared/types';

interface IssueCertificateModalProps {
  templates: CertificateTemplate[];
  onClose: () => void;
  onSubmit: (payload: CertificateIssueInput) => Promise<void>;
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildWitnessEntry(
  name: string,
  docId: string,
  email: string,
  role: string
): NonNullable<CertificateIssueInput['witnesses']>[number] | null {
  const fullName = trimOrUndefined(name);
  if (!fullName) return null;
  return {
    fullName,
    documentIdRaw: trimOrUndefined(docId),
    email: trimOrUndefined(email),
    routingOrder: 1,
    role,
  };
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  templates,
  onClose,
  onSubmit,
}) => {
  const { formatMessage } = useIntl();
  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => formatMessage({ id: `${"certificates"}.${id}`, defaultMessage }, values);
  const [templateSlug, setTemplateSlug] = useState<string>(
    templates[0]?.slug || ''
  );
  const [recipientFullName, setRecipientFullName] = useState('');
  const [recipientChosenName, setRecipientChosenName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientNationality, setRecipientNationality] = useState('');
  const [nationalIdRaw, setNationalIdRaw] = useState('');
  const [witness1Name, setWitness1Name] = useState('');
  const [witness1Id, setWitness1Id] = useState('');
  const [witness1Email, setWitness1Email] = useState('');
  const [witness2Name, setWitness2Name] = useState('');
  const [witness2Id, setWitness2Id] = useState('');
  const [witness2Email, setWitness2Email] = useState('');
  const [linkedBookingCode, setLinkedBookingCode] = useState('');
  const [notes, setNotes] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [sendViaESign, setSendViaESign] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedTemplate = templates.find((tpl) => tpl.slug === templateSlug);

  const handleCreate = async () => {
    const cleanName = trimOrUndefined(recipientFullName);
    if (!cleanName || !templateSlug) return;
    setSubmitting(true);
    try {
      const w1 = buildWitnessEntry(
        witness1Name,
        witness1Id,
        witness1Email,
        'Official Witness 1'
      );
      const w2 = buildWitnessEntry(
        witness2Name,
        witness2Id,
        witness2Email,
        'Official Witness 2'
      );
      const witnesses = [w1, w2].filter(
        (w): w is NonNullable<typeof w> => w !== null
      );

      await onSubmit({
        templateSlug,
        recipientFullName: cleanName,
        recipientChosenName: trimOrUndefined(recipientChosenName),
        recipientEmail: trimOrUndefined(recipientEmail),
        recipientPhone: trimOrUndefined(recipientPhone),
        recipientNationality: trimOrUndefined(recipientNationality),
        nationalIdRaw: trimOrUndefined(nationalIdRaw),
        witnesses,
        linkedBookingCode: trimOrUndefined(linkedBookingCode),
        notes: trimOrUndefined(notes),
        autoApprove: !sendViaESign && autoApprove,
        sendViaESign,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      borderColor="neutral200"
      marginBottom={6}
    >
      <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Typography variant="beta" fontWeight="bold">
          {t(
            'modal.title_issue_official_signed_certificate',
            'Issue Official Signed Certificate'
          )}
        </Typography>
        <Button variant="tertiary" onClick={onClose}>
          {t('modal.close', 'Close')}
        </Button>
      </Flex>

      <Flex direction="column" gap={4} alignItems="stretch">
        <Field.Root required>
          <Field.Label>{t('field.certificate_template', 'Certificate Template')}</Field.Label>
          <SingleSelect
            placeholder={t('placeholder.select_certificate_template', 'Select certificate template')}
            value={templateSlug}
            onChange={(val: string) => setTemplateSlug(String(val))}
          >
            {templates.map((tpl) => (
              <SingleSelectOption key={tpl.slug} value={tpl.slug}>
                {tpl.name} ({tpl.serialPrefix})
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Field.Root>

        <Flex gap={4} wrap="wrap">
          <Box style={{ flex: 1, minWidth: 240 }}>
            <Field.Root required>
              <Field.Label>{t('field.recipient_full_legal_name', 'Recipient Full Legal Name')}</Field.Label>
              <TextInput
                value={recipientFullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientFullName(e.target.value)
                }
                placeholder={t('placeholder.e_g_carlos_andres_perez', 'e.g. Carlos Andres Perez')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 240 }}>
            <Field.Root>
              <Field.Label>{t('field.chosen_name_honorific_title_optional', 'Chosen Name / Honorific / Title (Optional)')}</Field.Label>
              <TextInput
                value={recipientChosenName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientChosenName(e.target.value)
                }
                placeholder={t('placeholder.e_g_ibrahim_chosen_muslim_name', 'e.g. Ibrahim / Chosen Muslim Name')}
              />
            </Field.Root>
          </Box>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>{t('field.national_id_passport_hashed_sha_256_at_rest', 'National ID / Passport (Hashed SHA-256 at rest)')}</Field.Label>
              <TextInput
                value={nationalIdRaw}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNationalIdRaw(e.target.value)
                }
                placeholder={t('placeholder.e_g_cc_1020304050', 'e.g. CC 1020304050')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>{t('field.nationality', 'Nationality')}</Field.Label>
              <TextInput
                value={recipientNationality}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientNationality(e.target.value)
                }
                placeholder={t('placeholder.e_g_colombian', 'e.g. Colombian')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>{t('field.recipient_email', 'Recipient Email')}</Field.Label>
              <TextInput
                value={recipientEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientEmail(e.target.value)
                }
                placeholder={t('placeholder.recipient_example_org', 'recipient@example.org')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>{t('field.linked_booking_code', 'Linked Booking Code')}</Field.Label>
              <TextInput
                value={linkedBookingCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLinkedBookingCode(e.target.value)
                }
                placeholder={t('placeholder.e_g_bk_a1b2c3d4', 'e.g. BK-A1B2C3D4')}
              />
            </Field.Root>
          </Box>
        </Flex>

      <Box
        padding={4}
        background="neutral100"
        hasRadius
        borderColor="neutral200"
        style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
      >
        <Typography variant="omega" fontWeight="bold">
          {t(
            'modal.official_witnesses_attestation',
            'Official Witnesses Attestation'
          )}{' '}
          {selectedTemplate?.requiresWitnesses
            ? t(
                'modal.minimum_witnesses_required',
                '(Minimum {count} required)',
                { count: selectedTemplate.minWitnesses }
              )
            : t('modal.optional_suffix', '(Optional)')}
        </Typography>
        <Flex gap={4} wrap="wrap" marginTop={3}>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_1_full_name', 'Witness 1 Full Name')}</Field.Label>
              <TextInput
                value={witness1Name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness1Name(e.target.value)
                }
                placeholder={t('placeholder.e_g_ahmad_al_mansour', 'e.g., Ahmad Al-Mansour')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 150 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_1_id_document', 'Witness 1 ID Document')}</Field.Label>
              <TextInput
                value={witness1Id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness1Id(e.target.value)
                }
                placeholder={t('placeholder.e_g_cc_79123456_masked', 'e.g., CC 79123456 (masked)')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_1_email_docusign', 'Witness 1 Email (DocuSign)')}</Field.Label>
              <TextInput
                value={witness1Email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness1Email(e.target.value)
                }
                placeholder={t('placeholder.e_g_witness1_example_org', 'e.g., witness1@example.org')}
              />
            </Field.Root>
          </Box>
        </Flex>
        <Flex gap={4} wrap="wrap" marginTop={3}>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_2_full_name', 'Witness 2 Full Name')}</Field.Label>
              <TextInput
                value={witness2Name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness2Name(e.target.value)
                }
                placeholder={t('placeholder.e_g_yusuf_benavides', 'e.g., Yusuf Benavides')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 150 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_2_id_document', 'Witness 2 ID Document')}</Field.Label>
              <TextInput
                value={witness2Id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness2Id(e.target.value)
                }
                placeholder={t('placeholder.e_g_cc_80234567_masked', 'e.g., CC 80234567 (masked)')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>{t('field.witness_2_email_docusign', 'Witness 2 Email (DocuSign)')}</Field.Label>
              <TextInput
                value={witness2Email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWitness2Email(e.target.value)
                }
                placeholder={t('placeholder.e_g_witness2_example_org', 'e.g., witness2@example.org')}
              />
            </Field.Root>
          </Box>
        </Flex>
      </Box>

        <Field.Root>
          <Field.Label>{t('field.internal_registry_notes', 'Internal Registry Notes')}</Field.Label>
          <Textarea
            placeholder={t('placeholder.attestation_context_officiating_imam_or_ceremony', 'Attestation context, officiating Imam, or ceremony notes...')}
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
          />
        </Field.Root>

        <Checkbox
          checked={autoApprove && !sendViaESign}
          disabled={sendViaESign}
          onCheckedChange={(val: boolean) => setAutoApprove(Boolean(val))}
        >
          {t(
            'checkbox.immediately_sign_with_ed25519',
            'Immediately sign with Ed25519 private key and mark as Issued'
          )}
        </Checkbox>

        <Checkbox
          checked={sendViaESign}
          onCheckedChange={(val: boolean) => setSendViaESign(Boolean(val))}
        >
          {t(
            'checkbox.dispatch_docusign_esignature_envelope',
            'Dispatch DocuSign eSignature Envelope to Witnesses & Signatories first (auto-approves on completion webhook)'
          )}
        </Checkbox>

        <Flex justifyContent="flex-end" gap={3}>
          <Button variant="tertiary" onClick={onClose}>
            {t('modal.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            disabled={!recipientFullName.trim() || !templateSlug}
          >
            {sendViaESign
              ? t('modal.create_and_send_docusign', 'Create & Send via DocuSign')
              : t('modal.sign_and_issue_certificate', 'Sign & Issue Certificate')}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};
