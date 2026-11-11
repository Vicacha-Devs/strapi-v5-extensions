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
} from "@strapi/design-system";
import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
  CONTENT_TYPE_UIDS,
  toSafeOpenableHref,
  type GlossaryCategory,
  type GlossaryTermRecord,
} from "../../../../shared";
import { getContentManagerUrl, useResourcesTranslation } from "./uploadHelper";

const AUDIO_LINK_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#7b79ff",
  textDecoration: "underline",
};

export interface GlossaryTableProps {
  glossary: GlossaryTermRecord[];
  getCategoryLabel: (cat: GlossaryCategory) => string;
  onDelete: (item: GlossaryTermRecord) => void;
}

export const GlossaryTable: React.FC<GlossaryTableProps> = ({
  glossary,
  getCategoryLabel,
  onDelete,
}) => {
  const { t } = useResourcesTranslation();
  const navigate = useNavigate();

  return (
    <Table colCount={5} rowCount={glossary.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.letter", "Letter")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("glossary.table.term_script", "Term & Script")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.category", "Category")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.definition", "Definition")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("common.actions", "Actions")}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {glossary.map((item) => {
          const safeAudioHref = toSafeOpenableHref(
            item.pronunciationAudio?.url
          );
          return (
            <Tr key={item.documentId || item.slug}>
              <Td>
                <Badge>{item.letterGroup}</Badge>
              </Td>
              <Td>
                <Box paddingTop={2} paddingBottom={2}>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography fontWeight="bold">
                      {item.term}{" "}
                      {item.nativeScript ? `(${item.nativeScript})` : ""}
                    </Typography>
                    {item.transliteration && (
                      <Typography variant="pi" textColor="neutral600">
                        {item.transliteration}
                      </Typography>
                    )}
                  </Flex>
                </Box>
              </Td>
              <Td>
                <Badge>{getCategoryLabel(item.category)}</Badge>
              </Td>
              <Td>
                <Box paddingTop={2} paddingBottom={2}>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="omega">{item.definition}</Typography>
                    {safeAudioHref && item.pronunciationAudio && (
                      <a
                        href={safeAudioHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={AUDIO_LINK_STYLE}
                      >
                        {t("glossary.play_audio", "Play Audio")} (
                        {item.pronunciationAudio.name})
                      </a>
                    )}
                  </Flex>
                </Box>
              </Td>
              <Td>
                <Flex gap={2} wrap="wrap">
                  <Button
                    size="S"
                    variant="tertiary"
                    onClick={() =>
                      navigate(
                        getContentManagerUrl(
                          CONTENT_TYPE_UIDS.glossaryTerm,
                          item.documentId,
                          item.locale
                        )
                      )
                    }
                  >
                    {t("common.edit", "Edit")}
                  </Button>
                  <Button
                    size="S"
                    variant="danger-light"
                    onClick={() => onDelete(item)}
                  >
                    {t("common.delete", "Delete")}
                  </Button>
                </Flex>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};
