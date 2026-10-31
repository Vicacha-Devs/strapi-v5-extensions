import {
  Box,
  Button,
  Checkbox,
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
  FORM_CATEGORIES,
  PLUGIN_ID,
  SUBMISSION_PRIORITIES,
  type ChecklistItem,
  type FormCategory,
  type FormRecord,
  type FormTranslation,
  type SubmissionPriority,
} from "../../../../shared";
import { FormChecklistAndLocalePanels } from "./FormChecklistAndLocalePanels";

export interface FormRoutingDrawerProps {
  t: (id: string, defaultMessage: string) => string;
  form: FormRecord;
  post: (url: string, body?: unknown) => Promise<{ data?: { data?: unknown } }>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
}

export const FormRoutingDrawer: React.FC<FormRoutingDrawerProps> = ({
  t,
  form,
  post,
  onStatusMessage,
  onReload,
  onClose,
}) => {
  const [editCategory, setEditCategory] = React.useState<FormCategory>(form.category || "contact");
  const [editDepartment, setEditDepartment] = React.useState<string>(
    form.settings?.department || "general"
  );
  const [editPriority, setEditPriority] = React.useState<SubmissionPriority>(
    form.settings?.defaultPriority || "normal"
  );
  const [editBookingBridge, setEditBookingBridge] = React.useState<boolean>(
    Boolean(form.settings?.enableBookingBridge)
  );
  const [editCertBridge, setEditCertBridge] = React.useState<boolean>(
    Boolean(form.settings?.enableCertificateBridge)
  );
  const [editChecklistItems, setEditChecklistItems] = React.useState<ChecklistItem[]>(
    form.checklistTemplate || []
  );
  const [newChecklistLabel, setNewChecklistLabel] = React.useState<string>("");

  const [activeLocale, setActiveLocale] = React.useState<string>("es");
  const [translations, setTranslations] = React.useState<Record<string, FormTranslation>>(
    form.translations || {}
  );

  React.useEffect(() => {
    setEditCategory(form.category || "contact");
    setEditDepartment(form.settings?.department || "general");
    setEditPriority(form.settings?.defaultPriority || "normal");
    setEditBookingBridge(Boolean(form.settings?.enableBookingBridge));
    setEditCertBridge(Boolean(form.settings?.enableCertificateBridge));
    setEditChecklistItems(form.checklistTemplate || []);
    setTranslations(form.translations || {});
    setNewChecklistLabel("");
  }, [form]);

  const updateTranslationField = (key: keyof FormTranslation, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [activeLocale]: {
        ...prev[activeLocale],
        [key]: value,
      },
    }));
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistLabel.trim();
    if (!trimmed) return;
    setEditChecklistItems([
      ...editChecklistItems,
      {
        id: `chk_${Date.now()}`,
        label: trimmed,
        required: true,
        verified: false,
        localizedLabels: {
          [activeLocale]: trimmed,
        },
      },
    ]);
    setNewChecklistLabel("");
  };

  const handleUpdateChecklistItemLabel = (id: string, value: string) => {
    setEditChecklistItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          label: activeLocale === "es" || !item.label ? value : item.label,
          localizedLabels: {
            ...item.localizedLabels,
            [activeLocale]: value,
          },
        };
      })
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setEditChecklistItems(editChecklistItems.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    await post(`/${PLUGIN_ID}/forms`, {
      ...form,
      category: editCategory,
      checklistTemplate: editChecklistItems,
      translations,
      settings: {
        ...form.settings,
        department: editDepartment,
        defaultPriority: editPriority,
        enableBookingBridge: editBookingBridge,
        enableCertificateBridge: editCertBridge,
      },
    });
    onStatusMessage(
      `Saved routing, checklist & translations (es/en/ar) on Form Builder form "${form.title}"`
    );
    onClose();
    await onReload();
  };

  return (
    <Box
      padding={5}
      marginBottom={5}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ border: "1px solid rgba(128, 128, 128, 0.22)" }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={4}
        wrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="delta" tag="h3" fontWeight="bold">
            {t("page.ui.routing_checklist_localization", "Routing, Checklist & Localization")} —{" "}
            {form.slug}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "page.ui.routing_drawer_subtitle",
              "Stored directly on Form Builder CMS (`settings.inbox`). Configure casework routing, document checklist, and es/en/ar translations."
            )}
          </Typography>
        </Box>
        <Flex gap={2}>
          <Button size="S" variant="tertiary" onClick={onClose}>
            {t("page.ui.close", "Close")}
          </Button>
          <Button size="S" onClick={handleSave}>
            {t("page.ui.save_form_config", "Save Form Config")}
          </Button>
        </Flex>
      </Flex>

      <Flex gap={4} wrap="wrap">
        <Box style={{ flex: "1 1 200px" }}>
          <Field.Root name="editCategory">
            <Field.Label>{t("field.workflow_category", "Workflow Category")}</Field.Label>
            <SingleSelect
              value={editCategory}
              onChange={(val: string | number) => setEditCategory(String(val) as FormCategory)}
            >
              {FORM_CATEGORIES.map((cat) => (
                <SingleSelectOption key={cat} value={cat}>
                  {cat}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Box>

        <Box style={{ flex: "1 1 200px" }}>
          <Field.Root name="editDepartment">
            <Field.Label>{t("field.target_department", "Target Department")}</Field.Label>
            <TextInput
              name="editDepartment"
              value={editDepartment}
              onChange={(e: { target: { value: string } }) => setEditDepartment(e.target.value)}
              placeholder={t(
                "placeholder.target_department",
                "e.g., imamate, nikah_family, general"
              )}
            />
          </Field.Root>
        </Box>

        <Box style={{ flex: "1 1 200px" }}>
          <Field.Root name="editPriority">
            <Field.Label>{t("field.default_priority", "Default Priority")}</Field.Label>
            <SingleSelect
              value={editPriority}
              onChange={(val: string | number) =>
                setEditPriority(String(val) as SubmissionPriority)
              }
            >
              {SUBMISSION_PRIORITIES.map((pr) => (
                <SingleSelectOption key={pr} value={pr}>
                  {pr}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Box>
      </Flex>

      <Flex gap={6} paddingTop={4} paddingBottom={4} wrap="wrap">
        <Checkbox
          checked={editBookingBridge}
          onCheckedChange={(checked: boolean) => setEditBookingBridge(Boolean(checked))}
        >
          {t("checkbox.enable_1_click_booking", "Enable 1-Click Appointment Booking")}
        </Checkbox>
        <Checkbox
          checked={editCertBridge}
          onCheckedChange={(checked: boolean) => setEditCertBridge(Boolean(checked))}
        >
          {t("checkbox.enable_1_click_certificate", "Enable 1-Click Certificate Issuance")}
        </Checkbox>
      </Flex>

      <Divider />

      <FormChecklistAndLocalePanels
        t={t}
        checklistItems={editChecklistItems}
        newChecklistLabel={newChecklistLabel}
        onNewChecklistLabelChange={setNewChecklistLabel}
        onAddChecklistItem={handleAddChecklistItem}
        onRemoveChecklistItem={handleRemoveChecklistItem}
        onUpdateChecklistItemLabel={handleUpdateChecklistItemLabel}
        activeLocale={activeLocale}
        onActiveLocaleChange={setActiveLocale}
        translations={translations}
        onUpdateTranslationField={updateTranslationField}
      />
    </Box>
  );
};
