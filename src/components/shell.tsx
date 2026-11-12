import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { swipeDirection } from "@/lib/ui/gestures";
import { useHorizontalSwipe } from "@/lib/ui/use-horizontal-swipe";
import { useReducedMotion } from "@/lib/ui/use-media-query";
import { TONE_META } from "@/lib/studio/presets";
import { useStudio } from "@/lib/studio/store";

const TABS: readonly TabItem[] = [
  { id: "/", to: "/", label: "Estudio", icon: House },
  { id: "/elenco", to: "/elenco", label: "Elenco", icon: Users },
  { id: "/forja", to: "/forja", label: "Forja", icon: Hammer },
  { id: "/historia", to: "/historia", label: "Guion", icon: ScrollText },
  { id: "/rodaje", to: "/rodaje", label: "Rodaje", icon: Clapperboard },
];
const subscribeToNothing = () => () => {};
const supportsViewTransitions = () => typeof document.startViewTransition === "function";
const serverViewTransitions = () => false;

/** Persistent layout: the dock indicator and panel transition survive routing. */
export function Shell({ children }: { children: ReactNode }) {
  const load = useStudio((s) => s.load);
  const activeFilm = useStudio((s) => s.films.find((f) => f.id === s.activeId) ?? s.films[0]);
  const castCount = useStudio(
    (s) => (s.films.find((f) => f.id === s.activeId) ?? s.films[0])?.cast.length ?? 0,
  );
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const viewTransitions = useSyncExternalStore(
    subscribeToNothing,
    supportsViewTransitions,
    serverViewTransitions,
  );
  const activeIndex = TABS.findIndex((tab) => tab.id === pathname);
  const items = TABS.map((tab) =>
    tab.id === "/elenco" ? { ...tab, badge: castCount || undefined } : tab,
  );

  useEffect(() => {
    void load();
  }, [load]);

  const panelSwipe = useHorizontalSwipe({
    enabled: activeIndex >= 0,
    onEnd(dx, duration) {
      const direction = swipeDirection(dx, 0, duration);
      const next = activeIndex + direction;
      if (!direction || next < 0 || next >= TABS.length) return;
      void navigate({
        to: TABS[next]!.to!,
        viewTransition: reduced
          ? false
          : { types: [direction > 0 ? "panel-forward" : "panel-back"] },
      }).catch(() => {
        // Consecutive swipes may skip an in-flight native transition.
      });
    },
  });
  const toneMeta = activeFilm ? TONE_META[activeFilm.tone] : TONE_META.epico;

  return (
    <div className="cinema-backdrop relative min-h-dvh text-paper">
      <a href="#studio-panel" className="skip-link">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
          <Link
            to="/"
            className="group flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl"
            aria-label="Mi Universo, ir al Estudio"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-brass to-rose-500 text-ink shadow-[0_4px_16px_-4px_rgba(245,184,75,0.65)] transition-transform duration-200 group-hover:scale-105">
              <FilmIcon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight text-paper">
                Mi Universo
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="pulse-live inline-block size-1.5 rounded-full bg-emerald"
                  aria-hidden="true"
                />
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
              className="control control-quiet border-emerald/35 bg-emerald/10 px-3 text-xs text-emerald"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Privacidad y Escudo</span>
              <span className="sm:hidden">Local</span>
            </Link>
            <Link
              to="/instalar"
              title="Instalar en tu teléfono"
              aria-label="Instalar en tu teléfono"
              className="control control-quiet control-icon"
            >
              <Smartphone size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main
        id="studio-panel"
        data-studio-panel=""
        tabIndex={-1}
        role={activeIndex >= 0 ? "tabpanel" : "region"}
        aria-labelledby={activeIndex >= 0 ? `studio-tab-${activeIndex}` : undefined}
        aria-label={
          activeIndex < 0
            ? pathname === "/privacidad"
              ? "Privacidad y datos locales"
              : "Instalación"
            : undefined
        }
        className="page-pad mx-auto w-full max-w-4xl px-4 pt-6 focus:outline-none"
        style={{ touchAction: "pan-y pinch-zoom" }}
        {...panelSwipe}
      >
        <div key={pathname} className={viewTransitions ? undefined : "route-enter"}>
          {children}
        </div>
      </main>

      <nav
        aria-label="Navegación del estudio"
        className="nav-pad fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-ink/90 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-3xl px-2 pt-1.5">
          <Tabs
            items={items}
            value={pathname}
            panelId={activeIndex >= 0 ? "studio-panel" : undefined}
            label="Secciones del estudio"
            idPrefix="studio"
          />
        </div>
      </nav>
    </div>
  );
}
