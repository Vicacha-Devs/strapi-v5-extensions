import {
  Badge,
  Box,
  Button,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type { CuratedDuaItem, CuratedHadithItem } from "../../../shared";
import type { InspirationPinPatch } from "./ScriptureTab";
import type { TranslateFn } from "./SettingsTabs";

export function pickLocalizedText(
  map: Record<string, string> | undefined,
  lang: string
): string {
  if (!map) return "";
  return map[lang] || map.en || map.es || "";
}

export const HadithsAndDuasSection: React.FC<{
  hadiths: CuratedHadithItem[];
  duas: CuratedDuaItem[];
  lang: string;
  onPinInspiration: (patch: InspirationPinPatch) => void;
  t: TranslateFn;
}> = ({ hadiths, duas, lang, onPinInspiration, t }) => (
  <Box
    marginBottom={6}
    background="neutral0"
    padding={5}
    hasRadius
    shadow="filterShadow"
  >
    <Box marginBottom={4} style={{ marginBottom: 16 }}>
      <Typography variant="delta" tag="h2">
        {t(
          "page.ui.hadiths_duas_section_title",
          "Prophetic Hadiths ({hadithCount}) & Hisnul Muslim Duas ({duaCount})",
          { hadithCount: hadiths.length, duaCount: duas.length }
        )}
      </Typography>
    </Box>

    {hadiths.length > 0 && (
      <Box marginBottom={6}>
        <Table colCount={4} rowCount={hadiths.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.hadith_collection", "Hadith & Collection")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.arabic_translation", "Arabic & Translation")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.grading", "Grading")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.action", "Action")}
                </Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {hadiths.map((hadith) => (
              <Tr key={hadith.id}>
                <Td style={{ whiteSpace: "normal", maxWidth: 240 }}>
                  <Box style={{ whiteSpace: "normal" }}>
                    <Typography fontWeight="bold">
                      {pickLocalizedText(hadith.collectionNames, lang)} #
                      {hadith.hadithNumber}
                    </Typography>
                  </Box>
                  {pickLocalizedText(hadith.narrator, lang) && (
                    <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                      <Typography variant="pi" textColor="neutral600">
                        {pickLocalizedText(hadith.narrator, lang)}
                      </Typography>
                    </Box>
                  )}
                </Td>
                <Td style={{ whiteSpace: "normal", maxWidth: 680 }}>
                  <Box style={{ whiteSpace: "normal", lineHeight: 1.7 }}>
                    <Typography>{hadith.arabicText}</Typography>
                  </Box>
                  {hadith.transliteration && (
                    <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                      <Typography
                        variant="pi"
                        textColor="neutral500"
                        style={{ fontStyle: "italic" }}
                      >
                        {hadith.transliteration}
                      </Typography>
                    </Box>
                  )}
                  <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                    <Typography variant="pi" textColor="neutral600">
                      {pickLocalizedText(hadith.translations, lang)}
                    </Typography>
                  </Box>
                </Td>
                <Td>
                  <Badge active={hadith.grading === "Sahih"}>
                    {hadith.grading}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="S"
                    variant="secondary"
                    onClick={() =>
                      onPinInspiration({ pinnedHadithId: hadith.id })
                    }
                  >
                    {t("page.ui.pin_hadith_btn", "Pin as Hadith of the Day")}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    )}

    <Table colCount={4} rowCount={duas.length}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.dua_supplication", "Dua / Supplication")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.arabic_meaning", "Arabic & Meaning")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.repetitions", "Repetitions")}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {t("page.ui.action", "Action")}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {duas.map((dua) => (
          <Tr key={dua.id}>
            <Td style={{ whiteSpace: "normal", maxWidth: 240 }}>
              <Box style={{ whiteSpace: "normal" }}>
                <Typography fontWeight="bold">
                  {pickLocalizedText(dua.titles, lang)}
                </Typography>
              </Box>
              <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                <Typography variant="pi" textColor="neutral600">
                  {pickLocalizedText(dua.categoryLabels, lang)}
                </Typography>
              </Box>
            </Td>
            <Td style={{ whiteSpace: "normal", maxWidth: 680 }}>
              <Box style={{ whiteSpace: "normal", lineHeight: 1.7 }}>
                <Typography>{dua.arabicText}</Typography>
              </Box>
              {dua.transliteration && (
                <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                  <Typography
                    variant="pi"
                    textColor="neutral500"
                    style={{ fontStyle: "italic" }}
                  >
                    {dua.transliteration}
                  </Typography>
                </Box>
              )}
              <Box paddingTop={1} style={{ whiteSpace: "normal" }}>
                <Typography variant="pi" textColor="neutral600">
                  {pickLocalizedText(dua.translations, lang)}
                </Typography>
              </Box>
            </Td>
            <Td>
              <Badge>{`${dua.recommendedRepetitions}x`}</Badge>
            </Td>
            <Td>
              <Button
                size="S"
                variant="secondary"
                onClick={() => onPinInspiration({ pinnedDuaId: dua.id })}
              >
                {t("page.ui.pin_dua_btn", "Pin as Dua of the Day")}
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
);
