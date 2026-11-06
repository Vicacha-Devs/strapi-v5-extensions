import { Box, Flex, LinkButton } from "@strapi/design-system";
import { ArrowLeft, Pencil } from "@strapi/icons";
import { Layouts } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";
import { NavLink } from "react-router-dom";

import { getTrad } from "../../../utils/getTrad";

interface HeaderProps {
  seoComponent?: Record<string, unknown> | null;
}

const SEO_COMPONENT_PATH =
  "/plugins/content-type-builder/component-categories/shared/shared.seo";

export const Header = ({ seoComponent }: HeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral100">
      <Layouts.Header
        primaryAction={
          <Flex gap={2} alignItems="center">
            {seoComponent ? (
              <LinkButton
                variant="secondary"
                tag={NavLink}
                to={SEO_COMPONENT_PATH}
                startIcon={<Pencil />}
              >
                {formatMessage({
                  id: getTrad("SEOPage.header.button.edit-component"),
                  defaultMessage: "Edit SEO component",
                })}
              </LinkButton>
            ) : null}
            <LinkButton
              tag={NavLink}
              variant="tertiary"
              to="/"
              startIcon={<ArrowLeft />}
            >
              {formatMessage({
                id: getTrad("SEOPage.header.button.back"),
                defaultMessage: "Back",
              })}
            </LinkButton>
          </Flex>
        }
        title={formatMessage({
          id: getTrad("SEOPage.header.title"),
          defaultMessage: "SEO",
        })}
        subtitle={formatMessage({
          id: getTrad("SEOPage.header.subtitle"),
          defaultMessage: "Optimize your content to be SEO friendly",
        })}
        as="h2"
      />
    </Box>
  );
};
