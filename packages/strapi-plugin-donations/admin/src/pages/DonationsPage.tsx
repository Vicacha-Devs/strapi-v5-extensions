import React, { useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type DonationCampaignItem, type DonationPledgeItem } from '../../../shared';

export const DonationsPage: React.FC = () => {
  const { get, post } = useFetchClient();
  const [majorCampaigns, setMajorCampaigns] = useState<DonationCampaignItem[]>([]);
  const [utilityInvoices, setUtilityInvoices] = useState<DonationCampaignItem[]>([]);
  const [pledges, setPledges] = useState<DonationPledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRef, setProcessingRef] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await get(`/${PLUGIN_ID}/overview`);
      const payload = res?.data?.data || {};
      setMajorCampaigns(Array.isArray(payload.majorCampaigns) ? payload.majorCampaigns : []);
      setUtilityInvoices(Array.isArray(payload.utilityInvoices) ? payload.utilityInvoices : []);
      setPledges(Array.isArray(payload.pledges) ? payload.pledges : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleDecision = async (referenceCode: string, decision: 'verified' | 'rejected') => {
    setProcessingRef(referenceCode);
    try {
      await post(`/${PLUGIN_ID}/pledges/${referenceCode}/verify`, {
        decision,
        issueTaxCertificate: decision === 'verified',
      });
      await loadData();
    } finally {
      setProcessingRef(null);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
          <Box>
            <Typography variant="alpha" as="h1">
              Donations, Crowdfunding & Utility Bills
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Manage major campaigns, monthly operational utility invoices, pledge verification, and tax certificates.
            </Typography>
          </Box>
          <Button onClick={() => void loadData()} loading={loading}>
            Refresh Overview
          </Button>
        </Flex>

        <Box marginBottom={6} background="neutral0" padding={5} hasRadius shadow="filterShadow">
          <Typography variant="delta" as="h2" marginBottom={4}>
            Operational Utility Invoices & Recurring Bills ({utilityInvoices.length})
          </Typography>
          <Table colCount={6} rowCount={utilityInvoices.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Invoice / Service</Typography></Th>
                <Th><Typography variant="sigma">Period & Due Date</Typography></Th>
                <Th><Typography variant="sigma">Total Bill</Typography></Th>
                <Th><Typography variant="sigma">Remaining Balance</Typography></Th>
                <Th><Typography variant="sigma">Progress</Typography></Th>
                <Th><Typography variant="sigma">Status</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {utilityInvoices.map((inv) => (
                <Tr key={inv.slug}>
                  <Td>
                    <Typography fontWeight="bold">{inv.title}</Typography>
                    {inv.invoiceProvider && (
                      <Typography variant="pi" textColor="neutral600"> ({inv.invoiceProvider})</Typography>
                    )}
                  </Td>
                  <Td>
                    <Typography>{inv.billingPeriod || '-'}</Typography>
                    {inv.dueDate && (
                      <Typography variant="pi" textColor="neutral600"> • Due {inv.dueDate}</Typography>
                    )}
                  </Td>
                  <Td><Typography>{inv.goalAmount.toLocaleString()} {inv.currency}</Typography></Td>
                  <Td><Typography fontWeight="bold">{inv.remainingAmount.toLocaleString()} {inv.currency}</Typography></Td>
                  <Td><Badge>{inv.progressPercent}%</Badge></Td>
                  <Td>
                    <Badge active={inv.invoiceStatus === 'paid'}>
                      {inv.invoiceStatus.toUpperCase()}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Box marginBottom={6} background="neutral0" padding={5} hasRadius shadow="filterShadow">
          <Typography variant="delta" as="h2" marginBottom={4}>
            Major Crowdfunding Campaigns ({majorCampaigns.length})
          </Typography>
          <Table colCount={5} rowCount={majorCampaigns.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Campaign</Typography></Th>
                <Th><Typography variant="sigma">Goal</Typography></Th>
                <Th><Typography variant="sigma">Raised</Typography></Th>
                <Th><Typography variant="sigma">Progress</Typography></Th>
                <Th><Typography variant="sigma">Donors</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {majorCampaigns.map((camp) => (
                <Tr key={camp.slug}>
                  <Td><Typography fontWeight="bold">{camp.title}</Typography></Td>
                  <Td><Typography>{camp.goalAmount.toLocaleString()} {camp.currency}</Typography></Td>
                  <Td><Typography>{camp.raisedAmount.toLocaleString()} {camp.currency}</Typography></Td>
                  <Td><Badge>{camp.progressPercent}%</Badge></Td>
                  <Td><Typography>{camp.donorCount}</Typography></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Box background="neutral0" padding={5} hasRadius shadow="filterShadow">
          <Typography variant="delta" as="h2" marginBottom={4}>
            Recent Pledges & Bill Contributions ({pledges.length})
          </Typography>
          <Table colCount={7} rowCount={pledges.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Ref</Typography></Th>
                <Th><Typography variant="sigma">Donor</Typography></Th>
                <Th><Typography variant="sigma">Amount</Typography></Th>
                <Th><Typography variant="sigma">Target / Category</Typography></Th>
                <Th><Typography variant="sigma">Status</Typography></Th>
                <Th><Typography variant="sigma">Certificate</Typography></Th>
                <Th><Typography variant="sigma">Actions</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {pledges.map((pledge) => (
                <Tr key={pledge.referenceCode}>
                  <Td><Typography fontWeight="bold">{pledge.referenceCode}</Typography></Td>
                  <Td>
                    <Typography>{pledge.donorName}</Typography>
                    <Typography variant="pi" textColor="neutral600"> ({pledge.donorEmail})</Typography>
                  </Td>
                  <Td>
                    <Typography fontWeight="bold">
                      {pledge.amount.toLocaleString()} {pledge.currency}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography>{pledge.campaignSlug || pledge.categoryKey}</Typography>
                    {pledge.coversRemainingBalance && <Badge>Full Balance Payoff</Badge>}
                  </Td>
                  <Td><Badge>{pledge.status.toUpperCase()}</Badge></Td>
                  <Td>
                    <Typography variant="pi">
                      {pledge.certificateSerialNumber || 'Not issued'}
                    </Typography>
                  </Td>
                  <Td>
                    {pledge.status === 'pending' && (
                      <Flex gap={2}>
                        <Button
                          size="S"
                          loading={processingRef === pledge.referenceCode}
                          onClick={() => void handleDecision(pledge.referenceCode, 'verified')}
                        >
                          Verify & Issue Cert
                        </Button>
                        <Button
                          size="S"
                          variant="danger-light"
                          loading={processingRef === pledge.referenceCode}
                          onClick={() => void handleDecision(pledge.referenceCode, 'rejected')}
                        >
                          Reject
                        </Button>
                      </Flex>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Main>
  );
};

export default DonationsPage;
