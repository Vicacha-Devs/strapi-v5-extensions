import * as React from "react";

import type { OpenGraphImage } from "../../../../../../../../shared";

interface TwitterOGPreviewProps {
  image: OpenGraphImage;
  title: string;
  description: string;
}

const toSafeImageUrl = (rawUrl?: string): string => {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return "";
};

export const TwitterOGPreview = ({
  image,
  title,
  description,
}: TwitterOGPreviewProps) => {
  const safeSrc = toSafeImageUrl(image?.url);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        border: "1px solid #e1e8ed",
        fontFamily: "Arial, sans-serif",
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "pointer",
        margin: "auto",
        marginBottom: "40px",
      }}
    >
      <div
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          style={{ width: "100%", position: "relative", paddingTop: "52.5%" }}
        >
          {safeSrc ? (
            <img
              src={safeSrc}
              alt={title}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "12px 10px",
          lineHeight: "1.4",
          borderTop: "1px solid #e1e8ed",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#657786",
            marginBottom: "4px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          your-site.io
        </div>

        <div
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "#14171A",
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title.substring(0, 70)}
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#657786",
            maxHeight: "40px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            display: "-webkit-box",
          }}
        >
          {description.substring(0, 200)}
        </div>
      </div>
    </div>
  );
};
