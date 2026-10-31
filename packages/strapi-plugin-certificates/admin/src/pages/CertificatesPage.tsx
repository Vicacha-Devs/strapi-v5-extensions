import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Layouts, useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  CertificateIssueInput,
  CertificateRecord,
  CertificateStats,
  CertificateTemplate,
} from "../../../shared/types";
import { IssueCertificateModal } from "../components/IssueCertificateModal";

export const CertificatesPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        queryParams.set("status", statusFilter);
      }
      if (searchQuery.trim()) {
        queryParams.set("search", searchQuery.trim());
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
        type: "danger",
        message: t(
          "page.ui.msg_failed_to_load_certificates_registry",
          "Failed to load certificates registry"
        ),
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
        type: "success",
        message: `Certificate ${res.data?.data?.serialNumber} created`,
      });
      setShowIssueModal(false);
      await loadData();
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: (err as Error).message || "Failed to issue certificate",
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
        type: "success",
        message: `Dispatched DocuSign envelope ${res.data?.data?.envelopeId}`,
      });
      await loadData();
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: (err as Error).message || "Failed to send DocuSign eSignature envelope",
      });
    }
  };

  const handleApprove = async (documentId: string) => {
    try {
      await put(`/${PLUGIN_ID}/certificates/${documentId}/approve`, {});
      toggleNotification({
        type: "success",
        message: t(
          "page.ui.msg_certificate_approved_and_signed_with_ed25519",
          "Certificate approved and signed with Ed25519"
        ),
      });
      await loadData();
    } catch (err) {
      toggleNotification({
        type: "danger",
        message: (err as Error).message || "Failed to approve certificate",
      });
    }
  };

  const handleRevoke = async (documentId: string) => {
    try {
      await put(`/${PLUGIN_ID}/certificates/${documentId}/revoke`, {
        reason: "Revoked via Admin Registry",
      });
      toggleNotification({
        type: "warning",
        message: t("page.ui.msg_certificate_revoked", "Certificate revoked"),
      });
      await loadData();
    } catch {
      toggleNotification({
        type: "danger",
        message: t("page.ui.msg_failed_to_revoke_certificate", "Failed to revoke certificate"),
      });
    }
  };

  const handleOpenPrintable = async (documentId: string) => {
    try {
      const res = await get<string>(`/${PLUGIN_ID}/certificates/${documentId}/print`);
      const htmlContent = typeof res.data === "string" ? res.data : String(res.data || "");
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch {
      toggleNotification({
        type: "danger",
        message: t(
          "page.ui.msg_unable_to_render_printable_certificate_document",
          "Unable to render printable certificate document"
        ),
      });
    }
  };

  return (
    <Layouts.Root>
      <Layouts.Header
        title={t(
          "page.ui.title_official_certificates_cryptographic_registry",
          "Official Certificates & Cryptographic Registry"
        )}
        subtitle={t(
          "page.ui.subtitle_ed25519_digitally_signed_certificates_optional_d",
          "Ed25519 digitally signed certificates, optional DocuSign eSignature envelopes, witness attestation, and QR verification"
        )}
        primaryAction={
          <Button onClick={() => setShowIssueModal(true)}>
            {t("page.ui.issue_signed_certificate", "+ Issue Signed Certificate")}
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
              {t("page.ui.total_certificates", "Total Certificates")}
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
              {t("page.ui.issued_signed", "Issued & Signed")}
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
              {t("page.ui.pending_approval", "Pending Approval")}
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
              {t("page.ui.revoked_expired", "Revoked / Expired")}
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

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow" marginBottom={4}>
          <Flex gap={4} alignItems="flex-end" wrap="wrap">
            <Box style={{ minWidth: 260, flex: 1 }}>
              <Field.Root>
                <Field.Label>{t("field.search_certificates", "Search Certificates")}</Field.Label>
                <TextInput
                  placeholder={t(
                    "placeholder.search_by_serial_number_recipient_name_chosen_na",
                    "Search by serial number, recipient name, chosen name, or email..."
                  )}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                />
              </Field.Root>
            </Box>
            <Box style={{ minWidth: 200 }}>
              <Field.Root>
                <Field.Label>{t("field.certificate_status", "Certificate Status")}</Field.Label>
                <SingleSelect
                  placeholder={t("placeholder.all_statuses", "All Statuses")}
                  value={statusFilter}
                  onChange={(val: string) => setStatusFilter(String(val))}
                >
                  <SingleSelectOption value="all">
                    {t("page.ui.all_statuses", "All Statuses")}
                  </SingleSelectOption>
                  <SingleSelectOption value="issued">
                    {t("page.ui.issued", "Issued")}
                  </SingleSelectOption>
                  <SingleSelectOption value="pending_approval">
                    {t("page.ui.pending_approval", "Pending Approval")}
                  </SingleSelectOption>
                  <SingleSelectOption value="revoked">
                    {t("page.ui.revoked", "Revoked")}
                  </SingleSelectOption>
                  <SingleSelectOption value="expired">
                    {t("page.ui.expired", "Expired")}
                  </SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Box>
            <Button variant="secondary" onClick={() => void loadData()}>
              {t("page.ui.refresh", "Refresh")}
            </Button>
          </Flex>
        </Box>

        <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
          {loading ? (
            <Typography>
              {t(
                "page.ui.loading_official_certificates_registry",
                "Loading official certificates registry..."
              )}
            </Typography>
          ) : records.length === 0 ? (
            <Typography textColor="neutral600">
              {t(
                "page.ui.no_certificates_found_matching_the_current_filte",
                "No certificates found matching the current filters."
              )}
            </Typography>
          ) : (
            <Flex direction="column" gap={3} alignItems="stretch">
              {records.map((rec) => {
                const secondaryText = Object.values(rec.secondaryDates || {})
                  .map((d) => `${d.label}: ${d.compact || d.formatted}`)
                  .join(" • ");
                return (
                  <Box
                    key={rec.documentId}
                    padding={4}
                    background="neutral100"
                    hasRadius
                    borderColor="neutral200"
                  >
                    <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
                      <Box>
                        <Flex gap={2} alignItems="center" wrap="wrap">
                          <Typography fontWeight="bold" variant="omega">
                            {rec.serialNumber}
                          </Typography>
                          <Badge>{rec.status.toUpperCase()}</Badge>
                          {rec.esignEnvelopeId && (
                            <Badge>
                              {t("page.ui.docusign_badge", "DOCUSIGN: {status}", {
                                status: (rec.esignEnvelopeStatus || "sent").toUpperCase(),
                              })}
                            </Badge>
                          )}
                          <Typography variant="pi" textColor="neutral600">
                            {rec.templateName}
                          </Typography>
                        </Flex>
                        <Box marginTop={1}>
                          <Typography fontWeight="semiBold">
                            {rec.recipientFullName}
                            {rec.recipientChosenName ? ` (${rec.recipientChosenName})` : ""}
                          </Typography>
                        </Box>
                        <Box marginTop={1}>
                          <Typography variant="pi" textColor="neutral600">
                            {t("page.ui.issued_date", "Issued: {date}", {
                              date: rec.issuedAt.slice(0, 10),
                            })}
                            {secondaryText ? ` • ${secondaryText}` : ""}
                            {rec.nationalIdMasked
                              ? ` • ${t("page.ui.id_masked", "ID: {id}", {
                                  id: rec.nationalIdMasked,
                                })}`
                              : ""}
                            {" • "}
                            {t("page.ui.witnesses_count", "Witnesses: {count}", {
                              count: (rec.witnesses || []).length,
                            })}
                          </Typography>
                        </Box>
                      </Box>

                      <Flex gap={2}>
                        <Button
                          variant="secondary"
                          onClick={() => void handleOpenPrintable(rec.documentId)}
                        >
                          {t("page.ui.print_pdf", "Print / PDF")}
                        </Button>
                        {rec.status === "pending_approval" && (
                          <>
                            <Button
                              variant="tertiary"
                              onClick={() => void handleSendDocuSign(rec.documentId)}
                            >
                              {t("page.ui.send_docusign", "Send DocuSign")}
                            </Button>
                            <Button onClick={() => void handleApprove(rec.documentId)}>
                              {t("page.ui.approve_sign", "Approve & Sign")}
                            </Button>
                          </>
                        )}
                        {rec.status === "issued" && (
                          <Button
                            variant="danger-light"
                            onClick={() => void handleRevoke(rec.documentId)}
                          >
                            {t("page.ui.revoke", "Revoke")}
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
