/** Shared, browser-independent gesture decisions. Never cancel a vertical pan. */
export const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "canvas",
  "video",
  "audio",
  "iframe",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='switch']",
  "[role='slider']",
  "[role='combobox']",
  "[role='listbox']",
  "[role='option']",
  "[role='menuitem']",
  "[data-no-swipe]",
  "[data-horizontal-scroll]",
  "[data-swipe-card]",
].join(",");

export function isInteractiveTarget(target: EventTarget | null, boundary?: Element): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== boundary) {
    if (element.matches(INTERACTIVE_SELECTOR)) return true;
    element = element.parentElement;
  }
  return false;
}

export type GestureAxis = "pending" | "horizontal" | "vertical";

export function lockGestureAxis(dx: number, dy: number, threshold = 10): GestureAxis {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < threshold) return "pending";
  if (x > y * 1.2) return "horizontal";
  if (y > x * 1.2) return "vertical";
  return "pending";
}

/** A deliberate swipe: clearly horizontal, long enough, or short and fast. */
export function swipeDirection(
  dx: number,
  dy: number,
  durationMs: number,
  { distance = 56, flickDistance = 24, flickSpeed = 0.45 } = {},
): -1 | 0 | 1 {
  const x = Math.abs(dx);
  if (lockGestureAxis(dx, dy) !== "horizontal") return 0;
  const fast =
    durationMs > 0 && durationMs <= 280 && x >= flickDistance && x / durationMs >= flickSpeed;
  if (x < distance && !fast) return 0;
  return dx < 0 ? 1 : -1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function revealOffset(dx: number, width: number, wasOpen: boolean): number {
  return clamp((wasOpen ? -width : 0) + dx, -width, 0);
}

export function shouldOpenReveal(
  dx: number,
  durationMs: number,
  width: number,
  wasOpen: boolean,
): boolean {
  const speed = Math.abs(dx) / Math.max(1, durationMs);
  if (durationMs <= 280 && Math.abs(dx) >= 20 && speed >= 0.45) return dx < 0;
  return wasOpen ? dx < width * 0.35 : -dx > width * 0.35;
}

export function nextRovingIndex(
  key: string,
  current: number,
  count: number,
  vertical = false,
): number | null {
  if (!count) return null;
  const previous = vertical ? "ArrowUp" : "ArrowLeft";
  const next = vertical ? "ArrowDown" : "ArrowRight";
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === previous) return (current - 1 + count) % count;
  if (key === next) return (current + 1) % count;
  return null;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim();
}
