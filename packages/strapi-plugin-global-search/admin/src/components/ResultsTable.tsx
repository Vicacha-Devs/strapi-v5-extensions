import {
  Badge,
  Box,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import type { KeyboardEvent, MouseEvent } from "react";
import { styled } from "styled-components";

import type { SearchHit } from "../types";
import { t } from "../utils/getTrad";
import { Highlight } from "./Highlight";

const ClickableRow = styled(Tr)`
  cursor: pointer;

  &:hover {
    background: ${({ theme }: { theme: { colors: Record<string, string> } }) =>
      theme.colors.neutral100};
  }
`;

const TABLE_HEADERS: Array<[string, string]> = [
  ["table.type", "Type"],
  ["table.id", "Id"],
  ["table.name", "Name"],
  ["table.matched", "Matched"],
  ["table.locale", "Locale"],
  ["table.status", "Status"],
  ["table.updated", "Updated"],
];

interface ResultsTableProps {
  results: SearchHit[];
  trimmedQuery: string;
  onSelectHit: (adminUrl: string, newTab?: boolean) => void;
}

export const ResultsTable = ({
  results,
  trimmedQuery,
  onSelectHit,
}: ResultsTableProps) => (
  <Table colCount={7} rowCount={results.length}>
    <Thead>
      <Tr>
        {TABLE_HEADERS.map(([key, label]) => (
          <Th key={key}>
            <Typography variant="sigma">{t(key, label)}</Typography>
          </Th>
        ))}
      </Tr>
    </Thead>
    <Tbody>
      {results.map((hit) => (
        <ClickableRow
          key={[
            hit.contentTypeUid,
            hit.documentId || hit.id,
            hit.locale || "",
          ].join("-")}
          tabIndex={0}
          onClick={(event: MouseEvent) =>
            onSelectHit(hit.adminUrl, event.metaKey || event.ctrlKey)
          }
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectHit(hit.adminUrl, event.metaKey || event.ctrlKey);
            }
          }}
        >
          <Td>
            <Typography textColor="neutral800">
              {hit.contentTypeLabel}
            </Typography>
          </Td>
          <Td>
            <Typography textColor="neutral600">
              {hit.documentId || hit.id}
            </Typography>
          </Td>
          <Td>
            <Typography fontWeight="semiBold" textColor="neutral800">
              <Highlight
                text={String(hit.title)}
                query={trimmedQuery}
                textColor="neutral800"
              />
            </Typography>
          </Td>
          <Td>
            {hit.matchedField ? (
              <Box maxWidth="32rem">
                <Typography variant="pi" textColor="neutral500">
                  {hit.matchedFieldLabel}
                </Typography>
                <Box>
                  <Typography variant="pi">
                    <Highlight
                      text={hit.matchedSnippet || ""}
                      query={trimmedQuery}
                    />
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography textColor="neutral400">—</Typography>
            )}
          </Td>
          <Td>
            <Typography textColor="neutral600">{hit.locale || "—"}</Typography>
          </Td>
          <Td>
            {hit.status ? (
              <Badge>{t(`status.${hit.status}`, hit.status)}</Badge>
            ) : (
              <Typography textColor="neutral400">—</Typography>
            )}
          </Td>
          <Td>
            <Typography textColor="neutral600">
              {hit.updatedAt
                ? new Date(hit.updatedAt).toLocaleDateString()
                : "—"}
            </Typography>
          </Td>
        </ClickableRow>
      ))}
    </Tbody>
  </Table>
);
