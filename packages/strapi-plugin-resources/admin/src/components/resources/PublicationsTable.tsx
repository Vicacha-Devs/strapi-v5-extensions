import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import {
  CONTENT_TYPE_UIDS,
  type PublicationCategory,
  type PublicationRecord,
} from '../../../../shared';
import { getContentManagerUrl, useResourcesTranslation } from './uploadHelper';

function truncateSummary(summary: string): string {
  return summary.length > 85 ? `${summary.slice(0, 85)}…` : summary;
}

const LINK_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#7b79ff',
  textDecoration: 'underline',
};

interface PublicationFileCellProps {
  pub: PublicationRecord;
  onUploadClick: (docId: string | null) => void;
}

const PublicationFileCell: React.FC<PublicationFileCellProps> = ({
  pub,
  onUploadClick,
}) => {
  const { t } = useResourcesTranslation();
  const downloadHref = pub.file?.url || pub.externalDownloadUrl;

  return (
    <Flex gap={2} alignItems="center" wrap="wrap">
      {pub.file ? (
        <>
          <Badge active>
            {pub.file.name} ({pub.file.formattedSize})
          </Badge>
          {downloadHref && (
            <a
              href={downloadHref}
              target="_blank"
              rel="noreferrer"
              style={LINK_STYLE}
            >
              {t('common.open', 'Open')}
            </a>
          )}
        </>
      ) : pub.externalDownloadUrl ? (
        <a
          href={pub.externalDownloadUrl}
          target="_blank"
          rel="noreferrer"
          style={LINK_STYLE}
        >
          {t('pub.external_link', 'External Link')}
        </a>
      ) : (
        <Badge>{t('pub.no_file_attached', 'No file attached')}</Badge>
      )}
      <Button
        size="S"
        variant="secondary"
        onClick={() => onUploadClick(pub.documentId || null)}
      >
        {pub.file
          ? t('pub.btn.replace_pdf', 'Replace PDF')
          : t('pub.btn.upload_pdf', 'Upload PDF')}
      </Button>
    </Flex>
  );
};

export interface PublicationsTableProps {
  publications: PublicationRecord[];
  getCategoryLabel: (cat: PublicationCategory) => string;
  onUploadRowClick: (docId: string | null) => void;
  onDelete: (pub: PublicationRecord) => void;
}

export const PublicationsTable: React.FC<PublicationsTableProps> = ({
  publications,
  getCategoryLabel,
  onUploadRowClick,
  onDelete,
}) => {
  const { t } = useResourcesTranslation();

  return (
    <Table colCount={5} rowCount={publications.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {t('pub.table.publication', 'Publication')}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t('page.ui.category', 'Category')}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t('pub.table.pdf_download_file', 'PDF / Download File')}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t('pub.table.downloads_date', 'Downloads & Date')}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t('common.actions', 'Actions')}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {publications.map((pub) => (
          <Tr key={pub.documentId || pub.slug}>
            <Td>
              <Box paddingTop={2} paddingBottom={2}>
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography fontWeight="bold">{pub.title}</Typography>
                  {pub.summary && (
                    <Typography variant="pi" textColor="neutral600">
                      {truncateSummary(pub.summary)}
                    </Typography>
                  )}
                  {pub.authorName && (
                    <Typography variant="pi" textColor="neutral500">
                      {t('pub.by_author', 'By')} {pub.authorName}
                    </Typography>
                  )}
                </Flex>
              </Box>
            </Td>
            <Td>
              <Badge>{getCategoryLabel(pub.category)}</Badge>
            </Td>
            <Td>
              <PublicationFileCell
                pub={pub}
                onUploadClick={onUploadRowClick}
              />
            </Td>
            <Td>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Badge>
                  {pub.downloadCount} {t('page.ui.downloads', 'downloads')}
                </Badge>
                {pub.secondaryDateFormatted && (
                  <Typography variant="pi" textColor="neutral600">
                    {pub.secondaryDateFormatted}
                  </Typography>
                )}
              </Flex>
            </Td>
            <Td>
              <Flex gap={2} wrap="wrap">
                <Button
                  size="S"
                  variant="tertiary"
                  onClick={() => {
                    window.location.href = getContentManagerUrl(
                      CONTENT_TYPE_UIDS.publication,
                      pub.documentId,
                      pub.locale
                    );
                  }}
                >
                  {t('common.edit', 'Edit')}
                </Button>
                <Button
                  size="S"
                  variant="danger-light"
                  onClick={() => onDelete(pub)}
                >
                  {t('common.delete', 'Delete')}
                </Button>
              </Flex>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
