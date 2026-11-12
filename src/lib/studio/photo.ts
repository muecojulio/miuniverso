import { LruCache, onStudioCacheCleared } from "@/lib/studio/db-indexed";
import { sanitizeImageDataUrl, validatePhotoFile } from "@/lib/studio/security";

const decodedImageCache = new LruCache<string, Promise<HTMLImageElement>>(36);
onStudioCacheCleared(() => {
  decodedImageCache.clear();
});

export async function compressPhoto(file: File): Promise<string> {
  validatePhotoFile(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 16 || bitmap.height < 16) {
      throw new Error("La imagen es demasiado pequeña. Usa una foto clara de frente.");
    }
    const max = 640;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo leer la foto.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return sanitizeImageDataUrl(canvas.toDataURL("image/jpeg", 0.84));
  } finally {
    bitmap.close();
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const canMemoize = src.startsWith("data:image/") && src.length < 4_500_000;
  if (canMemoize) {
    const cached = decodedImageCache.get(src);
    if (cached) return cached;
  }
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (canMemoize) decodedImageCache.delete(src);
      reject(new Error("No se pudo abrir la imagen."));
    };
    img.src = src;
  });
  if (canMemoize) decodedImageCache.set(src, pending);
  return pending;
}
