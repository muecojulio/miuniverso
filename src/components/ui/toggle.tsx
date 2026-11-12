import * as Switch from "@radix-ui/react-switch";
import { Check } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  accent = "brass",
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  accent?: "brass" | "emerald" | "crimson";
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 rounded-card border px-4 py-3 transition-colors duration-200",
        checked ? "border-brass/45 bg-panel-2/80" : "border-line bg-panel/85",
        disabled && "opacity-50",
      )}
    >
      <label htmlFor={id} className={cn("min-w-0 flex-1", !disabled && "cursor-pointer")}>
        <span id={`${id}-label`} className="block text-sm font-medium text-paper">
          {label}
        </span>
        {hint ? (
          <span id={`${id}-hint`} className="mt-0.5 block text-xs leading-relaxed text-muted">
            {hint}
          </span>
        ) : null}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="switch-control"
      >
        <span
          className={cn("switch-track", checked && `switch-track-${accent}`)}
          aria-hidden="true"
        >
          <span className={cn("switch-word", checked ? "left-1.5" : "right-1.5")}>
            {checked ? "SÍ" : "NO"}
          </span>
          <Switch.Thumb className="switch-thumb">
            {checked ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              <span className="h-0.5 w-2 rounded-full bg-muted" />
            )}
          </Switch.Thumb>
        </span>
      </Switch.Root>
    </div>
  );
}
