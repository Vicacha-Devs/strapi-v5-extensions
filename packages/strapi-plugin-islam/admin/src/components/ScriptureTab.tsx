import React from 'react';
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
import type {
  CuratedAyahItem,
  CuratedDuaItem,
  CuratedHadithItem,
  DailyInspirationBundle,
} from '../../../shared';
import type { TranslateFn } from './SettingsTabs';

export interface InspirationPinPatch {
  pinnedAyahId?: string | null;
  pinnedHadithId?: string | null;
  pinnedDuaId?: string | null;
}

const FeaturedInspirationItemCard: React.FC<{
  titleText: string;
  isPinned: boolean;
  arabicText: string;
  transliteration?: string;
  translationText: string;
  t: TranslateFn;
}> = ({
  titleText,
  isPinned,
  arabicText,
  transliteration,
  translationText,
  t,
}) => {
  const pinnedSuffix = isPinned
    ? ` ${t('page.ui.pinned_tag', '[PINNED]')}`
    : '';

  return (
    <Box padding={3} background="neutral100" hasRadius>
      <Box marginBottom={1}>
        <Typography fontWeight="bold">
          {titleText}
          {pinnedSuffix}
        </Typography>
      </Box>
      <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
        <Typography>{arabicText}</Typography>
      </Box>
      {transliteration && (
        <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
          <Typography
            variant="pi"
            textColor="neutral500"
            style={{ fontStyle: 'italic' }}
          >
            {transliteration}
          </Typography>
        </Box>
      )}
      <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
        <Typography variant="pi" textColor="neutral600">
          {translationText}
        </Typography>
      </Box>
    </Box>
  );
};

