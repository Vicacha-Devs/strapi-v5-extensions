export type AspectRatioPreset = "free" | "16:9" | "4:3" | "1:1";

export interface ImageEditorSavePayload {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  assetId?: number | null;
  documentId?: string | null;
}

export interface ImageEditorModalProps {
  open: boolean;
  src: string;
  initialAlt?: string;
  initialCaption?: string;
  onClose: () => void;
  onSave: (payload: ImageEditorSavePayload) => void;
}

export const ASPECT_RATIO_VALUES: Record<AspectRatioPreset, number | null> = {
  "free": null,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
};

/**
 * Renders the transformations onto a canvas (either preview or full-resolution export).
 */
export function renderTransformedImageToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  options: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    zoom: number;
    aspectPreset: AspectRatioPreset;
    maxDimension?: number;
  }
): { width: number; height: number } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 0, height: 0 };

  const isRotated90 = Math.abs(options.rotation % 180) === 90;
  const baseW = isRotated90
    ? img.naturalHeight || 400
    : img.naturalWidth || 600;
  const baseH = isRotated90
    ? img.naturalWidth || 600
    : img.naturalHeight || 400;

  const ratio = ASPECT_RATIO_VALUES[options.aspectPreset];
  let targetW = baseW;
  let targetH = baseH;

  if (ratio) {
    if (baseW / baseH > ratio) {
      targetW = Math.round(baseH * ratio);
    } else {
      targetH = Math.round(baseW / ratio);
    }
  }

  const scale = options.maxDimension
    ? Math.min(options.maxDimension / Math.max(targetW, targetH, 1), 1)
    : 1;
  canvas.width = Math.max(Math.round(targetW * scale), 1);
  canvas.height = Math.max(Math.round(targetH * scale), 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(
    options.flipH ? -options.zoom : options.zoom,
    options.flipV ? -options.zoom : options.zoom
  );
  ctx.rotate((options.rotation * Math.PI) / 180);

  const drawW = (img.naturalWidth || 600) * scale;
  const drawH = (img.naturalHeight || 400) * scale;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return { width: Math.round(targetW), height: Math.round(targetH) };
}

/**
 * Converts a canvas to a PNG Blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
    } else {
      resolve(null);
    }
  });
}
