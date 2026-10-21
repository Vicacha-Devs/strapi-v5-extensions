import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Layouts,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  type CertificateIssueInput,
  type CertificateRecord,
  type CertificateStats,
  type CertificateTemplate,
} from '../../../shared';
import { IssueCertificateModal } from '../components/IssueCertificateModal';

export const CertificatesPage: React.FC = () => {
  const { get, post, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [stats, setStats] = useState<CertificateStats>({
    total: 0,
    issued: 0,
    pending_approval: 0,
    revoked: 0,
    expired: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        queryParams.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }
      const [certRes, tplRes] = await Promise.all([
        get<{ data: CertificateRecord[]; meta?: { stats: CertificateStats } }>(
          `/${PLUGIN_ID}/certificates?${queryParams.toString()}`
        ),
        get<{ data: CertificateTemplate[] }>(`/${PLUGIN_ID}/templates`),
      ]);
      setRecords(certRes.data?.data || []);
      if (certRes.data?.meta?.stats) {
        setStats(certRes.data.meta.stats);
      }
      setTemplates(tplRes.data?.data || []);
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to load certificates registry',
      });
    } finally {
      setLoading(false);
    }
  }, [get, searchQuery, statusFilter, toggleNotification]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleIssue = async (payload: CertificateIssueInput) => {
    try {
      const res = await post<{ data: CertificateRecord }>(
        `/${PLUGIN_ID}/certificates/issue`,
        payload
      );
      toggleNotification({
        type: 'success',
        message: `Certificate ${res.data?.data?.serialNumber} created`,
      });
      setShowIssueModal(false);
      await loadData();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: (err as Error).message || 'Failed to issue certificate',
      });
    }
  };

  const handleSendDocuSign = async (documentId: string) => {
    try {
      const res = await post<{ data: { envelopeId: string } }>(
        `/${PLUGIN_ID}/certificates/${documentId}/send-docusign`,
        {}
      );
      toggleNotification({
        type: 'success',
        message: `Dispatched DocuSign envelope ${res.data?.data?.envelopeId}`,
      });
      await loadData();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message:
          (err as Error).message || 'Failed to send DocuSign eSignature envelope',
      });
    }
  };

  const handleApprove = async (documentId: string) => {
    try {
      await put(`/${PLUGIN_ID}/certificates/${documentId}/approve`, {});
      toggleNotification({
        type: 'success',
        message: 'Certificate approved and signed with Ed25519',
      });
      await loadData();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: (err as Error).message || 'Failed to approve certificate',
      });
    }
  };

  const handleRevoke = async (documentId: string) => {
    try {
      await put(`/${PLUGIN_ID}/certificates/${documentId}/revoke`, {
        reason: 'Revoked via Admin Registry',
      });
      toggleNotification({
        type: 'warning',
        message: 'Certificate revoked',
      });
      await loadData();
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to revoke certificate',
      });
    }
  };

  const handleOpenPrintable = async (documentId: string) => {
    try {
      const res = await get<string>(
        `/${PLUGIN_ID}/certificates/${documentId}/print`
      );
      const htmlContent =
        typeof res.data === 'string' ? res.data : String(res.data || '');
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Unable to render printable certificate document',
      });
    }
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title="Official Certificates & Cryptographic Registry"
        subtitle="Ed25519 digitally signed certificates, optional DocuSign eSignature envelopes, witness attestation, and QR verification"
        primaryAction={
          <Button onClick={() => setShowIssueModal(true)}>
            + Issue Signed Certificate
          </Button>
        }
      />
      <Layouts.Content>
        <Flex gap={4} marginBottom={6} wrap="wrap">
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ flex: 1, minWidth: 160 }}
          >
            <Typography variant="sigma" textColor="neutral600">
              Total Certificates
            </Typography>
            <Box marginTop={1}>
              <Typography variant="alpha" fontWeight="bold">
                {stats.total}
              </Typography>
            </Box>
          </Box>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ flex: 1, minWidth: 160 }}
          >
            <Typography variant="sigma" textColor="success600">
              Issued & Signed
            </Typography>
            <Box marginTop={1}>
              <Typography variant="alpha" fontWeight="bold">
                {stats.issued}
              </Typography>
            </Box>
          </Box>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ flex: 1, minWidth: 160 }}
          >
            <Typography variant="sigma" textColor="warning600">
              Pending Approval
            </Typography>
            <Box marginTop={1}>
              <Typography variant="alpha" fontWeight="bold">
                {stats.pending_approval}
              </Typography>
            </Box>
          </Box>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="filterShadow"
            style={{ flex: 1, minWidth: 160 }}
          >
            <Typography variant="sigma" textColor="danger600">
              Revoked / Expired
            </Typography>
            <Box marginTop={1}>
              <Typography variant="alpha" fontWeight="bold">
                {stats.revoked + stats.expired}
              </Typography>
            </Box>
          </Box>
        </Flex>

        {showIssueModal && (
          <IssueCertificateModal
            templates={templates}
            onClose={() => setShowIssueModal(false)}
            onSubmit={handleIssue}
          />
        )}

        <Box
          padding={4}
          background="neutral0"
          hasRadius
          shadow="filterShadow"
          marginBottom={4}
        >
          <Flex gap={4} alignItems="center" wrap="wrap">
            <Box style={{ minWidth: 260, flex: 1 }}>
              <TextInput
                placeholder="Search by serial number, recipient name, chosen name, or email..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
            </Box>
            <Box style={{ minWidth: 200 }}>
              <SingleSelect
                value={statusFilter}
                onChange={(val: string) => setStatusFilter(String(val))}
              >
                <SingleSelectOption value="all">All Statuses</SingleSelectOption>
                <SingleSelectOption value="issued">Issued</SingleSelectOption>
                <SingleSelectOption value="pending_approval">
                  Pending Approval
                </SingleSelectOption>
                <SingleSelectOption value="revoked">Revoked</SingleSelectOption>
                <SingleSelectOption value="expired">Expired</SingleSelectOption>
              </SingleSelect>
            </Box>
            <Button variant="secondary" onClick={() => void loadData()}>
              Refresh
            </Button>
          </Flex>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          {loading ? (
            <Typography>Loading official certificates registry...</Typography>
          ) : records.length === 0 ? (
            <Typography textColor="neutral600">
              No certificates found matching the current filters.
            </Typography>
          ) : (
            <Flex direction="column" gap={3} alignItems="stretch">
              {records.map((rec) => {
                const secondaryText = Object.values(rec.secondaryDates || {})
                  .map((d) => `${d.label}: ${d.compact || d.formatted}`)
                  .join(' • ');
                return (
                  <Box
                    key={rec.documentId}
                    padding={4}
                    background="neutral100"
                    hasRadius
                    borderColor="neutral200"
                  >
                    <Flex
                      justifyContent="space-between"
                      alignItems="center"
                      wrap="wrap"
                      gap={3}
                    >
                      <Box>
                        <Flex gap={2} alignItems="center" wrap="wrap">
                          <Typography fontWeight="bold" variant="omega">
                            {rec.serialNumber}
                          </Typography>
                          <Badge>{rec.status.toUpperCase()}</Badge>
                          {rec.esignEnvelopeId && (
                            <Badge>
                              DOCUSIGN: {(rec.esignEnvelopeStatus || 'sent').toUpperCase()}
                            </Badge>
                          )}
                          <Typography variant="pi" textColor="neutral600">
                            {rec.templateName}
                          </Typography>
                        </Flex>
                        <Box marginTop={1}>
                          <Typography fontWeight="semiBold">
                            {rec.recipientFullName}
                            {rec.recipientChosenName
                              ? ` (${rec.recipientChosenName})`
                              : ''}
                          </Typography>
                        </Box>
                        <Box marginTop={1}>
                          <Typography variant="pi" textColor="neutral600">
                            Issued: {rec.issuedAt.slice(0, 10)}
                            {secondaryText ? ` • ${secondaryText}` : ''}
                            {rec.nationalIdMasked
                              ? ` • ID: ${rec.nationalIdMasked}`
                              : ''}
                            {` • Witnesses: ${(rec.witnesses || []).length}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Flex gap={2}>
                        <Button
                          variant="secondary"
                          onClick={() => void handleOpenPrintable(rec.documentId)}
                        >
                          Print / PDF
                        </Button>
                        {rec.status === 'pending_approval' && (
                          <>
                            <Button
                              variant="tertiary"
                              onClick={() => void handleSendDocuSign(rec.documentId)}
                            >
                              Send DocuSign
                            </Button>
                            <Button
                              onClick={() => void handleApprove(rec.documentId)}
                            >
                              Approve & Sign
                            </Button>
                          </>
                        )}
                        {rec.status === 'issued' && (
                          <Button
                            variant="danger-light"
                            onClick={() => void handleRevoke(rec.documentId)}
                          >
                            Revoke
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  </Box>
                );
              })}
            </Flex>
          )}
        </Box>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default CertificatesPage;
