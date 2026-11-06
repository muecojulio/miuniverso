import { Link, useMatchRoute } from "@tanstack/react-router";
import { Clapperboard, Hammer, House, ScrollText, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useStudio } from "@/lib/studio/store";

const TABS = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/elenco", label: "Elenco", icon: Users },
  { to: "/forja", label: "Forja", icon: Hammer },
  { to: "/historia", label: "Historia", icon: ScrollText },
  { to: "/rodaje", label: "Rodaje", icon: Clapperboard },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const load = useStudio((s) => s.load);
  const match = useMatchRoute();
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <main className="page-pad mx-auto w-full max-w-3xl px-4 pt-6">{children}</main>
      <nav className="nav-pad fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((tab) => {
            const on = Boolean(match({ to: tab.to, fuzzy: false }));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors duration-200",
                  on ? "text-brass" : "text-muted",
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
