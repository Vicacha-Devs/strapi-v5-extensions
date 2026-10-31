import { Box, Button, Divider, Flex, Main, Typography } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";

import {
  PLUGIN_ID,
  type AlertBannerRecord,
  type FormRecord,
  type SubmissionRecord,
  type SubscriberRecord,
} from "../../../shared";
import { AlertBannersTab } from "../components/inbox/AlertBannersTab";
import { CaseworkSubmissionsTab } from "../components/inbox/CaseworkSubmissionsTab";
import { FormBuilderTab } from "../components/inbox/FormBuilderTab";
import { SubscribersTab } from "../components/inbox/SubscribersTab";

type ActiveTab = "forms" | "submissions" | "subscribers" | "alerts";

export const InboxHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, post, put } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("submissions");
  const [forms, setForms] = React.useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
  const [subscribers, setSubscribers] = React.useState<SubscriberRecord[]>([]);
  const [alerts, setAlerts] = React.useState<AlertBannerRecord[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string>("");

  const loadAll = async () => {
    try {
      const [formsRes, subsRes, subscRes, alertsRes] = await Promise.all([
        get(`/${PLUGIN_ID}/forms?activeOnly=false&admin=true`),
        get(`/${PLUGIN_ID}/submissions`),
        get(`/${PLUGIN_ID}/subscribers`),
        get(`/${PLUGIN_ID}/alerts`),
      ]);
      setForms(formsRes?.data?.data || []);
      setSubmissions(subsRes?.data?.data || []);
      setSubscribers(subscRes?.data?.data || []);
      setAlerts(alertsRes?.data?.data || []);
    } catch {
      // Initial empty state in test or unmounted mode
    }
  };

  React.useEffect(() => {
    void loadAll();
  }, []);

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={4}
          wrap="wrap"
          gap={3}
        >
          <Box>
            <Typography variant="alpha" tag="h1">
              {t("page.ui.inbox_service_desk", "Inbox & Service Desk")}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "page.ui.inbox_service_desk_subtitle",
                "Casework submissions, visual forms, subscribers, and site-wide alert banners"
              )}
            </Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              variant={activeTab === "submissions" ? "default" : "tertiary"}
              onClick={() => setActiveTab("submissions")}
            >
              {t("page.ui.casework_inbox", "Casework Inbox")} ({submissions.length})
            </Button>
            <Button
              variant={activeTab === "forms" ? "default" : "tertiary"}
              onClick={() => setActiveTab("forms")}
            >
              {t("page.ui.form_builder", "Form Builder")} ({forms.length})
            </Button>
            <Button
              variant={activeTab === "subscribers" ? "default" : "tertiary"}
              onClick={() => setActiveTab("subscribers")}
            >
              {t("page.ui.subscribers", "Subscribers")} ({subscribers.length})
            </Button>
            <Button
              variant={activeTab === "alerts" ? "default" : "tertiary"}
              onClick={() => setActiveTab("alerts")}
            >
              {t("page.ui.alert_banners", "Alert Banners")} ({alerts.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {statusMessage}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        {activeTab === "submissions" && (
          <CaseworkSubmissionsTab
            t={t}
            submissions={submissions}
            forms={forms}
            post={post}
            put={put}
            onStatusMessage={setStatusMessage}
            onReload={loadAll}
          />
        )}

        {activeTab === "forms" && (
          <FormBuilderTab
            t={t}
            forms={forms}
            post={post}
            onStatusMessage={setStatusMessage}
            onReload={loadAll}
          />
        )}

        {activeTab === "subscribers" && (
          <SubscribersTab
            t={t}
            subscribers={subscribers}
            post={post}
            onStatusMessage={setStatusMessage}
            onReload={loadAll}
          />
        )}

        {activeTab === "alerts" && (
          <AlertBannersTab
            t={t}
            alerts={alerts}
            post={post}
            onStatusMessage={setStatusMessage}
            onReload={loadAll}
          />
        )}
      </Box>
    </Main>
  );
};

export default InboxHomePage;
