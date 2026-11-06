import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const tap = "transition-transform duration-150 ease-out active:not-disabled:scale-[0.96]";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "ghost" }) {
  return (
    <button
      type={type}
      className={cn(
        tap,
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-brass text-ink",
        variant === "quiet" && "border border-line bg-panel text-paper",
        variant === "ghost" && "bg-transparent text-paper",
        className,
      )}
      {...props}
    />
  );
}
