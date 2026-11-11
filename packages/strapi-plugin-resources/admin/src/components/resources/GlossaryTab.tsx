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
  type GlossaryCategory,
  type GlossaryTermRecord,
  type MediaLibraryAsset,
} from "../../../../shared";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { GlossaryTable } from "./GlossaryTable";
import {
  CARD_BORDER_STYLE,
  uploadFilesToStrapiMediaLibrary,
  useResourcesTranslation,
} from "./uploadHelper";

const GLOSSARY_CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  worship: "Worship & Prayer",
  beliefs: "Beliefs & Creed",
  ethics: "Ethics & Character",
  history: "History & Architecture",
  community: "Community & Family",
  general: "General Term",
};

export interface GlossaryTabProps {
  glossary: GlossaryTermRecord[];
  mediaFiles: MediaLibraryAsset[];
  post: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, data?: unknown) => Promise<{ data?: unknown }>;
  del: (url: string) => Promise<{ data?: unknown }>;
  onStatusMessage: (msg: string, isError?: boolean) => void;
  onReload: () => Promise<void>;
}

export const GlossaryTab: React.FC<GlossaryTabProps> = ({
  glossary,
  post,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState<GlossaryCategory>("worship");
  const [nativeScript, setNativeScript] = React.useState("");
  const [transliteration, setTransliteration] = React.useState("");
  const [definition, setDefinition] = React.useState("");
  const [audioFileId, setAudioFileId] = React.useState("none");
  const [uploading, setUploading] = React.useState(false);
  const [audioFileName, setAudioFileName] = React.useState<string>("");
  const [pendingDelete, setPendingDelete] =
    React.useState<GlossaryTermRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getCategoryLabel = (cat: GlossaryCategory) =>
    t(`glossary.category.${cat}`, GLOSSARY_CATEGORY_LABELS[cat] || cat);

  const resetForm = () => {
    setTerm("");
    setCategory("worship");
    setNativeScript("");
    setTransliteration("");
    setDefinition("");
    setAudioFileId("none");
    setAudioFileName("");
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFilesToStrapiMediaLibrary(files, post);
      if (!isMountedRef.current) return;
      if (uploaded[0]?.id !== undefined) {
        setAudioFileId(String(uploaded[0].id));
        setAudioFileName(uploaded[0].name || files[0].name);
        onStatusMessage(`Uploaded audio "${uploaded[0].name}".`);
        await onReload();
      }
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Audio upload failed: ${(err as Error).message}`, true);
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!term.trim() || !definition.trim()) {
      onStatusMessage(
        t("glossary.msg.required", "Term and Definition are required."),
        true
      );
      return;
    }
    try {
      const audioVal =
        audioFileId && audioFileId !== "none"
          ? Number(audioFileId) || audioFileId
          : null;
      const payload = {
        term: term.trim(),
        category,
        nativeScript: nativeScript.trim() || undefined,
        transliteration: transliteration.trim() || undefined,
        definition: definition.trim(),
        pronunciationAudioId: audioVal,
        featured: true,
      };
      await post(`/${PLUGIN_ID}/glossary`, payload);
      onStatusMessage(`Added glossary term "${term.trim()}".`);
      if (!isMountedRef.current) return;
      resetForm();
      await onReload();
    } catch (err) {
      if (isMountedRef.current) {
        onStatusMessage(`Failed to save term: ${(err as Error).message}`, true);
      }
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.documentId || isDeleting) return;
    setIsDeleting(true);
    try {
      await del(
        `/${PLUGIN_ID}/glossary/${encodeURIComponent(pendingDelete.documentId)}`
      );
      if (!isMountedRef.current) return;
      onStatusMessage(`Removed glossary term "${pendingDelete.term}".`);
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
        ref={audioInputRef}
        type="file"
        accept=".mp3,.m4a,.ogg,.wav,audio/mpeg,audio/mp4,audio/ogg,audio/wav"
        style={{ display: "none" }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          void handleUploadAudio(e)
        }
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
                "page.ui.add_glossary_term_a_z_index_optional_audio_pronu",
                "Add Glossary Term (A–Z Index & Pronunciation)"
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "glossary.form.subtitle",
                "Define Islamic and architectural terms with Arabic script, transliteration, and optional audio pronunciation."
              )}
            </Typography>
          </Flex>
        </Flex>

        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Box style={{ minWidth: 0 }}>
            <Field.Root
              required
              hint={t(
                "page.ui.primary_term_indexed_a_z_in_the_public_glossary",
                "Primary term indexed A–Z"
              )}
            >
              <Field.Label>{t("field.term", "Term")}</Field.Label>
              <TextInput
                placeholder={t("placeholder.e_g_mihrab", "e.g., Mihrab")}
                value={term}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTerm(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Field.Root
              hint={t("glossary.field.category_hint", "Thematic category")}
            >
              <Field.Label>{t("page.ui.category", "Category")}</Field.Label>
              <SingleSelect
                value={category}
                onChange={(val: string | number) =>
                  setCategory(String(val) as GlossaryCategory)
                }
              >
                {(
                  Object.keys(GLOSSARY_CATEGORY_LABELS) as GlossaryCategory[]
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
                "page.ui.original_arabic_script_with_optional_tashkeel",
                "Original Arabic script (optional)"
              )}
            >
              <Field.Label>
                {t(
                  "field.native_script_arabic",
                  "Arabic / Native Script (Optional)"
                )}
              </Field.Label>
              <TextInput
                placeholder={t("placeholder.e_g", "e.g., مِحْرَاب")}
                value={nativeScript}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNativeScript(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Field.Root
              hint={t(
                "page.ui.phonetic_latin_transliteration_for_pronunciation",
                "Phonetic Latin transliteration (optional)"
              )}
            >
              <Field.Label>
                {t("field.transliteration", "Transliteration (Optional)")}
              </Field.Label>
              <TextInput
                placeholder={t("placeholder.e_g_mi_r_b", "e.g., Miḥrāb")}
                value={transliteration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTransliteration(e.target.value)
                }
              />
              <Field.Hint />
            </Field.Root>
          </Box>
        </Box>

        <Box paddingTop={4}>
          <Field.Root
            required
            hint={t(
              "page.ui.clear_explanation_displayed_in_glossary_tooltips",
              "Clear explanation displayed in glossary tooltips and cards"
            )}
          >
            <Field.Label>{t("field.definition", "Definition")}</Field.Label>
            <TextInput
              placeholder={t(
                "placeholder.e_g_nicho_semicircular_en_el_muro_de_la_qibla_qu",
                "e.g., Semicircular niche in the Qibla wall indicating the direction of Makkah."
              )}
              value={definition}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDefinition(e.target.value)
              }
            />
            <Field.Hint />
          </Field.Root>
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
              onClick={() => audioInputRef.current?.click()}
            >
              {uploading
                ? t("common.uploading", "Uploading…")
                : audioFileId !== "none"
                  ? t(
                      "glossary.btn.replace_audio",
                      "Replace Audio (.mp3 / .wav)"
                    )
                  : t(
                      "glossary.btn.upload_audio",
                      "+ Upload Audio (.mp3 / .wav)"
                    )}
            </Button>
            {audioFileId !== "none" && (
              <Flex gap={2} alignItems="center">
                <Badge active>
                  {t("common.attached", "Attached")}:{" "}
                  {audioFileName || `#${audioFileId}`}
                </Badge>
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() => {
                    setAudioFileId("none");
                    setAudioFileName("");
                  }}
                >
                  {t("common.remove", "Remove")}
                </Button>
              </Flex>
            )}
          </Flex>
          <Button onClick={() => void handleSave()}>
            {t("page.ui.add_term", "Add Term")}
          </Button>
        </Flex>
      </Box>

      <GlossaryTable
        glossary={glossary}
        getCategoryLabel={getCategoryLabel}
        onDelete={(item) => setPendingDelete(item)}
      />

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        itemLabel={pendingDelete?.term || ""}
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};
