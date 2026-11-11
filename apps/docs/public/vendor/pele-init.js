(function initPeleDiagrams() {
  function decodeUtf8Base64(b64) {
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

  function sanitizeSvgToNode(svgMarkup) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    return doc.documentElement;
  }

  function mountAllDiagrams() {
    const peleApi = window.pele;
    if (!peleApi || typeof peleApi.mount !== "function") return;

    const containers = document.querySelectorAll(
      ".pele-diagram[data-pele-b64]:not([data-pele-mounted])"
    );

    for (const container of containers) {
      const encoded = container.getAttribute("data-pele-b64") || "";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAllDiagrams);
  } else {
    mountAllDiagrams();
  }

  document.addEventListener("astro:page-load", mountAllDiagrams);
})();
