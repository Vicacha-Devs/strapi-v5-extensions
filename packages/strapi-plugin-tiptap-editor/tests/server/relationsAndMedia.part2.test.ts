import dns from "node:dns";
import fs from "node:fs";
import { fetch as undiciFetch } from "undici";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("undici", async () => {
  const actual = await vi.importActual<typeof import("undici")>("undici");
  return {
    ...actual,
    fetch: vi.fn((...args: any[]) => (globalThis.fetch as any)(...args)),
  };
});

import bootstrap from "../../server/src/bootstrap";
import createMediaService, {
  isPrivateIpAddress,
  isSsrfSafeUrl,
  assertSafeResolvedHost,
  matchesMagicBytes,
} from "../../server/src/services/media";

describe("server/services/media (SSRF Protection & Metadata)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks localhost, private IPs, metadata IPs, IPv4-mapped/translated IPv6, disallowed ports, CGNAT, 0.0.0.0, trailing dots, and non-http protocols", () => {
    expect(isSsrfSafeUrl("http://localhost:1337/admin")).toBe(false);
    expect(isSsrfSafeUrl("http://localhost./admin")).toBe(false);
    expect(isSsrfSafeUrl("http://127.0.0.1:8080/secret")).toBe(false);
    expect(isSsrfSafeUrl("http://0.0.0.0:1337/admin")).toBe(false);
    expect(isSsrfSafeUrl("http://100.64.0.1/cgnat")).toBe(false);
    expect(isSsrfSafeUrl("http://[::ffff:127.0.0.1]:1337/")).toBe(false);
    expect(isSsrfSafeUrl("http://[::ffff:0:127.0.0.1]/")).toBe(false);
    expect(isSsrfSafeUrl("http://[0:0:0:0:0:ffff:7f00:1]/")).toBe(false);
    expect(isSsrfSafeUrl("http://2130706433/")).toBe(false);
    expect(isSsrfSafeUrl("http://169.254.169.254/latest/meta-data")).toBe(
      false
    );
    expect(isSsrfSafeUrl("http://10.0.0.1/internal")).toBe(false);
    expect(isSsrfSafeUrl("http://192.168.1.50/router")).toBe(false);
    expect(isSsrfSafeUrl("http://172.16.0.5/cluster")).toBe(false);
    expect(isSsrfSafeUrl("http://strapi.io:6379/redis")).toBe(false);
    expect(isSsrfSafeUrl("http://strapi.io:22/ssh")).toBe(false);
    expect(isSsrfSafeUrl("https://strapi.io:8443/assets/logo.png")).toBe(true);
    expect(isSsrfSafeUrl("http://strapi.io:8080/assets/logo.png")).toBe(true);
    expect(isSsrfSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSsrfSafeUrl("https://user:pass@example.com/image.jpg")).toBe(
      false
    );
    expect(isSsrfSafeUrl("https://strapi.io/assets/logo.png")).toBe(true);
  });

  it("enforces IPv6 BlockList boundaries for special-use CIDRs and fails closed for non-IPv6 values", () => {
    // ::/96 (IPv4-compatible, loopback, unspecified) and ::ffff:0:0:0/96 (SIIT)
    expect(isPrivateIpAddress("::")).toBe(true);
    expect(isPrivateIpAddress("::1")).toBe(true);
    expect(isPrivateIpAddress("::7f00:1")).toBe(true);
    expect(isPrivateIpAddress("::ffff:ffff")).toBe(true);
    expect(isPrivateIpAddress("::ffff:0:127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("::ffff:0:7f00:1")).toBe(true);

    // 100::/64 (RFC 6666 discard) and ISATAP (:5efe:...)
    expect(isPrivateIpAddress("100::1")).toBe(true);
    expect(isPrivateIpAddress("2606:4700::5efe:127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("2606:4700::5efe:7f00:1")).toBe(true);

    // 64:ff9b::/96 and 64:ff9b:1::/48 (NAT64)
    expect(isPrivateIpAddress("64:ff9b::a00:1")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b::ffff:ffff")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b:1::1")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b:1:ffff:ffff:ffff:ffff:ffff")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b:2::1")).toBe(false);

    // 2001::/23 (IANA special-purpose / Teredo / benchmarking 2001:2::/48) and 2001:db8::/32 (documentation)
    expect(isPrivateIpAddress("2001::1")).toBe(true);
    expect(isPrivateIpAddress("2001:2::1")).toBe(true);
    expect(isPrivateIpAddress("2001:0:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      true
    );
    expect(isPrivateIpAddress("2001:db8::1")).toBe(true);
    expect(isPrivateIpAddress("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      true
    );
    expect(isPrivateIpAddress("2001:4860:4860::8888")).toBe(false);

    // 2002::/16 (6to4)
    expect(isPrivateIpAddress("2002::1")).toBe(true);
    expect(isPrivateIpAddress("2002:7f00:1::")).toBe(true);
    expect(isPrivateIpAddress("2003::1")).toBe(false);

    // fc00::/7 (unique-local), fe80::/10 (link-local), ff00::/8 (multicast)
    expect(isPrivateIpAddress("fc00::1")).toBe(true);
    expect(isPrivateIpAddress("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      true
    );
    expect(isPrivateIpAddress("fe7f:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      false
    );
    expect(isPrivateIpAddress("fe80::1")).toBe(true);
    expect(isPrivateIpAddress("febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      true
    );
    expect(isPrivateIpAddress("fec0::1")).toBe(false);
    expect(isPrivateIpAddress("ff00::1")).toBe(true);
    expect(isPrivateIpAddress("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(
      true
    );

    // Public IPv4-mapped IPv6 and public IPv6
    expect(isPrivateIpAddress("::ffff:93.184.216.34")).toBe(false);
    expect(isPrivateIpAddress("2606:4700:4700::1111")).toBe(false);

    // Invalid IP string fails closed
    expect(isPrivateIpAddress("not-an-ip")).toBe(true);
  });

  it("extracts HTML title and OpenGraph meta tags accurately when non-ASCII characters like İ precede tags", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as any);

    const html = [
      "<!doctype html><html><head>",
      "<!-- İstanbul İİİ -->",
      "<TITLE>İstanbul Rehberi</TITLE>",
      '<META property="og:description" content="İstanbul — Boğaziçi" />',
      "</head><body></body></html>",
    ].join("");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => html,
    } as unknown as Response);

    const service = createMediaService({ strapi: {} as any });
    const preview = await service.getLinkPreview(
      "https://example.com/istanbul"
    );
    expect(preview.title).toBe("İstanbul Rehberi");
    expect(preview.description).toBe("İstanbul — Boğaziçi");
  });

  it("blocks getLinkPreview 301 redirects to private or metadata endpoints before following the redirect", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as any);

    const cancelSpy = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.mocked(undiciFetch);
    fetchMock.mockClear();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 301,
      headers: new Headers({
        location: "http://169.254.169.254/latest/meta-data",
      }),
      body: { cancel: cancelSpy },
    } as unknown as Response);

    const service = createMediaService({ strapi: {} as any });
    await expect(
      service.getLinkPreview("https://example.com/redirect-ssrf")
    ).rejects.toThrow("Remote preview URL redirects. Provide the final URL.");

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example.com/redirect-ssrf"
    );
    expect(
      (fetchMock.mock.calls[0]?.[1] as { redirect?: string })?.redirect
    ).toBe("manual");
  });

  it("fails closed on DNS lookup errors and blocks private resolved IPs", async () => {
    vi.spyOn(dns.promises, "lookup").mockRejectedValueOnce(
      new Error("ENOTFOUND")
    );
    await expect(
      assertSafeResolvedHost("nonexistent.example.invalid")
    ).rejects.toThrow("Failed to resolve URL host");

    vi.spyOn(dns.promises, "lookup").mockResolvedValueOnce([
      { address: "10.0.0.42", family: 4 },
    ] as any);
    await expect(assertSafeResolvedHost("rebind.example.com")).rejects.toThrow(
      "disallowed private"
    );
  });

  it("validates uploadByUrl, downloads bounded bytes, and persists through Strapi Upload service", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
    ] as any);

    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const mp4Bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.4\n"));
    const wavBytes = new Uint8Array(
      Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt ")
    );

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any) => {
      const targetUrl = String(input);
      const bytes = targetUrl.endsWith(".mp4")
        ? mp4Bytes
        : targetUrl.endsWith(".pdf")
          ? pdfBytes
          : jpegBytes;
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-length"
              ? String(bytes.byteLength)
              : null,
        },
        arrayBuffer: async () => bytes.buffer,
      } as unknown as Response;
    });

    const capturedUploads: any[] = [];
    const mockUpload = vi.fn(async (payload: any) => {
      expect(fs.existsSync(payload.files.filepath)).toBe(true);
      capturedUploads.push(payload);
      return [
        {
          id: 42,
          documentId: "asset-doc-42",
          name: payload.data.fileInfo.name,
          url: `/uploads/${payload.data.fileInfo.name}`,
          mime: payload.files.mimetype,
          size: payload.files.size,
          alternativeText: payload.data.fileInfo.alternativeText,
        },
      ];
    });

    const mockStrapi = {
      plugin: vi.fn((name: string) =>
        name === "upload"
          ? {
              service: vi.fn((svc: string) =>
                svc === "upload" ? { upload: mockUpload } : null
              ),
            }
          : null
      ),
    } as any;

    const service = createMediaService({ strapi: mockStrapi });
    await expect(
      service.uploadByUrl("http://127.0.0.1/test.jpg")
    ).rejects.toThrow("SSRF safety validation");

    // Rejects SVG / active content extensions
    await expect(
      service.uploadByUrl("https://cdn.example.com/vector.svg")
    ).rejects.toThrow("Unsupported or unsafe remote media file type");

    const asset = await service.uploadByUrl(
      "https://cdn.example.com/photos/banner.jpg",
      "Hero Banner"
    );
    const call = vi.mocked(undiciFetch).mock.calls.at(-1)!;
    expect((call[1] as any).dispatcher).toBeDefined();
    expect((call[1] as any).redirect).toBe("manual");
    expect(asset.id).toBe(42);
    expect(asset.documentId).toBe("asset-doc-42");
    expect(asset.name).toBe("banner.jpg");
    expect(asset.url).toBe("/uploads/banner.jpg");
    expect(asset.alternativeText).toBe("Hero Banner");
    expect(asset.mime).toBe("image/jpeg");
    expect(fs.existsSync(capturedUploads[0].files.filepath)).toBe(false);

    const videoAsset = await service.uploadByUrl(
      "https://cdn.example.com/media/clip.mp4"
    );
    expect(videoAsset.mime).toBe("video/mp4");

    const pdfAsset = await service.uploadByUrl(
      "https://cdn.example.com/docs/report.pdf"
    );
    expect(pdfAsset.mime).toBe("application/pdf");

    // Accepts known MIME aliases (e.g. audio/x-wav for .wav) while storing canonical inferredMime
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type"
            ? "audio/x-wav"
            : name.toLowerCase() === "content-length"
              ? String(wavBytes.byteLength)
              : null,
      },
      arrayBuffer: async () => wavBytes.buffer,
    } as unknown as Response);
    const wavAsset = await service.uploadByUrl(
      "https://cdn.example.com/audio/clip.wav"
    );
    expect(wavAsset.mime).toBe("audio/wav");

    // Rejects mismatched Content-Type header (e.g. text/html served for .jpg)
    const cancelMismatchMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "text/html" : null,
      },
      body: { cancel: cancelMismatchMock },
    } as unknown as Response);
    await expect(
      service.uploadByUrl("https://cdn.example.com/photos/spoofed.jpg")
    ).rejects.toThrow("does not match expected type");
    expect(cancelMismatchMock).toHaveBeenCalledTimes(1);

    // Cancels response body and throws clear error on 3xx redirects
    const cancelMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 301,
      body: { cancel: cancelMock },
    } as unknown as Response);
    await expect(
      service.uploadByUrl("https://cdn.example.com/photos/redirect.jpg")
    ).rejects.toThrow("Remote media URL redirects. Provide the final URL.");
    expect(cancelMock).toHaveBeenCalledTimes(1);

    // Propagates failure when Upload service is unavailable
    const brokenService = createMediaService({ strapi: {} as any });
    await expect(
      brokenService.uploadByUrl("https://cdn.example.com/photos/banner.jpg")
    ).rejects.toThrow("Strapi upload service is unavailable");
  });

  it("rejects disguised HTML/JS payloads failing magic-byte verification and sanitizes dotfiles and >255-char filenames", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
    ] as any);

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const disguisedHtmlBytes = new Uint8Array(
      Buffer.from("<!doctype html><script>alert(document.cookie)</script>")
    );

    const mockUpload = vi.fn(async (payload: any) => [
      {
        id: 99,
        documentId: "asset-doc-99",
        name: payload.data.fileInfo.name,
        url: `/uploads/${payload.data.fileInfo.name}`,
        mime: payload.files.mimetype,
        size: payload.files.size,
        alternativeText: payload.data.fileInfo.alternativeText,
      },
    ]);

    const service = createMediaService({
      strapi: {
        plugin: () => ({ service: () => ({ upload: mockUpload }) }),
      } as any,
    });

    // HTML/JS disguised as .pdf with application/octet-stream rejected by magic-byte check
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type"
            ? "application/octet-stream"
            : null,
      },
      arrayBuffer: async () => disguisedHtmlBytes.buffer,
    } as unknown as Response);
    await expect(
      service.uploadByUrl("https://cdn.example.com/docs/disguised.pdf")
    ).rejects.toThrow(
      "Remote media content does not match expected file signature"
    );
    expect(mockUpload).not.toHaveBeenCalled();

    // Bare .png dotfile rejected (no valid stem + extension after stripping leading dots)
    await expect(
      service.uploadByUrl("https://cdn.example.com/.png")
    ).rejects.toThrow("Unsupported or unsafe remote media file type");

    // Leading dot stripped on .hidden.png and >255-char filename + altText bounded
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: true,
          status: 200,
          headers: { get: () => "image/png" },
          arrayBuffer: async () => pngBytes.buffer,
        }) as unknown as Response
    );

    const dotPrefixedAsset = await service.uploadByUrl(
      "https://cdn.example.com/.hidden.png"
    );
    expect(dotPrefixedAsset.name).toBe("hidden.png");

    const emptyStemAsset = await service.uploadByUrl(
      "https://cdn.example.com/---.png"
    );
    expect(emptyStemAsset.name).toBe("remote-media.png");

    const overlongStem = "a".repeat(300);
    const overlongAlt = "b".repeat(400);
    const boundedAsset = await service.uploadByUrl(
      `https://cdn.example.com/${overlongStem}.png`,
      overlongAlt
    );
    expect(boundedAsset.name.length).toBeLessThanOrEqual(200);
    expect(boundedAsset.name).toBe(`${"a".repeat(180)}.png`);
    expect(boundedAsset.alternativeText?.length).toBe(255);

    expect(matchesMagicBytes(Buffer.from(pngBytes), "image/png")).toBe(true);
    expect(
      matchesMagicBytes(Buffer.from(disguisedHtmlBytes), "application/pdf")
    ).toBe(false);
  });
});

