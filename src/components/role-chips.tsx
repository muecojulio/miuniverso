import { Flame, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/studio/types";

export function ChoiceRow<T extends string>({
  value,
  options,
  onChange,
  columns = 3,
}: {
  value: T;
  options: { id: T; label: string; sub?: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        columns === 3 && "grid-cols-3",
      )}
    >
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
              on
                ? "border-brass bg-gradient-to-b from-amber-300 to-brass text-ink shadow-[0_6px_20px_-6px_rgba(245,184,75,0.6)]"
                : "border-line bg-panel-2/75 text-paper hover:border-brass/40 hover:bg-panel-2",
            )}
          >
            <span>{option.label}</span>
            {option.sub ? (
              <span className={cn("text-[11px]", on ? "text-ink/80" : "text-muted")}>
                {option.sub}
              </span>
            ) : null}
          </button>
        );
      })}
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

export function RoleChips({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {ROLE_CARDS.map(({ id, label, hint, activeClass, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all duration-200 active:scale-[0.97]",
              on
                ? activeClass
                : "border-line bg-panel-2/70 text-paper hover:border-line/90 hover:bg-panel-2",
            )}
          >
            <Icon size={18} className={cn(on ? "scale-110" : "text-muted")} />
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-[11px] leading-tight text-muted">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
