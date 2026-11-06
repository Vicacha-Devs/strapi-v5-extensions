import { Typography } from "@strapi/design-system";
import React from "react";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface HighlightProps {
  text?: string | null;
  query?: string;
  textColor?: string;
}

/** Marks every occurrence of the query inside a snippet, case-insensitively. */
const Highlight = ({
  text,
  query = "",
  textColor = "neutral600",
}: HighlightProps) => {
  if (!text) return null;
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return (
      <Typography tag="span" textColor={textColor}>
        {text}
      </Typography>
    );
  }

  const parts = String(text).split(
    new RegExp(`(${escapeRegExp(cleanQuery)})`, "gi")
  );
  const lowered = cleanQuery.toLowerCase();

  return (
    <Typography tag="span" textColor={textColor}>
      {parts.map((part, index) =>
        part.toLowerCase() === lowered ? (
          <Typography
            key={`${part}-${index}`}
            tag="span"
            fontWeight="bold"
            textColor="primary600"
          >
            {part}
          </Typography>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        )
      )}
    </Typography>
  );
};

export { Highlight };
