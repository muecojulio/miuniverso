import { Ellipsis, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { revealOffset, shouldOpenReveal } from "@/lib/ui/gestures";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { useDesktopActions } from "@/lib/ui/use-media-query";

/** Swipe is an enhancement: a named toggle, keyboard and desktop actions remain. */
export function SwipeActions({
  label,
  actions,
  children,
  className,
}: {
  label: string;
  actions: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(144);
  const wasOpen = useRef(false);
  const draggedAt = useRef(-Infinity);
  const desktop = useDesktopActions();

  useEffect(() => {
    const panel = actionsRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => setWidth(panel.scrollWidth || 144));
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  function restore() {
    setDragging(false);
    rootRef.current?.style.removeProperty("--swipe-x");
  }
  const handlers = useHorizontalSwipe({
    enabled: !desktop,
    onStart() {
      wasOpen.current = open;
      setDragging(true);
    },
    onMove(dx) {
      rootRef.current?.style.setProperty(
        "--swipe-x",
        `${revealOffset(dx, width, wasOpen.current)}px`,
      );
    },
    onEnd(dx, duration) {
      draggedAt.current = performance.now();
      setOpen(shouldOpenReveal(dx, duration, width, wasOpen.current));
      restore();
    },
    onCancel: restore,
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) toggleRef.current?.focus({ preventScroll: true });
    else
      requestAnimationFrame(() =>
        actionsRef.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true }),
      );
  }

  return (
    <div
      ref={rootRef}
      data-swipe-card=""
      data-open={open}
      className={cn("swipe-card", dragging && "swipe-card-dragging", className)}
      style={{ "--actions-width": `${width}px` } as React.CSSProperties}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          toggleRef.current?.focus({ preventScroll: true });
        }
      }}
      onClickCapture={(event) => {
        if (event.detail !== 0 && performance.now() - draggedAt.current < 350) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div
        ref={actionsRef}
        id={`${id}-actions`}
        className="swipe-actions"
        role="group"
        aria-label={`Acciones de ${label}`}
        inert={!open || desktop}
        aria-hidden={!open || desktop}
      >
        {actions}
      </div>
      <div className="swipe-card-surface" {...handlers}>
        {children}
        <div
          className="swipe-actions-desktop"
          inert={!desktop}
          aria-hidden={!desktop}
          role="group"
          aria-label={`Acciones de ${label}`}
        >
          {actions}
        </div>
      </div>
      {!desktop ? (
        <button
          ref={toggleRef}
          type="button"
          className="control control-ghost control-icon swipe-toggle"
          aria-label={`${open ? "Cerrar" : "Abrir"} acciones de ${label}`}
          aria-expanded={open}
          aria-controls={`${id}-actions`}
          onClick={toggle}
        >
          {open ? <X size={18} aria-hidden="true" /> : <Ellipsis size={19} aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}
