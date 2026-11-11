/**
 * Rehype plugin that prefixes root-relative links and images ("/guides/x",
 * "/screenshots/y.png") with the configured Astro `base`, so the same content
 * works on a custom domain (base "/") and on a GitHub Pages project URL
 * (base "/strapi-v5-extensions"). It is a no-op when the base is "/".
 */
interface HastNode {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const LINK_ATTRIBUTES: Record<string, string> = { a: "href", img: "src" };

export function normalizeBase(base: string | undefined): string {
  const trimmed = (base ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `/${trimmed}` : "";
}

export function rehypeBaseLinks(options: { base?: string } = {}) {
  const base = normalizeBase(options.base);
  return (tree: HastNode) => {
    if (!base) return;
    const walk = (node: HastNode): void => {
      const attribute = node.tagName
        ? LINK_ATTRIBUTES[node.tagName]
        : undefined;
      const value = attribute ? node.properties?.[attribute] : undefined;
      if (
        attribute &&
        node.properties &&
        typeof value === "string" &&
        value.startsWith("/") &&
        !value.startsWith("//") &&
        value !== base &&
        !value.startsWith(`${base}/`)
      ) {
        node.properties[attribute] = `${base}${value}`;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
