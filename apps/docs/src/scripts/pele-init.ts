export interface PeleMountOptions {
  zoom?: boolean | "auto";
  responsive?: boolean;
  theme?: Record<string, string>;
  sanitize?: (svgMarkup: string) => Element;
}

export interface PeleGlobalApi {
  render: (input: string, options?: PeleMountOptions) => string;
  mount: (
    element: Element,
    input: string,
    options?: PeleMountOptions
  ) => { update: (nextInput: string) => void; destroy: () => void };
}

declare global {
  interface Window {
    pele?: PeleGlobalApi;
  }
}

export function decodeUtf8Base64(b64: string): string {
  try {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

export function sanitizeSvgToNode(svgMarkup: string): Element {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  return doc.documentElement;
}

export function mountAllPeleDiagrams(): void {
  const peleApi = window.pele;
  if (!peleApi || typeof peleApi.mount !== "function") return;

  const containers = document.querySelectorAll(
    ".pele-diagram[data-pele-b64]:not([data-pele-mounted])"
  );

  for (const container of containers) {
    const encoded = container.getAttribute("data-pele-b64") ?? "";
    const source = decodeUtf8Base64(encoded);
    if (!source) continue;

    container.setAttribute("data-pele-mounted", "true");
    peleApi.mount(container, source, {
      zoom: "auto",
      responsive: true,
      sanitize: sanitizeSvgToNode,
    });
  }
}

export function initPeleDiagrams(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAllPeleDiagrams);
  } else {
    mountAllPeleDiagrams();
  }
  document.addEventListener("astro:page-load", mountAllPeleDiagrams);
}
