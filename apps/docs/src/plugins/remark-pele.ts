/**
 * Remark plugin that intercepts ```mermaid code blocks BEFORE Expressive Code
 * and replaces them with a <div class="pele-diagram not-content" data-pele-b64="...">
 * container so Pele (https://pele.run/) renders interactive SVG diagrams on the client.
 */
interface AstNode {
  type?: string;
  lang?: string | null;
  value?: string | null;
  children?: AstNode[];
}

export function remarkPele() {
  return (tree: unknown) => {
    function walk(node: AstNode): void {
      if (!node || !Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "code" && child.lang === "mermaid" && typeof child.value === "string") {
          const b64 = Buffer.from(child.value, "utf8").toString("base64");
          node.children[i] = {
            type: "html",
            value: `<div class="pele-diagram not-content" data-pele-b64="${b64}" role="region" aria-label="Architecture diagram"></div>`,
          };
        } else {
          walk(child);
        }
      }
    }
    walk(tree as AstNode);
  };
}
