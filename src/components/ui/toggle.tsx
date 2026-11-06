import * as Switch from "@radix-ui/react-switch";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 rounded-card border border-line bg-panel px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-paper">{label}</span>
        {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      </span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors duration-200 data-[state=checked]:bg-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-paper transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-6" />
      </Switch.Root>
    </label>
  );
}
