import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const tap =
  "transition-all duration-200 ease-out active:not-disabled:scale-[0.97] cursor-pointer";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "crimson" | "quiet" | "ghost";
}) {
  return (
    <button
      type={type}
      className={cn(
        tap,
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-gradient-to-r from-amber-300 via-brass to-amber-500 text-ink font-semibold shadow-[0_6px_22px_-6px_rgba(245,184,75,0.65)] hover:brightness-105",
        variant === "crimson" &&
          "bg-gradient-to-r from-rose-500 via-crimson to-pink-500 text-white font-semibold shadow-[0_6px_22px_-6px_rgba(239,91,120,0.6)] hover:brightness-105",
        variant === "quiet" &&
          "border border-line bg-panel-2/90 text-paper shadow-sm hover:border-brass/50 hover:bg-panel-2",
        variant === "ghost" &&
          "bg-transparent text-muted hover:bg-panel-2/60 hover:text-paper",
        className,
      )}
      {...props}
    />
  );
}
