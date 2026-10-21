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
import type { CertificateIssueInput, CertificateTemplate } from '../../../shared';

interface IssueCertificateModalProps {
  templates: CertificateTemplate[];
  onClose: () => void;
  onSubmit: (payload: CertificateIssueInput) => Promise<void>;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  templates,
  onClose,
  onSubmit,
}) => {
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

  const selectedTemplate = templates.find((t) => t.slug === templateSlug);

  const handleCreate = async () => {
    if (!recipientFullName.trim() || !templateSlug) return;
    setSubmitting(true);
    try {
      const witnesses: NonNullable<CertificateIssueInput['witnesses']> = [];
      if (witness1Name.trim()) {
        witnesses.push({
          fullName: witness1Name.trim(),
          documentIdRaw: witness1Id.trim() || undefined,
          email: witness1Email.trim() || undefined,
          routingOrder: 1,
          role: 'Official Witness 1',
        });
      }
      if (witness2Name.trim()) {
        witnesses.push({
          fullName: witness2Name.trim(),
          documentIdRaw: witness2Id.trim() || undefined,
          email: witness2Email.trim() || undefined,
          routingOrder: 1,
          role: 'Official Witness 2',
        });
      }

      await onSubmit({
        templateSlug,
        recipientFullName: recipientFullName.trim(),
        recipientChosenName: recipientChosenName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        recipientNationality: recipientNationality.trim() || undefined,
        nationalIdRaw: nationalIdRaw.trim() || undefined,
        witnesses,
        linkedBookingCode: linkedBookingCode.trim() || undefined,
        notes: notes.trim() || undefined,
        autoApprove: sendViaESign ? false : autoApprove,
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
          Issue Official Signed Certificate
        </Typography>
        <Button variant="tertiary" onClick={onClose}>
          Close
        </Button>
      </Flex>

      <Flex direction="column" gap={4} alignItems="stretch">
        <Field.Root required>
          <Field.Label>Certificate Template</Field.Label>
          <SingleSelect
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
              <Field.Label>Recipient Full Legal Name</Field.Label>
              <TextInput
                value={recipientFullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientFullName(e.target.value)
                }
                placeholder="e.g. Carlos Andres Perez"
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 240 }}>
            <Field.Root>
              <Field.Label>Chosen Name / Honorific / Title (Optional)</Field.Label>
              <TextInput
                value={recipientChosenName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientChosenName(e.target.value)
                }
                placeholder="e.g. Ibrahim / Chosen Muslim Name"
              />
            </Field.Root>
          </Box>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>National ID / Passport (Hashed SHA-256 at rest)</Field.Label>
              <TextInput
                value={nationalIdRaw}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNationalIdRaw(e.target.value)
                }
                placeholder="e.g. CC 1020304050"
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>Nationality</Field.Label>
              <TextInput
                value={recipientNationality}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientNationality(e.target.value)
                }
                placeholder="e.g. Colombian"
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Field.Root>
              <Field.Label>Recipient Email</Field.Label>
              <TextInput
                value={recipientEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRecipientEmail(e.target.value)
                }
                placeholder="recipient@example.org"
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>Linked Booking Code</Field.Label>
              <TextInput
                value={linkedBookingCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLinkedBookingCode(e.target.value)
                }
                placeholder="e.g. BK-A1B2C3D4"
              />
            </Field.Root>
          </Box>
        </Flex>

        <Box
          padding={4}
          background="neutral100"
          hasRadius
          borderColor="neutral200"
        >
          <Typography variant="omega" fontWeight="bold">
            Official Witnesses Attestation
            {selectedTemplate?.requiresWitnesses
              ? ` (Minimum ${selectedTemplate.minWitnesses} required)`
              : ' (Optional)'}
          </Typography>
          <Flex gap={4} wrap="wrap" marginTop={3}>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Field.Root>
                <Field.Label>Witness 1 Full Name</Field.Label>
                <TextInput
                  value={witness1Name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness1Name(e.target.value)
                  }
                  placeholder="Witness 1 Name"
                />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 150 }}>
              <Field.Root>
                <Field.Label>Witness 1 ID</Field.Label>
                <TextInput
                  value={witness1Id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness1Id(e.target.value)
                  }
                  placeholder="Masked automatically"
                />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Field.Root>
                <Field.Label>Witness 1 Email (DocuSign)</Field.Label>
                <TextInput
                  value={witness1Email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness1Email(e.target.value)
                  }
                  placeholder="witness1@example.org"
                />
              </Field.Root>
            </Box>
          </Flex>
          <Flex gap={4} wrap="wrap" marginTop={3}>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Field.Root>
                <Field.Label>Witness 2 Full Name</Field.Label>
                <TextInput
                  value={witness2Name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness2Name(e.target.value)
                  }
                  placeholder="Witness 2 Name"
                />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 150 }}>
              <Field.Root>
                <Field.Label>Witness 2 ID</Field.Label>
                <TextInput
                  value={witness2Id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness2Id(e.target.value)
                  }
                  placeholder="Masked automatically"
                />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Field.Root>
                <Field.Label>Witness 2 Email (DocuSign)</Field.Label>
                <TextInput
                  value={witness2Email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWitness2Email(e.target.value)
                  }
                  placeholder="witness2@example.org"
                />
              </Field.Root>
            </Box>
          </Flex>
        </Box>

        <Field.Root>
          <Field.Label>Internal Registry Notes</Field.Label>
          <Textarea
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
          Immediately sign with Ed25519 private key and mark as Issued
        </Checkbox>

        <Checkbox
          checked={sendViaESign}
          onCheckedChange={(val: boolean) => setSendViaESign(Boolean(val))}
        >
          Dispatch DocuSign eSignature Envelope to Witnesses & Signatories first (auto-approves on completion webhook)
        </Checkbox>

        <Flex justifyContent="flex-end" gap={3}>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            disabled={!recipientFullName.trim() || !templateSlug}
          >
            {sendViaESign ? 'Create & Send via DocuSign' : 'Sign & Issue Certificate'}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};
