// ============================================================
// Image utilities — client-side resize + compress for uploads.
// Used by the School Settings page to keep logos and banners
// small enough to live as data URLs in localStorage (≤ ~5MB
// total budget). No backend, no network round-trip.
// ============================================================

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ResizeOptions {
  /** Max dimension (width or height) in pixels. */
  maxDim: number;
  /** JPEG quality 0–1 (ignored for PNG). */
  quality: number;
  /** Output mime type. */
  mime: "image/jpeg" | "image/png";
  /** Hard byte ceiling — re-encodes at lower quality until it fits. */
  maxBytes: number;
  /** Optional fixed target size (square crop for logos). */
  square?: boolean;
}

const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5 MB — reject anything bigger.

/**
 * Load a File into an HTMLImageElement (decoded).
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error("Image is larger than 5 MB. Please choose a smaller file."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    img.src = url;
  });
}

/**
 * Draw a source image onto a canvas at the target dimensions, optionally
 * center-cropping to a square.
 */
function drawToCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  square?: boolean
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (square) {
    // Center-crop to a square, then draw at targetW × targetW.
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, targetW, targetH);
  } else {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }
  return canvas;
}

/**
 * Resize and compress an image File to a data URL, respecting a hard byte
 * ceiling by stepping down quality. Returns the processed image metadata.
 */
export async function resizeAndCompress(
  file: File,
  opts: ResizeOptions
): Promise<ProcessedImage> {
  const img = await loadImage(file);

  // Compute target dimensions (preserve aspect ratio unless square).
  let targetW: number;
  let targetH: number;
  if (opts.square) {
    const dim = Math.min(opts.maxDim, Math.max(img.naturalWidth, img.naturalHeight));
    targetW = dim;
    targetH = dim;
  } else {
    const scale = Math.min(1, opts.maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    targetW = Math.round(img.naturalWidth * scale);
    targetH = Math.round(img.naturalHeight * scale);
  }

  const canvas = drawToCanvas(img, targetW, targetH, opts.square);

  // Step quality down until we fit under maxBytes (floor at 0.4).
  let quality = opts.quality;
  let dataUrl = canvas.toDataURL(opts.mime, quality);
  // Estimate byte size of the data URL (minus the base64 prefix overhead).
  let bytes = Math.round((dataUrl.length - 23) * 0.75);

  while (bytes > opts.maxBytes && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL(opts.mime, quality);
    bytes = Math.round((dataUrl.length - 23) * 0.75);
  }

  return { dataUrl, width: targetW, height: targetH, bytes };
}

/** Human-readable byte size, e.g. "184 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
