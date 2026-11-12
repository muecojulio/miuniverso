/**
 * Security & privacy guardrails for Mi Universo.
 *
 * Enforces input sanitization, raster-only image validation (blocking SVG/HTML
 * script payloads), strict origin allowlists for Gradio media responses, safe
 * filename normalization, and tamper-resistant local allowance counters.
 */

const ALLOWED_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB raw upload ceiling
const MAX_DATA_URL_LENGTH = 4_500_000; // ~3.3 MB base64 ceiling
const RASTER_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;

// Control chars (excluding \n and \t) + Unicode bidi override spoofing ranges.
const UNSAFE_TEXT_CHARS_RE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Strip control characters and bidi overrides, normalize Unicode, and cap length
 * by code points so surrogate pairs are never split mid-character.
 */
export function sanitizeTextInput(raw: string, maxLength = 2400): string {
  const cleaned = raw.normalize("NFC").replace(UNSAFE_TEXT_CHARS_RE, "");
  const chars = Array.from(cleaned);
  return chars.length > maxLength ? chars.slice(0, maxLength).join("") : cleaned;
}

/**
 * Validate a user-selected image file before decoding it on canvas.
 * Explicitly rejects `image/svg+xml` and non-raster payloads to prevent embedded
 * script execution and decompression bombs.
 */
export function validatePhotoFile(file: Pick<File, "type" | "size" | "name">): void {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime === "image/svg+xml" || /\.svgz?$/i.test(file.name || "")) {
    throw new Error("Por seguridad no se admiten archivos SVG. Usa una foto JPG, PNG o WebP.");
  }
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) {
    throw new Error("Formato no admitido. Elige una foto en formato JPG, PNG o WebP.");
  }
  if (file.size <= 0) {
    throw new Error("El archivo de imagen está vacío.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("La foto supera el límite de 12 MB. Elige una imagen más ligera.");
  }
}

/**
 * Validate a base64 image data URL (e.g. returned from canvas or external portrait model).
 * Blocks `data:image/svg+xml`, `data:text/html`, and oversized buffers.
 */
export function sanitizeImageDataUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DATA_URL_LENGTH) {
    throw new Error("La imagen recibida excede el tamaño seguro permitido.");
  }
  if (!RASTER_DATA_URL_RE.test(trimmed)) {
    throw new Error("Formato de imagen no seguro o no válido.");
  }
  return trimmed;
}

function isAllowedHuggingFaceHost(hostname: string, expectedHost: string): boolean {
  const host = hostname.toLowerCase();
  if (host === expectedHost.toLowerCase()) return true;
  if (host === "huggingface.co") return true;
  if (host.endsWith(".hf.space") || host.endsWith(".huggingface.co")) return true;
  return false;
}

/**
 * Validate and resolve a media URL/path returned by a Gradio Space.
 * Prevents SSRF / malicious redirects to http://, private IPs, or arbitrary domains.
 */
export function validateGradioMediaUrl(candidate: string, spaceOrigin: string): string {
  const space = new URL(spaceOrigin);
  const raw = candidate.trim();
  if (!raw || raw.startsWith("//") || raw.includes("\\")) {
    throw new Error("Respuesta de medios bloqueada por validación de seguridad.");
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error("URL de video no válida.");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("Conexión insegura bloqueada (se requiere HTTPS).");
    }
    if (!isAllowedHuggingFaceHost(parsed.hostname, space.hostname)) {
      throw new Error("Origen de video externo no autorizado.");
    }
    return parsed.href;
  }

  // Relative file path returned by Gradio (e.g. "/tmp/gradio/abc/video.mp4").
  const normalizedPath = raw.replace(/^\/+/, "/");
  if (normalizedPath.split("/").some((segment) => segment === "..")) {
    throw new Error("Ruta de archivo externa no segura.");
  }
  return `${space.origin}/gradio_api/file=${raw}`;
}

/**
 * Build a safe download filename with no path traversal or shell/OS special characters.
 */
export function safeFilename(title: string, fallback = "mi-universo"): string {
  const slug = sanitizeTextInput(title, 80)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

const ALLOWANCE_PREFIX = "miuniverso-";

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Prune stale daily quota keys from previous days so localStorage stays clean.
 */
export function pruneStaleAllowanceKeys(storage: Pick<Storage, "length" | "key" | "removeItem">): void {
  const today = todayStamp();
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(ALLOWANCE_PREFIX) && !key.endsWith(today)) {
      stale.push(key);
    }
  }
  for (const key of stale) {
    storage.removeItem(key);
  }
}

export function readDailyAllowance(
  scope: "gratis" | "qwen" | "wan",
  max: number,
): { key: string; used: number; max: number; ok: boolean } {
  const key = `${ALLOWANCE_PREFIX}${scope}-${todayStamp()}`;
  if (typeof localStorage === "undefined") {
    return { key, used: 0, max, ok: true };
  }
  try {
    pruneStaleAllowanceKeys(localStorage);
    const raw = Number.parseInt(localStorage.getItem(key) ?? "0", 10);
    const used = Number.isFinite(raw) && raw >= 0 ? Math.min(raw, 999) : 0;
    return { key, used, max, ok: used < max };
  } catch {
    return { key, used: 0, max, ok: true };
  }
}

export function bumpDailyAllowance(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = Number.parseInt(localStorage.getItem(key) ?? "0", 10);
    const used = Number.isFinite(raw) && raw >= 0 ? raw : 0;
    localStorage.setItem(key, String(used + 1));
  } catch {
    // Ignore Safari private-mode / quota errors gracefully.
  }
}

export function clearDailyAllowances(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ALLOWANCE_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // Ignore storage errors.
  }
}