describe("server/bootstrap", () => {
  it("registers RBAC permissions without seeding default settings in core-store or mutating schema components", async () => {
    const mockSet = vi.fn();
    const mockRegisterMany = vi.fn();
    const mockCreateComponent = vi.fn();
    const mockStrapi = {
      admin: {
        services: {
          permission: {
            actionProvider: {
              registerMany: mockRegisterMany,
            },
          },
        },
      },
      store: vi.fn(() => ({
        get: vi.fn(async () => null),
        set: mockSet,
      })),
      components: {},
      plugin: vi.fn(() => ({
        service: vi.fn(() => ({
          createComponent: mockCreateComponent,
        })),
      })),
      log: { info: vi.fn(), warn: vi.fn() },
    } as any;

    await bootstrap({ strapi: mockStrapi });
    expect(mockRegisterMany).toHaveBeenCalledTimes(1);
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockCreateComponent).not.toHaveBeenCalled();

    const mockErrorLog = vi.fn();
    const failingStrapi = {
      admin: {
        services: {
          permission: {
            actionProvider: {
              registerMany: vi.fn(async () => {
                throw new Error("RBAC registration failed");
              }),
            },
          },
        },
      },
      log: { error: mockErrorLog },
    } as any;
    await expect(bootstrap({ strapi: failingStrapi })).rejects.toThrow(
      "RBAC registration failed"
    );
    expect(mockErrorLog).toHaveBeenCalledTimes(1);
  });
});
