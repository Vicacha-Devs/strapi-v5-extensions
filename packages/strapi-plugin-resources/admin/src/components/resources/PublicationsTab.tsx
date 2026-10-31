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

import {
  PLUGIN_ID,
  type MediaLibraryAsset,
  type PublicationCategory,
  type PublicationRecord,
} from "../../../../shared";
import { PublicationsTable } from "./PublicationsTable";
import {
  CARD_BORDER_STYLE,
  uploadFilesToStrapiMediaLibrary,
  useResourcesTranslation,
} from "./uploadHelper";

const PUBLICATION_CATEGORY_LABELS: Record<PublicationCategory, string> = {
  guide: "Visitor & Prayer Guide",
  book: "Book / eBook",
  pamphlet: "Pamphlet / Brochure",
  press_kit: "Press & Media Kit",
  academic: "Academic / Research",
  general: "General Publication",
};

function parseFileIdValue(selectedFileId: string): number | string | null {
  if (!selectedFileId || selectedFileId === "none") return null;
  return Number(selectedFileId) || selectedFileId;
}

export interface PublicationsTabProps {
  publications: PublicationRecord[];
  mediaFiles: MediaLibraryAsset[];
  post: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  del: (url: string) => Promise<{ data?: unknown }>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const PublicationsTab: React.FC<PublicationsTabProps> = ({
  publications,
  post,
  put,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<PublicationCategory>("guide");
  const [authorName, setAuthorName] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [selectedFileId, setSelectedFileId] = React.useState<string>("none");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  const formFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const rowFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingRowDocId, setUploadingRowDocId] = React.useState<string | null>(null);

  const [selectedFileName, setSelectedFileName] = React.useState<string>("");

  const getCategoryLabel = (cat: PublicationCategory) =>
    t(`pub.category.${cat}`, PUBLICATION_CATEGORY_LABELS[cat] || cat);

  const resetForm = () => {
    setEditingDocId(null);
    setTitle("");
    setCategory("guide");
    setAuthorName("");
    setSummary("");
    setSelectedFileId("none");
    setSelectedFileName("");
    setExternalUrl("");
  };

  const handleUploadForForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (uploaded[0]?.id !== undefined) {
        setSelectedFileId(String(uploaded[0].id));
        setSelectedFileName(uploaded[0].name || files[0].name);
        onStatusMessage(
          t("pub.msg.uploaded_attached", 'Uploaded "{name}" and attached it to this publication.', {
            name: uploaded[0].name,
          })
        );
        await onReload();
      }
    } catch (err) {
      onStatusMessage(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUploadForRow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const docId = uploadingRowDocId;
    if (!files || !files.length || !docId) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (uploaded[0]?.id !== undefined) {
        await put(`/${PLUGIN_ID}/publications/${encodeURIComponent(docId)}`, {
          fileId: Number(uploaded[0].id) || uploaded[0].id,
        });
        onStatusMessage(
          t("pub.msg.attached_row", 'Attached "{name}" ({size}) to publication.', {
            name: uploaded[0].name,
            size: uploaded[0].formattedSize,
          })
        );
        await onReload();
      }
    } catch (err) {
      onStatusMessage(`Failed to attach file: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      setUploadingRowDocId(null);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onStatusMessage(t("pub.msg.title_required", "Please enter a Publication Title."));
      return;
    }
    try {
      const payload = {
        title: title.trim(),
        category,
        authorName: authorName.trim() || undefined,
        summary: summary.trim(),
        fileId: parseFileIdValue(selectedFileId),
        externalDownloadUrl: externalUrl.trim() || undefined,
        featured: true,
        allowPublicDownload: true,
      };
      if (editingDocId) {
        await put(`/${PLUGIN_ID}/publications/${encodeURIComponent(editingDocId)}`, payload);
        onStatusMessage(`Updated publication "${title.trim()}".`);
      } else {
        await post(`/${PLUGIN_ID}/publications`, payload);
        onStatusMessage(`Created publication "${title.trim()}".`);
      }
      resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Failed to save publication: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (pub: PublicationRecord) => {
    if (!pub.documentId) return;
    try {
      await del(`/${PLUGIN_ID}/publications/${encodeURIComponent(pub.documentId)}`);
      onStatusMessage(`Removed publication "${pub.title}".`);
      if (editingDocId === pub.documentId) resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Delete failed: ${(err as Error).message}`);
    }
  };

