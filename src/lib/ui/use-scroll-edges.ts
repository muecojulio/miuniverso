import { useEffect, useState, type RefObject } from "react";

export type ScrollEdges = { start: boolean; end: boolean; overflowing: boolean };
const EMPTY: ScrollEdges = { start: false, end: false, overflowing: false };

/** Observe real overflow, including async fonts, filtering and responsive grids. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(EMPTY);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      const max = element.scrollWidth - element.clientWidth;
      const next = {
        start: element.scrollLeft > 2,
        end: max > 2 && element.scrollLeft < max - 2,
        overflowing: max > 2,
      };
      setEdges((old) =>
        old.start === next.start && old.end === next.end && old.overflowing === next.overflowing
          ? old
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    for (const child of element.children) resize.observe(child);
    const mutation = new MutationObserver(schedule);
    mutation.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "aria-pressed", "aria-current", "data-selected"],
    });
    element.addEventListener("scroll", schedule, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", schedule);
    };
  }, [ref]);
  return edges;
}

/** Scroll only the lane, never the page (unlike scrollIntoView). */
export function centerInLane(
  lane: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior = "smooth",
  center = true,
): void {
  const parent = lane.getBoundingClientRect();
  const child = item.getBoundingClientRect();
  const offset = child.left - parent.left + lane.scrollLeft;
  const left = center
    ? offset - (lane.clientWidth - child.width) / 2
    : child.left < parent.left + 12
      ? offset - 12
      : child.right > parent.right - 12
        ? offset - lane.clientWidth + child.width + 12
        : lane.scrollLeft;
  lane.scrollTo({ left: Math.max(0, left), behavior });
}
