import { Link, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { nextRovingIndex } from "@/lib/ui/gestures";
import { useReducedMotion } from "@/lib/ui/use-media-query";
import { centerInLane, useScrollEdges } from "@/lib/ui/use-scroll-edges";

export type TabItem = {
  id: string;
  label: string;
  to?: string;
  icon?: LucideIcon;
  badge?: number;
};

/** Route tabs keep real link semantics (including modifier-click/new tab). */
export function Tabs({
  items,
  value,
  onChange,
  panelId,
  label,
  className,
  idPrefix,
}: {
  items: readonly TabItem[];
  value: string;
  onChange?: (id: string) => void;
  panelId?: string;
  label: string;
  className?: string;
  idPrefix?: string;
}) {
  const generatedId = useId();
  const id = idPrefix ?? generatedId;
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const edges = useScrollEdges(ref);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const selectedIndex = items.findIndex((item) => item.id === value);
  const isTabs = Boolean(panelId);

  useLayoutEffect(() => {
    const lane = ref.current;
    if (!lane) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const active = lane.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) {
        setIndicator((old) => ({ ...old, ready: false }));
        return;
      }
      const left =
        active.getBoundingClientRect().left - lane.getBoundingClientRect().left + lane.scrollLeft;
      setIndicator({ left, width: active.offsetWidth, ready: true });
      if (lane.scrollWidth > lane.clientWidth + 2) {
        centerInLane(lane, active, reduced ? "instant" : "smooth");
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(lane);
    for (const child of lane.children) observer.observe(child);
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [value, reduced]);

  function select(item: TabItem, focus = false) {
    if (focus) ref.current?.querySelector<HTMLElement>(`[data-tab-id="${item.id}"]`)?.focus();
    if (item.id === value) return;
    if (item.to) {
      const direction =
        items.findIndex((entry) => entry.id === item.id) > selectedIndex ? "forward" : "back";
      void navigate({
        to: item.to,
        viewTransition: reduced ? false : { types: [`panel-${direction}`] },
      }).catch(() => {
        // A rapid second keypress can skip the previous native view transition.
        // Navigation itself remains valid; a skipped animation is not an app error.
      });
    }
    onChange?.(item.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const next = nextRovingIndex(event.key, index, items.length);
    if (next === null) return;
    event.preventDefault();
    select(items[next]!, true);
  }

  return (
    <div
      className="horizontal-shell"
      data-overflow-start={edges.start}
      data-overflow-end={edges.end}
    >
      <div
        ref={ref}
        role={isTabs ? "tablist" : undefined}
        aria-label={isTabs ? label : undefined}
        data-horizontal-scroll=""
        className={cn("tab-list horizontal-scroll", className)}
      >
        <span
          className="tab-indicator"
          aria-hidden="true"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {items.map((item, index) => {
          const selected = item.id === value;
          const Icon = item.icon;
          const shared = {
            id: `${id}-tab-${index}`,
            role: isTabs ? ("tab" as const) : undefined,
            "aria-selected": isTabs ? selected : undefined,
            "aria-controls": panelId,
            "data-tab-id": item.id,
            tabIndex: isTabs ? (selected || (selectedIndex < 0 && index === 0) ? 0 : -1) : 0,
            className: cn("tab-item", selected && "tab-item-active"),
            onKeyDown: isTabs
              ? (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, index)
              : undefined,
          };
          const content = (
            <>
              {Icon ? (
                <span className="relative">
                  <Icon size={18} strokeWidth={selected ? 2.2 : 1.75} aria-hidden="true" />
                  {item.badge ? (
                    <span className="tab-badge" aria-hidden="true">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span>{item.label}</span>
              {item.badge ? <span className="sr-only">, {item.badge} personajes</span> : null}
            </>
          );
          return item.to ? (
            <Link
              {...shared}
              key={item.id}
              to={item.to}
              aria-current={selected ? "page" : undefined}
              viewTransition={
                reduced
                  ? false
                  : { types: [index > selectedIndex ? "panel-forward" : "panel-back"] }
              }
              onClick={(event) => {
                // Preserve open-in-new-tab and router blockers; normal click uses roving selection.
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                )
                  return;
                event.preventDefault();
                select(item);
              }}
            >
              {content}
            </Link>
          ) : (
            <button {...shared} key={item.id} type="button" onClick={() => select(item)}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