  const uploadBtnText = uploading
    ? t("common.uploading", "Uploading…")
    : selectedFileId !== "none"
      ? t("pub.btn.replace_pdf_ebook", "Replace PDF / eBook")
      : t("pub.btn.upload_pdf_ebook", "+ Upload PDF / eBook");

  return (
    <Box paddingTop={6}>
      <input
        ref={formFileInputRef}
        type="file"
        accept=".pdf,.epub,.doc,.docx,application/pdf"
        style={{ display: "none" }}
        onChange={handleUploadForForm}
      />
      <input
        ref={rowFileInputRef}
        type="file"
        accept=".pdf,.epub,.doc,.docx,application/pdf"
        style={{ display: "none" }}
        onChange={handleUploadForRow}
      />

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
          {editingDocId && (
            <Button variant="tertiary" size="S" onClick={resetForm}>
              {t("common.cancel_edit", "Cancel Edit")}
            </Button>
          )}
        </Flex>

        {/* Row 1: Title, Category, Author */}
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
              <Field.Label>{t("field.publication_title", "Publication Title")}</Field.Label>
              <TextInput
                placeholder={t(
                  "placeholder.e_g_gu_a_de_bienvenida_a_la_mezquita_pdf",
                  "e.g., Mosque Visitor & Prayer Guide"
                )}
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
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
                onChange={(val: string | number) => setCategory(String(val) as PublicationCategory)}
              >
                {(Object.keys(PUBLICATION_CATEGORY_LABELS) as PublicationCategory[]).map((val) => (
                  <SingleSelectOption key={val} value={val}>
                    {getCategoryLabel(val)}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <Field.Hint />
            </Field.Root>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Field.Root hint={t("pub.field.author_hint", "Author or committee name (optional)")}>
              <Field.Label>{t("pub.field.author_label", "Author (Optional)")}</Field.Label>
              <TextInput
                placeholder={t("pub.field.author_placeholder", "e.g., Department of Education")}
                value={authorName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthorName(e.target.value)}
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>

        {/* Row 2: Summary & External URL */}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
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
                {t("pub.field.external_url_label", "External Download URL (Optional)")}
              </Field.Label>
              <TextInput
                placeholder="https://..."
                value={externalUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExternalUrl(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>

        <Box paddingTop={4}>
          <Divider />
        </Box>

        {/* Footer Action Bar */}
        <Flex paddingTop={4} justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Flex gap={3} alignItems="center" wrap="wrap">
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => formFileInputRef.current?.click()}
            >
              {uploadBtnText}
            </Button>
            {selectedFileId !== "none" && (
              <Flex gap={2} alignItems="center">
                <Badge active>
                  {t("common.attached", "Attached")}: {selectedFileName || `#${selectedFileId}`}
                </Badge>
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() => {
                    setSelectedFileId("none");
                    setSelectedFileName("");
                  }}
                >
                  {t("common.remove", "Remove")}
                </Button>
              </Flex>
            )}
          </Flex>
          <Button onClick={handleSave}>
            {t("page.ui.create_publication", "Create Publication")}
          </Button>
        </Flex>
      </Box>

      <PublicationsTable
        publications={publications}
        getCategoryLabel={getCategoryLabel}
        onUploadRowClick={(docId) => {
          setUploadingRowDocId(docId);
          rowFileInputRef.current?.click();
        }}
        onDelete={handleDelete}
      />
    </Box>
  );
};
