import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  accent = "brass",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  accent?: "brass" | "emerald" | "crimson";
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 items-center justify-between gap-4 rounded-card border px-4 py-3 transition-colors duration-200",
        checked
          ? "border-brass/45 bg-panel-2/80 shadow-[0_0_24px_-12px_rgba(245,184,75,0.35)]"
          : "border-line bg-panel/85 hover:border-line/90",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-paper">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      </span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
          accent === "brass" && "data-[state=checked]:bg-brass",
          accent === "emerald" && "data-[state=checked]:bg-emerald",
          accent === "crimson" && "data-[state=checked]:bg-crimson",
        )}
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-paper shadow transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-ink" />
      </Switch.Root>
    </label>
  );
}
