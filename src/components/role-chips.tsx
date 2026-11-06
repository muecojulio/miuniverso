import { cn } from "@/lib/cn";

export function ChoiceRow<T extends string>({
  value,
  options,
  onChange,
  columns = 3,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 4 && "grid-cols-2 sm:grid-cols-4", columns === 3 && "grid-cols-3")}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 rounded-full border px-2 text-sm transition-colors duration-200 active:scale-[0.96]",
              on ? "border-brass bg-brass text-ink" : "border-line bg-panel-2 text-paper",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RoleChips({ value, onChange }: { value: "heroe" | "villano" | "anime"; onChange: (role: "heroe" | "villano" | "anime") => void }) {
  return (
    <ChoiceRow
      value={value}
      onChange={onChange}
      options={[
        { id: "heroe", label: "Héroe" },
        { id: "villano", label: "Villano" },
        { id: "anime", label: "Anime" },
      ]}
    />
  );
}

export function bustLine(text: string): string {
  const clean = text.trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;
}
