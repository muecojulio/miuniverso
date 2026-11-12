import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={cn("accordion", className)} data-open={open}>
      <h2>
        <button
          type="button"
          className="accordion-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{title}</span>
          <ChevronDown size={18} className="accordion-chevron shrink-0" aria-hidden="true" />
        </button>
      </h2>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className="accordion-panel"
        inert={!open}
        aria-hidden={!open}
      >
        <div className="accordion-inner">
          <div className="space-y-2 pt-1 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
