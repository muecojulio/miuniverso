import { useRef, type PointerEvent } from "react";
import { isInteractiveTarget, lockGestureAxis, type GestureAxis } from "./gestures";

type SwipeOptions = {
  enabled?: boolean;
  threshold?: number;
  onStart?: () => void;
  onMove?: (dx: number) => void;
  onEnd?: (dx: number, durationMs: number) => void;
  onCancel?: () => void;
};

/**
 * Pointer events only observe an axis. `touch-action: pan-y pinch-zoom` on the
 * surface leaves vertical scrolling and pinch zoom to the browser. Capture
 * begins only after a horizontal lock; interactive descendants are excluded.
 */
export function useHorizontalSwipe(options: SwipeOptions = {}) {
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    axis: GestureAxis;
  } | null>(null);
  const latest = useRef(options);
  latest.current = options;

  function reset() {
    gesture.current = null;
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (
        latest.current.enabled === false ||
        !event.isPrimary ||
        event.pointerType === "mouse" ||
        event.button !== 0 ||
        isInteractiveTarget(event.target, event.currentTarget)
      ) {
        reset();
        return;
      }
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        axis: "pending",
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId || !event.isPrimary) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (current.axis === "pending") {
        current.axis = lockGestureAxis(dx, dy, latest.current.threshold ?? 10);
        if (current.axis === "horizontal") {
          latest.current.onStart?.();
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
      if (current.axis === "horizontal") latest.current.onMove?.(dx);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      const duration = Math.max(0, event.timeStamp - current.time);
      const horizontal = current.axis === "horizontal";
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      reset();
      if (horizontal && lockGestureAxis(dx, dy) === "horizontal") {
        latest.current.onEnd?.(dx, duration);
      } else {
        latest.current.onCancel?.();
      }
    },
    onPointerCancel() {
      if (gesture.current?.axis === "horizontal") latest.current.onCancel?.();
      reset();
    },
    onLostPointerCapture(event: PointerEvent<HTMLElement>) {
      // Touch has implicit capture on the original child. Its lostpointercapture
      // bubbles here just before our explicit capture; do not cancel that handoff.
      if (event.target !== event.currentTarget) return;
      if (gesture.current && gesture.current.id === event.pointerId) {
        latest.current.onCancel?.();
        reset();
      }
    },
  };
}