export const ScriptureCockpitTab: React.FC<{
  dailyInspiration: DailyInspirationBundle | null;
  ayat: CuratedAyahItem[];
  hadiths: CuratedHadithItem[];
  duas: CuratedDuaItem[];
  onPinInspiration: (patch: InspirationPinPatch) => void;
  t: TranslateFn;
}> = ({ dailyInspiration, ayat, hadiths, duas, onPinInspiration, t }) => (
  <Box>
    {dailyInspiration && (
      <Box
        marginBottom={6}
        background="neutral0"
        padding={5}
        hasRadius
        shadow="filterShadow"
      >
        <Flex
          justifyContent="space-between"
          alignItems="center"
          marginBottom={4}
          style={{ marginBottom: 16 }}
        >
          <Typography variant="delta" tag="h2">
            {t(
              'page.ui.todays_featured_inspiration_title',
              'Today’s Featured Inspiration ({date})',
              { date: dailyInspiration.date }
            )}
          </Typography>
          <Button
            variant="tertiary"
            onClick={() =>
              onPinInspiration({
                pinnedAyahId: null,
                pinnedHadithId: null,
                pinnedDuaId: null,
              })
            }
          >
            {t(
              'page.ui.reset_all_pins_btn',
              'Reset All Pins to Automatic Daily Rotation'
            )}
          </Button>
        </Flex>
        <Flex gap={4} direction="column" alignItems="stretch">
          <FeaturedInspirationItemCard
            titleText={t(
              'page.ui.ayah_of_the_day_label',
              'Ayah of the Day ({ref})',
              { ref: dailyInspiration.ayahOfTheDay.referenceKey }
            )}
            isPinned={dailyInspiration.isPinnedOverride.ayah}
            arabicText={dailyInspiration.ayahOfTheDay.arabicUthmani}
            transliteration={dailyInspiration.ayahOfTheDay.transliteration}
            translationText={dailyInspiration.ayahOfTheDay.translations.es}
            t={t}
          />
          <FeaturedInspirationItemCard
            titleText={t(
              'page.ui.hadith_of_the_day_label',
              'Hadith of the Day ({collection})',
              { collection: dailyInspiration.hadithOfTheDay.collectionNames.es }
            )}
            isPinned={dailyInspiration.isPinnedOverride.hadith}
            arabicText={dailyInspiration.hadithOfTheDay.arabicText}
            transliteration={dailyInspiration.hadithOfTheDay.transliteration}
            translationText={dailyInspiration.hadithOfTheDay.translations.es}
            t={t}
          />
          <FeaturedInspirationItemCard
            titleText={t(
              'page.ui.dua_of_the_day_label',
              'Dua of the Day ({title})',
              { title: dailyInspiration.duaOfTheDay.titles.es }
            )}
            isPinned={dailyInspiration.isPinnedOverride.dua}
            arabicText={dailyInspiration.duaOfTheDay.arabicText}
            transliteration={dailyInspiration.duaOfTheDay.transliteration}
            translationText={dailyInspiration.duaOfTheDay.translations.es}
            t={t}
          />
        </Flex>
      </Box>
    )}

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
            'page.ui.curated_ayat_section_title',
            'Curated Quranic Ayat ({count}) • 114 Surahs Indexed',
            { count: ayat.length }
          )}
        </Typography>
      </Box>
      <Table colCount={4} rowCount={ayat.length}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.ref', 'Ref')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.arabic_translation', 'Arabic & Translation')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.topics', 'Topics')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.action', 'Action')}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {ayat.map((item) => (
            <Tr key={item.id}>
              <Td>
                <Typography fontWeight="bold">
                  {item.surahNameTranslit} ({item.referenceKey})
                </Typography>
              </Td>
              <Td style={{ whiteSpace: 'normal', maxWidth: 680 }}>
                <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                  <Typography>{item.arabicUthmani}</Typography>
                </Box>
                {item.transliteration && (
                  <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                    <Typography
                      variant="pi"
                      textColor="neutral500"
                      style={{ fontStyle: 'italic' }}
                    >
                      {item.transliteration}
                    </Typography>
                  </Box>
                )}
                <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                  <Typography variant="pi" textColor="neutral600">
                    {item.translations.es}
                  </Typography>
                </Box>
              </Td>
              <Td>
                <Typography variant="pi">{item.topicTags.join(', ')}</Typography>
              </Td>
              <Td>
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => onPinInspiration({ pinnedAyahId: item.id })}
                >
                  {t('page.ui.pin_ayah_btn', 'Pin as Ayah of the Day')}
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>

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
            'page.ui.hadiths_duas_section_title',
            'Prophetic Hadiths ({hadithCount}) & Hisnul Muslim Duas ({duaCount})',
            { hadithCount: hadiths.length, duaCount: duas.length }
          )}
        </Typography>
      </Box>
      <Table colCount={4} rowCount={duas.length}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.dua_supplication', 'Dua / Supplication')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.arabic_meaning', 'Arabic & Meaning')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.repetitions', 'Repetitions')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.action', 'Action')}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {duas.map((dua) => (
            <Tr key={dua.id}>
              <Td style={{ whiteSpace: 'normal', maxWidth: 240 }}>
                <Box style={{ whiteSpace: 'normal' }}>
                  <Typography fontWeight="bold">{dua.titles.es}</Typography>
                </Box>
                <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                  <Typography variant="pi" textColor="neutral600">
                    {dua.categoryLabels.es}
                  </Typography>
                </Box>
              </Td>
              <Td style={{ whiteSpace: 'normal', maxWidth: 680 }}>
                <Box style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
                  <Typography>{dua.arabicText}</Typography>
                </Box>
                {dua.transliteration && (
                  <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                    <Typography
                      variant="pi"
                      textColor="neutral500"
                      style={{ fontStyle: 'italic' }}
                    >
                      {dua.transliteration}
                    </Typography>
                  </Box>
                )}
                <Box paddingTop={1} style={{ whiteSpace: 'normal' }}>
                  <Typography variant="pi" textColor="neutral600">
                    {dua.translations.es}
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
                  {t('page.ui.pin_dua_btn', 'Pin as Dua of the Day')}
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  </Box>
);
