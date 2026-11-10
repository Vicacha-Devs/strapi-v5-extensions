import { Box } from "@strapi/design-system";
import * as React from "react";

import {
  BLOCKED_DOWNLOAD_EXTENSIONS,
  DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  PLUGIN_ID,
  type MediaLibraryAsset,
  type PublicationCategory,
  type PublicationRecord,
} from "../../../../shared";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import {
  PUBLICATION_CATEGORY_LABELS,
  PublicationFormCard,
} from "./PublicationFormCard";
import { PublicationsTable } from "./PublicationsTable";
import {
  uploadFilesToStrapiMediaLibrary,
  useResourcesTranslation,
} from "./uploadHelper";

function parseFileIdValue(selectedFileId: string): number | string | null {
  if (!selectedFileId || selectedFileId === "none") return null;
  return Number(selectedFileId) || selectedFileId;
}

export interface PublicationsTabProps {
  publications: PublicationRecord[];
  mediaFiles: MediaLibraryAsset[];
  allowedDownloadExtensions?: string[];
  post: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  del: (url: string) => Promise<{ data?: unknown }>;
  onStatusMessage: (msg: string, isError?: boolean) => void;
  onReload: () => Promise<void>;
}

export const PublicationsTab: React.FC<PublicationsTabProps> = ({
  publications,
  allowedDownloadExtensions = DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  post,
  put,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<PublicationCategory>("guide");
  const [authorName, setAuthorName] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [selectedFileId, setSelectedFileId] = React.useState<string>("none");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<PublicationRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const rowFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingRowDocId, setUploadingRowDocId] = React.useState<
    string | null
  >(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const acceptExtensions = React.useMemo(() => {
    const baseList =
      allowedDownloadExtensions && allowedDownloadExtensions.length > 0
        ? allowedDownloadExtensions
        : DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS;
    const safeList = baseList.filter(
      (ext) => !BLOCKED_DOWNLOAD_EXTENSIONS.includes(ext.toLowerCase())
    );
    const active =
      safeList.length > 0 ? safeList : DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS;
    return active.join(",");
  }, [allowedDownloadExtensions]);

  const getCategoryLabel = (cat: PublicationCategory) =>
    t(`pub.category.${cat}`, PUBLICATION_CATEGORY_LABELS[cat] || cat);

  const resetForm = () => {
    setTitle("");
    setCategory("guide");
    setAuthorName("");
    setSummary("");
    setSelectedFileId("none");
    setSelectedFileName("");
    setExternalUrl("");
  };

  const handleUploadForForm = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (!isMountedRef.current) return;
      if (uploaded[0]?.id !== undefined) {
        setSelectedFileId(String(uploaded[0].id));
        setSelectedFileName(uploaded[0].name || files[0].name);
        onStatusMessage(
          t(
            "pub.msg.uploaded_attached",
            'Uploaded "{name}" and attached it to this publication.',
            { name: uploaded[0].name }
          )
        );
        await onReload();
      }
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Upload failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
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
      if (!isMountedRef.current) return;
      if (uploaded[0]?.id !== undefined) {
        await put(`/${PLUGIN_ID}/publications/${encodeURIComponent(docId)}`, {
          fileId: Number(uploaded[0].id) || uploaded[0].id,
        });
        onStatusMessage(
          t(
            "pub.msg.attached_row",
            'Attached "{name}" ({size}) to publication.',
            {
              name: uploaded[0].name,
              size: uploaded[0].formattedSize,
            }
          )
        );
        await onReload();
      }
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(
          `Failed to attach file: ${(err as Error).message}`,
          true
        );
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        setUploadingRowDocId(null);
      }
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onStatusMessage(
        t("pub.msg.title_required", "Please enter a Publication Title."),
        true
      );
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
      await post(`/${PLUGIN_ID}/publications`, payload);
      onStatusMessage(`Created publication "${title.trim()}".`);
      if (!isMountedRef.current) return;
      resetForm();
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(
          `Failed to save publication: ${(err as Error).message}`,
          true
        );
      }
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.documentId || isDeleting) return;
    setIsDeleting(true);
    try {
      await del(
        `/${PLUGIN_ID}/publications/${encodeURIComponent(pendingDelete.documentId)}`
      );
      if (!isMountedRef.current) return;
      onStatusMessage(`Removed publication "${pendingDelete.title}".`);
      setPendingDelete(null);
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Delete failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Box paddingTop={6}>
      <input
        ref={formFileInputRef}
        type="file"
        accept={acceptExtensions}
        style={{ display: "none" }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          void handleUploadForForm(e)
        }
      />
      <input
        ref={rowFileInputRef}
        type="file"
        accept={acceptExtensions}
        style={{ display: "none" }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          void handleUploadForRow(e)
        }
      />

      <PublicationFormCard
        title={title}
        category={category}
        authorName={authorName}
        summary={summary}
        externalUrl={externalUrl}
        selectedFileId={selectedFileId}
        selectedFileName={selectedFileName}
        uploading={uploading}
        getCategoryLabel={getCategoryLabel}
        onTitleChange={setTitle}
        onCategoryChange={setCategory}
        onAuthorNameChange={setAuthorName}
        onSummaryChange={setSummary}
        onExternalUrlChange={setExternalUrl}
        onPickFileClick={() => formFileInputRef.current?.click()}
        onClearFile={() => {
          setSelectedFileId("none");
          setSelectedFileName("");
        }}
        onSave={() => void handleSave()}
      />

      <PublicationsTable
        publications={publications}
        getCategoryLabel={getCategoryLabel}
        onUploadRowClick={(docId) => {
          setUploadingRowDocId(docId);
          rowFileInputRef.current?.click();
        }}
        onDelete={(pub) => setPendingDelete(pub)}
      />

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        itemLabel={pendingDelete?.title || ""}
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};
