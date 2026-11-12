import { Check, Flame, Shield, Sparkles } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { cn } from "@/lib/cn";
import { nextRovingIndex } from "@/lib/ui/gestures";
import type { Role } from "@/lib/studio/types";

export function ChoiceRow<T extends string>({
  value,
  options,
  onChange,
  columns = 3,
  label = "Opciones disponibles",
}: {
  value: T;
  options: { id: T; label: string; sub?: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = options.findIndex((option) => option.id === value);
    const next = nextRovingIndex(event.key, current, options.length);
    if (next === null) return;
    event.preventDefault();
    onChange(options[next]!.id);
    ref.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus({ preventScroll: true });
  }
  return (
    <div ref={ref}>
      <HorizontalScroll
        label={label}
        role="radiogroup"
        className={cn(
          "choice-row",
          columns === 2 && "choice-row-two",
          columns === 4 && "choice-row-four",
        )}
        selectionKey={value}
        onKeyDown={onKeyDown}
      >
        {options.map((option) => {
          const on = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(option.id)}
              className={cn(
                "chip min-h-13 flex-col rounded-2xl px-4",
                on && "border-brass bg-brass text-ink",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {on ? <Check size={13} aria-hidden="true" /> : null}
                {option.label}
              </span>
              {option.sub ? (
                <span className={cn("text-[11px]", on ? "text-ink/80" : "text-muted")}>
                  {option.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </HorizontalScroll>
    </div>
  );
}

const ROLE_CARDS: {
  id: Role;
  label: string;
  hint: string;
  activeClass: string;
  Icon: typeof Shield;
}[] = [
  {
    id: "heroe",
    label: "Héroe",
    hint: "Luz y emblema",
    activeClass:
      "border-amber-300 bg-gradient-to-br from-amber-400/25 via-brass/20 to-orange-500/20 text-amber-100 shadow-[0_8px_24px_-8px_rgba(245,184,75,0.5)]",
    Icon: Shield,
  },
  {
    id: "villano",
    label: "Villano",
    hint: "Sombra y poder",
    activeClass:
      "border-rose-400 bg-gradient-to-br from-rose-500/25 via-crimson/20 to-purple-900/30 text-rose-100 shadow-[0_8px_24px_-8px_rgba(239,91,120,0.5)]",
    Icon: Flame,
  },
  {
    id: "anime",
    label: "Anime",
    hint: "Aura dinámica",
    activeClass:
      "border-cyan-400 bg-gradient-to-br from-cyan-400/25 via-sky-500/20 to-violet-600/25 text-cyan-100 shadow-[0_8px_24px_-8px_rgba(56,189,248,0.5)]",
    Icon: Sparkles,
  },
];

export function RoleChips({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextRovingIndex(
      event.key,
      ROLE_CARDS.findIndex((card) => card.id === value),
      ROLE_CARDS.length,
    );
    if (next === null) return;
    event.preventDefault();
    onChange(ROLE_CARDS[next]!.id);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Tipo de personaje"
      className="grid grid-cols-3 gap-2.5"
      onKeyDown={onKeyDown}
    >
      {ROLE_CARDS.map(({ id, label, hint, activeClass, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all duration-200 active:scale-[0.97]",
              on
                ? activeClass
                : "border-line bg-panel-2/70 text-paper hover:border-line/90 hover:bg-panel-2",
            )}
          >
            {on ? (
              <Check size={12} className="absolute top-1.5 right-1.5" aria-hidden="true" />
            ) : null}
            <Icon size={18} className={cn(on ? "scale-110" : "text-muted")} aria-hidden="true" />
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-[11px] leading-tight text-muted">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
