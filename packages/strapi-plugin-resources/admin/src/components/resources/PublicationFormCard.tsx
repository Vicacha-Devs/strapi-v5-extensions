import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import type { PublicationCategory } from "../../../../shared";
import { CARD_BORDER_STYLE, useResourcesTranslation } from "./uploadHelper";

export const PUBLICATION_CATEGORY_LABELS: Record<PublicationCategory, string> =
  {
    guide: "Visitor & Prayer Guide",
    book: "Book / eBook",
    pamphlet: "Pamphlet / Brochure",
    press_kit: "Press & Media Kit",
    academic: "Academic / Research",
    general: "General Publication",
  };

export interface PublicationFormCardProps {
  title: string;
  category: PublicationCategory;
  authorName: string;
  summary: string;
  externalUrl: string;
  selectedFileId: string;
  selectedFileName: string;
  uploading: boolean;
  getCategoryLabel: (cat: PublicationCategory) => string;
  onTitleChange: (val: string) => void;
  onCategoryChange: (val: PublicationCategory) => void;
  onAuthorNameChange: (val: string) => void;
  onSummaryChange: (val: string) => void;
  onExternalUrlChange: (val: string) => void;
  onPickFileClick: () => void;
  onClearFile: () => void;
  onSave: () => void;
}

export const PublicationFormCard: React.FC<PublicationFormCardProps> = ({
  title,
  category,
  authorName,
  summary,
  externalUrl,
  selectedFileId,
  selectedFileName,
  uploading,
  getCategoryLabel,
  onTitleChange,
  onCategoryChange,
  onAuthorNameChange,
  onSummaryChange,
  onExternalUrlChange,
  onPickFileClick,
  onClearFile,
  onSave,
}) => {
  const { t } = useResourcesTranslation();

  const uploadBtnText = uploading
    ? t("common.uploading", "Uploading…")
    : selectedFileId !== "none"
      ? t("pub.btn.replace_pdf_ebook", "Replace PDF / eBook")
      : t("pub.btn.upload_pdf_ebook", "+ Upload PDF / eBook");

  return (
    <Box
      padding={6}
      marginBottom={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={CARD_BORDER_STYLE}
    >
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        paddingBottom={4}
        wrap="wrap"
        gap={3}
      >
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="delta" tag="h2" fontWeight="bold">
            {t(
              "page.ui.add_digital_library_publication_media_library_pd",
              "Add Digital Library Publication (PDF / eBook)"
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "pub.form.subtitle",
              "Upload a PDF or eBook from your computer using the button below, or provide an external download link."
            )}
          </Typography>
        </Flex>
      </Flex>

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <Box style={{ minWidth: 0 }}>
          <Field.Root
            required
            hint={t(
              "page.ui.display_title_shown_in_the_public_digital_librar",
              "Title shown in the public Digital Library"
            )}
          >
            <Field.Label>
              {t("field.publication_title", "Publication Title")}
            </Field.Label>
            <TextInput
              placeholder={t(
                "placeholder.e_g_gu_a_de_bienvenida_a_la_mezquita_pdf",
                "e.g., Mosque Visitor & Prayer Guide"
              )}
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onTitleChange(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box style={{ minWidth: 0 }}>
          <Field.Root
            hint={t(
              "page.ui.used_for_filtering_publications_on_the_public_po",
              "Used to filter publications on the website"
            )}
          >
            <Field.Label>{t("page.ui.category", "Category")}</Field.Label>
            <SingleSelect
              value={category}
              onChange={(val: string | number) =>
                onCategoryChange(String(val) as PublicationCategory)
              }
            >
              {(
                Object.keys(
                  PUBLICATION_CATEGORY_LABELS
                ) as PublicationCategory[]
              ).map((val) => (
                <SingleSelectOption key={val} value={val}>
                  {getCategoryLabel(val)}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box style={{ minWidth: 0 }}>
          <Field.Root
            hint={t(
              "pub.field.author_hint",
              "Author or committee name (optional)"
            )}
          >
            <Field.Label>
              {t("pub.field.author_label", "Author (Optional)")}
            </Field.Label>
            <TextInput
              placeholder={t(
                "pub.field.author_placeholder",
                "e.g., Department of Education"
              )}
              value={authorName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onAuthorNameChange(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>

      <Box
        paddingTop={4}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <Box style={{ minWidth: 0 }}>
          <Field.Root
            hint={t(
              "page.ui.short_description_displayed_on_the_download_card",
              "Short description shown on the download card"
            )}
          >
            <Field.Label>
              {t("field.summary_abstract", "Summary / Abstract (Optional)")}
            </Field.Label>
            <TextInput
              placeholder={t(
                "placeholder.e_g_introducci_n_a_la_historia_horarios_y_etique",
                "Brief summary of this guide, book, or brochure..."
              )}
              value={summary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSummaryChange(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>

        <Box style={{ minWidth: 0 }}>
          <Field.Root
            hint={t(
              "pub.field.external_url_hint",
              "Only needed if hosted on an external link instead of uploading a PDF below"
            )}
          >
            <Field.Label>
              {t(
                "pub.field.external_url_label",
                "External Download URL (Optional)"
              )}
            </Field.Label>
            <TextInput
              placeholder="https://..."
              value={externalUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onExternalUrlChange(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>

      <Box paddingTop={4}>
        <Divider />
      </Box>

      <Flex
        paddingTop={4}
        justifyContent="space-between"
        alignItems="center"
        wrap="wrap"
        gap={3}
      >
        <Flex gap={3} alignItems="center" wrap="wrap">
          <Button
            variant="secondary"
            disabled={uploading}
            onClick={onPickFileClick}
          >
            {uploadBtnText}
          </Button>
          {selectedFileId !== "none" && (
            <Flex gap={2} alignItems="center">
              <Badge active>
                {t("common.attached", "Attached")}:{" "}
                {selectedFileName || `#${selectedFileId}`}
              </Badge>
              <Button variant="tertiary" size="S" onClick={onClearFile}>
                {t("common.remove", "Remove")}
              </Button>
            </Flex>
          )}
        </Flex>
        <Button onClick={onSave}>
          {t("page.ui.create_publication", "Create Publication")}
        </Button>
      </Flex>
    </Box>
  );
};
