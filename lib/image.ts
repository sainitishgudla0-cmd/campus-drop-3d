/**
 * Client-side image preparation.
 * Re-encoding through a canvas drops all embedded metadata (EXIF, GPS location,
 * device info) so we upload only the pixels that are needed — nothing else.
 */
export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function reencodeImage(file: Blob, { maxSide = 2000, type = "image/jpeg", quality = 0.88 } = {}): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn’t process this image.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  if (!blob) throw new Error("Your browser couldn’t process this image.");
  return { blob, width: w, height: h };
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* fall back to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("This file couldn’t be read as an image. Try a JPG or PNG photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function validateImageFile(file: File, accepted: readonly string[], maxBytes: number): string {
  if (!accepted.includes(file.type)) {
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return "HEIC photos aren’t supported yet. Please export it as JPG or PNG (most phones offer “Most compatible”).";
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (file.size > maxBytes) return `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${Math.round(maxBytes / 1048576)} MB.`;
  if (file.size < 10 * 1024) return "That image looks too small to read. Please upload a clearer photo.";
  return "";
}
