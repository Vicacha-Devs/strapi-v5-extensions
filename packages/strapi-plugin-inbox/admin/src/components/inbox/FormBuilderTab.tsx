import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  FORM_BUILDER_CMS_PLUGIN_ID,
  PLUGIN_ID,
  STARTER_FORM_TEMPLATES,
  type FormRecord,
} from '../../../../shared';
import { FormRoutingDrawer } from './FormRoutingDrawer';

const drawerCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

export interface SyncBuilderResponse {
  data?: {
    data?: {
      forms?: FormRecord[];
    };
  };
}

export interface FormBuilderTabProps {
  t: (id: string, defaultMessage: string) => string;
  forms: FormRecord[];
  post: (url: string, body?: unknown) => Promise<SyncBuilderResponse>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const FormBuilderTab: React.FC<FormBuilderTabProps> = ({
  t,
  forms,
  post,
  onStatusMessage,
  onReload,
}) => {
  const navigate = useNavigate();

  const [editingFormSlug, setEditingFormSlug] = React.useState<string | null>(
    null
  );
  const [showTemplates, setShowTemplates] = React.useState<boolean>(false);

  const selectedForm = React.useMemo(
    () => forms.find((f) => f.slug === editingFormSlug) || null,
    [forms, editingFormSlug]
  );

  const handleCreateTemplate = async (templateId: string) => {
    await post(`/${PLUGIN_ID}/forms/from-template`, { templateId });
    onStatusMessage(
      `Created form from "${templateId}" in Visual Form Builder`
    );
    setShowTemplates(false);
    await onReload();
  };

  const handleSyncFormBuilder = async () => {
    const res = await post(`/${PLUGIN_ID}/forms/sync-builder`, {});
    const info = res?.data?.data;
    onStatusMessage(
      `Refreshed Visual Form Builder (${info?.forms?.length ?? 0} forms)`
    );
    await onReload();
  };

  const handleOpenInVisualBuilder = async (form: FormRecord) => {
    if (form.formBuilderId) {
      navigate(
        `/plugins/${FORM_BUILDER_CMS_PLUGIN_ID}/builder/${form.formBuilderId}`
      );
      return;
    }
    const res = await post(`/${PLUGIN_ID}/forms/sync-builder`, {});
    const syncedForms: FormRecord[] = res?.data?.data?.forms || [];
    const matched = syncedForms.find((f) => f.slug === form.slug);
    if (matched?.formBuilderId) {
      navigate(
        `/plugins/${FORM_BUILDER_CMS_PLUGIN_ID}/builder/${matched.formBuilderId}`
      );
    } else {
      navigate(`/plugins/${FORM_BUILDER_CMS_PLUGIN_ID}`);
    }
  };

  return (
    <Box paddingTop={5}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={4}
        wrap="wrap"
        gap={3}
      >
        <Flex gap={3} alignItems="center" wrap="wrap">
          <Typography variant="beta" tag="h2">
            {t('page.ui.active_forms', 'Forms & Service-Desk Workflows')}
          </Typography>
          <Badge>{t('page.ui.formcraft_visual_builder', 'FormCraft Visual Builder')}</Badge>
        </Flex>

        <Flex gap={2} wrap="wrap">
          <Button
            variant="tertiary"
            size="S"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            {showTemplates
              ? t('page.ui.hide_templates', 'Hide Templates')
              : t('page.ui.starter_templates', 'Starter Templates')}
          </Button>
          <Button variant="secondary" size="S" onClick={handleSyncFormBuilder}>
            {t('page.ui.sync_form_builder', 'Refresh Forms')}
          </Button>
          <Button
            variant="default"
            size="S"
            onClick={() =>
              navigate(`/plugins/${FORM_BUILDER_CMS_PLUGIN_ID}/builder/new`)
            }
          >
            {t('page.ui.new_visual_form', '+ New Visual Form')}
          </Button>
        </Flex>
      </Flex>

      {showTemplates ? (
        <Box
          padding={4}
          marginBottom={4}
          background="neutral100"
          hasRadius
          style={drawerCardStyle}
        >
          <Flex
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap={3}
          >
            <Typography variant="pi" textColor="neutral600">
              {t(
                'page.ui.seed_starter_form_hint',
                'Quickly seed a pre-configured multilingual mosque form:'
              )}
            </Typography>
            <Flex gap={2} wrap="wrap">
              {STARTER_FORM_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  size="S"
                  variant="secondary"
                  onClick={() => handleCreateTemplate(tpl.id)}
                >
                  + {tpl.name}
                </Button>
              ))}
            </Flex>
          </Flex>
        </Box>
      ) : null}

      {selectedForm ? (
        <FormRoutingDrawer
          t={t}
          form={selectedForm}
          post={post}
          onStatusMessage={onStatusMessage}
          onReload={onReload}
          onClose={() => setEditingFormSlug(null)}
        />
      ) : null}

      <Table colCount={6} rowCount={forms.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.title', 'Form')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.category', 'Category & Dept')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.fields', 'Fields & Locales')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.checklist', 'Checklist')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.submissions', 'Submissions')}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {t('page.ui.actions', 'Actions')}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {forms.map((form) => {
            const localeKeys = Object.keys(form.translations || {});
            return (
              <Tr key={form.slug}>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography fontWeight="bold">{form.title}</Typography>
                    <Typography variant="pi" textColor="neutral500">
                      /{form.slug}
                    </Typography>
                  </Flex>
                </Td>
                <Td>
                  <Flex gap={2} alignItems="center">
                    <Badge>{form.category}</Badge>
                    <Typography variant="pi" textColor="neutral600">
                      {form.settings?.department || 'general'}
                    </Typography>
                  </Flex>
                </Td>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography>
                      {(form.fields || []).length}{' '}
                      {t('page.ui.fields_label', 'fields')}
                    </Typography>
                    {localeKeys.length > 0 ? (
                      <Typography variant="pi" textColor="neutral500">
                        {t('page.ui.locales_label', 'Locales')}:{' '}
                        {localeKeys.join(', ').toUpperCase()}
                      </Typography>
                    ) : null}
                  </Flex>
                </Td>
                <Td>
                  <Typography>
                    {(form.checklistTemplate || []).length}
                  </Typography>
                </Td>
                <Td>
                  <Typography fontWeight="semiBold">
                    {form.submissionCount || 0}
                  </Typography>
                </Td>
                <Td>
                  <Flex gap={2} wrap="wrap">
                    <Button
                      size="S"
                      variant="secondary"
                      onClick={() => handleOpenInVisualBuilder(form)}
                    >
                      {t(
                        'page.ui.design_fields',
                        'Design Fields (Drag & Drop)'
                      )}
                    </Button>
                    <Button
                      size="S"
                      variant={
                        editingFormSlug === form.slug ? 'default' : 'tertiary'
                      }
                      onClick={() =>
                        setEditingFormSlug(
                          editingFormSlug === form.slug ? null : form.slug
                        )
                      }
                    >
                      {t(
                        'page.ui.casework_checklist',
                        'Routing, Checklist & i18n'
                      )}
                    </Button>
                  </Flex>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};
