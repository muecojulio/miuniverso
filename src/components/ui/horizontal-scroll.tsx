import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/ui/use-media-query";
import { centerInLane, useScrollEdges } from "@/lib/ui/use-scroll-edges";

type Props = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  label: string;
  children: React.ReactNode;
  as?: "div" | "ul" | "ol";
  selectionKey?: string | number;
  centerSelection?: boolean;
  hint?: boolean;
};

/** Native scroll/snap/panning; edges are measurements, not permanent decoration. */
export function HorizontalScroll({
  label,
  children,
  as: Tag = "div",
  className,
  selectionKey,
  centerSelection = true,
  hint = false,
  ...props
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const edges = useScrollEdges(ref);
  const reduced = useReducedMotion();
  const previousSelection = useRef<string | number | undefined>(undefined);
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const draggedAt = useRef(-Infinity);

  useLayoutEffect(() => {
    const lane = ref.current;
    if (!lane || selectionKey === undefined) return;
    const changed = previousSelection.current !== selectionKey;
    previousSelection.current = selectionKey;
    if (!centerSelection || !edges.overflowing) return;
    const selected = lane.querySelector<HTMLElement>(
      '[data-selected="true"], [aria-selected="true"], [aria-pressed="true"], [aria-current="step"]',
    );
    if (selected) centerInLane(lane, selected, changed && !reduced ? "smooth" : "instant");
  }, [selectionKey, centerSelection, reduced, edges.overflowing]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget || !edges.overflowing)
      return;
    const lane = ref.current;
    if (!lane) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const left =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? lane.scrollWidth
            : lane.scrollLeft + (event.key === "ArrowLeft" ? -1 : 1) * lane.clientWidth * 0.8;
      lane.scrollTo({ left, behavior: reduced ? "instant" : "smooth" });
    }
  }

  function onPointerDownCapture(event: PointerEvent<HTMLElement>) {
    pointer.current = { x: event.clientX, y: event.clientY, moved: false };
    props.onPointerDownCapture?.(event);
  }
  function onPointerMoveCapture(event: PointerEvent<HTMLElement>) {
    const start = pointer.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10)
      start.moved = true;
    props.onPointerMoveCapture?.(event);
  }
  function finishPointer() {
    if (pointer.current?.moved) draggedAt.current = performance.now();
    pointer.current = null;
  }

  const {
    onKeyDown: _key,
    onPointerDownCapture: _down,
    onPointerMoveCapture: _move,
    ...rest
  } = props;
  return (
    <div
      className="horizontal-shell"
      data-overflow-start={edges.start}
      data-overflow-end={edges.end}
    >
      <Tag
        {...rest}
        ref={(node: HTMLElement | null) => {
          ref.current = node;
        }}
        role={rest.role ?? (Tag === "div" ? "group" : "list")}
        aria-label={label}
        tabIndex={edges.overflowing ? 0 : -1}
        data-horizontal-scroll=""
        className={cn("horizontal-scroll", className)}
        onKeyDown={onKeyDown}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={finishPointer}
        onPointerCancelCapture={finishPointer}
        onClickCapture={(event) => {
          // A drag/momentum scroll is not a chip/card activation. Keyboard stays intact.
          if (event.detail !== 0 && performance.now() - draggedAt.current < 350) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {children}
      </Tag>
      <span className="scroll-edge scroll-edge-start" aria-hidden="true">
        <ChevronLeft size={15} />
      </span>
      <span className="scroll-edge scroll-edge-end" aria-hidden="true">
        <ChevronRight size={15} />
      </span>
      {hint && edges.overflowing ? (
        <span className="scroll-hint" aria-hidden="true">
          <MoveHorizontal size={12} /> Desliza
        </span>
      ) : null}
    </div>
  );
}
