import {
  Box,
  Button,
  Checkbox,
  Table,
  Tbody,
  Td,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Plus } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";
import type { SitemapDefinition } from "../SitemapDefinitionModal";
import SectionCard from "./SectionCard";
import { HeadCell, RowActions, SaveButton, useYesNo } from "./TableParts";

interface SitemapIndexSectionProps {
  useSitemapIndex: boolean;
  setUseSitemapIndex: (val: boolean) => void;
  sitemaps: SitemapDefinition[];
  isSitemapSettingsModified: boolean;
  onSaveSitemapSettings: () => void;
  onAddSitemap: () => void;
  onEditSitemap: (index: number) => void;
  onDeleteSitemap: (index: number) => void;
}

export const SitemapIndexSection: React.FC<SitemapIndexSectionProps> = ({
  useSitemapIndex,
  setUseSitemapIndex,
  sitemaps,
  isSitemapSettingsModified,
  onSaveSitemapSettings,
  onAddSitemap,
  onEditSitemap,
  onDeleteSitemap,
}) => {
  const { formatMessage } = useIntl();
  const yesNo = useYesNo();
  const tr = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={tr("settings.index.title", "Sitemap Settings")}
      description={tr(
        "settings.index.description",
        "Use a single sitemap or a sitemap index with multiple sitemaps"
      )}
    >
      <Box paddingBottom={2}>
        <Checkbox
          checked={useSitemapIndex}
          onCheckedChange={(checked: boolean) =>
            setUseSitemapIndex(checked === true)
          }
        >
          {tr(
            "settings.index.checkbox",
            "Use sitemap index with multiple sitemaps"
          )}
        </Checkbox>
      </Box>
      <Typography variant="epsilon" tag="p" textColor="neutral600">
        {formatMessage(
          {
            id: getTrad("settings.index.checkboxHint"),
            defaultMessage:
              "When enabled, sitemap.xml becomes the index; each entry below " +
              "generates sitemap-{name}.xml.",
          },
          { name: "{name}" }
        )}
      </Typography>
      <Box
        marginTop={3}
        marginBottom={4}
        padding={3}
        style={{ borderRadius: 4, border: "1px solid #eaeaef" }}
      >
        <Typography variant="epsilon" tag="p" textColor="neutral600">
          {formatMessage(
            {
              id: getTrad("settings.index.permissionLabel"),
              defaultMessage:
                "For public access to individual sitemaps " +
                "(sitemap-{name}.xml), enable the permission:",
            },
            { name: "{name}" }
          )}
        </Typography>
        <Typography
          variant="epsilon"
          tag="p"
          textColor="neutral700"
          marginTop={1}
        >
          <code
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            getSitemapBySlug
          </code>{" "}
          {tr(
            "settings.index.permissionPath",
            "in Users & Permissions → Public → Sitemap"
          )}
        </Typography>
      </Box>
      {useSitemapIndex && (
        <>
          <Table colCount={5} rowCount={sitemaps.length + 1}>
            <Thead>
              <Tr>
                <HeadCell
                  label={tr("settings.index.table.name", "Name (slug)")}
                />
                <HeadCell label={tr("settings.index.table.url", "URL")} />
                <HeadCell
                  label={tr(
                    "settings.index.table.collectionTypes",
                    "Collection types"
                  )}
                />
                <HeadCell
                  label={tr(
                    "settings.index.table.customUrls",
                    "Include custom URLs"
                  )}
                />
                <HeadCell label={tr("table.actions", "Actions")} />
              </Tr>
            </Thead>
            <Tbody>
              {sitemaps.map((def, idx) => (
                <Tr key={idx}>
                  <Td>
                    <Typography textColor="neutral800">{def.name}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600" variant="pi">
                      /api/sitemap/sitemap-{def.name}.xml
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {formatMessage(
                        {
                          id: getTrad("settings.index.table.configsCount"),
                          defaultMessage: "{count} config(s)",
                        },
                        { count: def.collectionTypeConfigIndices?.length ?? 0 }
                      )}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {yesNo(def.includeCustomUrls)}
                    </Typography>
                  </Td>
                  <Td>
                    <RowActions
                      onEdit={() => onEditSitemap(idx)}
                      onDelete={() => onDeleteSitemap(idx)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Box paddingTop={4} paddingBottom={2}>
            <Button
              startIcon={<Plus />}
              variant="secondary"
              onClick={onAddSitemap}
            >
              {tr("settings.index.add", "Add sitemap")}
            </Button>
          </Box>
        </>
      )}
      <Box paddingTop={4}>
        <SaveButton
          modified={isSitemapSettingsModified}
          onClick={onSaveSitemapSettings}
        />
      </Box>
    </SectionCard>
  );
};
