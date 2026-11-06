import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

import {
  CONTENT_TYPE_UIDS,
  PLUGIN_ID,
  type GlossaryCategory,
  type GlossaryTermRecord,
  type MediaLibraryAsset,
} from "../../../../shared";
import {
  CARD_BORDER_STYLE,
  getContentManagerUrl,
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
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const GlossaryTab: React.FC<GlossaryTabProps> = ({
  glossary,
  post,
  put,
  del,
  onStatusMessage,
  onReload,
}) => {
  const { t } = useResourcesTranslation();
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState<GlossaryCategory>("worship");
  const [nativeScript, setNativeScript] = React.useState("");
  const [transliteration, setTransliteration] = React.useState("");
  const [definition, setDefinition] = React.useState("");
  const [audioFileId, setAudioFileId] = React.useState("none");
  const [uploading, setUploading] = React.useState(false);

  const audioInputRef = React.useRef<HTMLInputElement | null>(null);

  const [audioFileName, setAudioFileName] = React.useState<string>("");

  const getCategoryLabel = (cat: GlossaryCategory) =>
    t(`glossary.category.${cat}`, GLOSSARY_CATEGORY_LABELS[cat] || cat);

  const resetForm = () => {
    setEditingDocId(null);
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
      if (uploaded[0]?.id !== undefined) {
        setAudioFileId(String(uploaded[0].id));
        setAudioFileName(uploaded[0].name || files[0].name);
        onStatusMessage(`Uploaded audio "${uploaded[0].name}".`);
        await onReload();
      }
    } catch (err) {
      onStatusMessage(`Audio upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!term.trim() || !definition.trim()) {
      onStatusMessage(
        t("glossary.msg.required", "Term and Definition are required.")
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
      if (editingDocId) {
        await put(
          `/${PLUGIN_ID}/glossary/${encodeURIComponent(editingDocId)}`,
          payload
        );
        onStatusMessage(`Updated glossary term "${term.trim()}".`);
      } else {
        await post(`/${PLUGIN_ID}/glossary`, payload);
        onStatusMessage(`Added glossary term "${term.trim()}".`);
      }
      resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Failed to save term: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (item: GlossaryTermRecord) => {
    if (!item.documentId) return;
    try {
      await del(
        `/${PLUGIN_ID}/glossary/${encodeURIComponent(item.documentId)}`
      );
      onStatusMessage(`Removed glossary term "${item.term}".`);
      if (editingDocId === item.documentId) resetForm();
      await onReload();
    } catch (err) {
      onStatusMessage(`Delete failed: ${(err as Error).message}`);
    }
  };

  return (
    <Box paddingTop={6}>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a"
        style={{ display: "none" }}
        onChange={handleUploadAudio}
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
          {editingDocId && (
            <Button variant="tertiary" size="S" onClick={resetForm}>
              {t("common.cancel_edit", "Cancel Edit")}
            </Button>
          )}
        </Flex>

        {/* Row 1: Term, Category, Arabic Script, Transliteration */}
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

        {/* Row 2: Definition */}
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
          <Button onClick={handleSave}>
            {t("page.ui.add_term", "Add Term")}
          </Button>
        </Flex>
      </Box>

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
          {glossary.map((item) => (
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
                    {item.pronunciationAudio?.url && (
                      <a
                        href={item.pronunciationAudio.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#7b79ff",
                          textDecoration: "underline",
                        }}
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
                    onClick={() => {
                      window.location.href = getContentManagerUrl(
                        CONTENT_TYPE_UIDS.glossaryTerm,
                        item.documentId,
                        item.locale
                      );
                    }}
                  >
                    {t("common.edit", "Edit")}
                  </Button>
                  <Button
                    size="S"
                    variant="danger-light"
                    onClick={() => handleDelete(item)}
                  >
                    {t("common.delete", "Delete")}
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
