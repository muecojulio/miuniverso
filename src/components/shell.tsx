import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Clapperboard,
  Film as FilmIcon,
  Hammer,
  House,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TONE_META } from "@/lib/studio/presets";
import { useStudio } from "@/lib/studio/store";

const TABS = [
  { to: "/", label: "Estudio", icon: House },
  { to: "/elenco", label: "Elenco", icon: Users },
  { to: "/forja", label: "Forja", icon: Hammer },
  { to: "/historia", label: "Guion", icon: ScrollText },
  { to: "/rodaje", label: "Rodaje", icon: Clapperboard },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const load = useStudio((s) => s.load);
  const activeFilm = useStudio((s) => s.films.find((f) => f.id === s.activeId) ?? s.films[0]);
  const match = useMatchRoute();

  useEffect(() => {
    void load();
  }, [load]);

  const castCount = activeFilm?.cast.length ?? 0;
  const toneMeta = activeFilm ? TONE_META[activeFilm.tone] : TONE_META.epico;

  return (
    <div className="cinema-backdrop relative min-h-dvh text-paper">
      {/* Top Studio Marquee Bar */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2.5">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-brass to-rose-500 text-ink shadow-[0_4px_16px_-4px_rgba(245,184,75,0.65)] transition-transform duration-200 group-hover:scale-105">
              <FilmIcon size={18} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight text-paper">
                Mi Universo
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="pulse-live inline-block size-1.5 rounded-full bg-emerald" />
                <span className="truncate">
                  {activeFilm?.title || "Sin título"} · {toneMeta.label}
                </span>
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/privacidad"
              title="Privacidad, Seguridad y Caché"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald/35 bg-emerald/10 px-3 text-xs font-medium text-emerald transition-colors hover:bg-emerald/20"
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Privacidad y Escudo</span>
              <span className="sm:hidden">Local</span>
            </Link>
            <Link
              to="/instalar"
              title="Instalar en tu teléfono"
              className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-panel-2/80 text-muted transition-colors hover:border-brass/50 hover:text-brass"
            >
              <Smartphone size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="page-pad mx-auto w-full max-w-4xl px-4 pt-6">{children}</main>

      {/* Floating Cinema Bottom Dock */}
      <nav
        aria-label="Navegación del estudio"
        className="nav-pad fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-ink/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-3xl px-2 pt-1.5">
          {TABS.map((tab) => {
            const on = Boolean(match({ to: tab.to, fuzzy: false }));
            const Icon = tab.icon;
            const showBadge =
              (tab.to === "/elenco" || tab.to === "/forja") && castCount > 0;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex min-h-13 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition-all duration-200",
                  on
                    ? "bg-gradient-to-b from-brass/20 to-rose-500/10 text-brass shadow-[inset_0_1px_0_rgba(245,184,75,0.35)]"
                    : "text-muted hover:text-paper",
                )}
              >
                <span className="relative">
                  <Icon size={18} strokeWidth={on ? 2.2 : 1.75} />
                  {showBadge && tab.to === "/elenco" ? (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-ink">
                      {castCount}
                    </span>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
