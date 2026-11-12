import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import { nextRovingIndex, normalizeSearch } from "@/lib/ui/gestures";
import { useReducedMotion } from "@/lib/ui/use-media-query";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
};

/** WAI-ARIA autocomplete/list pattern, without a positioning or state dependency. */
export function Combobox({
  label,
  value,
  options,
  onChange,
  placeholder = "Buscar opciones…",
  emptyText = "No hay coincidencias. Prueba otra búsqueda.",
  className,
}: {
  label: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const search = normalizeSearch(query);
    return options.filter((option) =>
      normalizeSearch(
        `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`,
      ).includes(search),
    );
  }, [options, query]);
  const activeIndex = filtered.length ? Math.min(active, filtered.length - 1) : -1;
  const activeOption = filtered[activeIndex];

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!open || !list || !option) return;
    const parentRect = list.getBoundingClientRect();
    const rect = option.getBoundingClientRect();
    const top = rect.top - parentRect.top + list.scrollTop;
    const next =
      rect.top < parentRect.top
        ? top
        : rect.bottom > parentRect.bottom
          ? top - list.clientHeight + rect.height
          : list.scrollTop;
    list.scrollTo({ top: next, behavior: reduced ? "instant" : "smooth" });
  }, [open, activeIndex, query, reduced]);

  function show() {
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setQuery("");
  }
  function choose(option: ComboboxOption) {
    onChange(option.value);
    close();
    inputRef.current?.focus({ preventScroll: true });
  }
  function move(index: number) {
    if (!open) show();
    setActive(index);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeOption) choose(activeOption);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      show();
      if (event.key === "ArrowUp") setActive(Math.max(0, options.length - 1));
      return;
    }
    const next = nextRovingIndex(event.key, activeIndex, filtered.length, true);
    if (next !== null) {
      event.preventDefault();
      move(next);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("combobox min-w-0", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          aria-activedescendant={open && activeOption ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={`${id}-count`}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="field combobox-input pr-12"
          value={open ? query : (selected?.label ?? "")}
          placeholder={selected?.label ?? placeholder}
          onChange={(event) => {
            if (!open) setOpen(true);
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="combobox-toggle"
          aria-label={open ? `Cerrar ${label}` : `Mostrar ${label}`}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onClick={() => {
            if (open) close();
            else show();
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          <ChevronDown
            size={17}
            className={cn("transition-transform duration-200", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          hidden={!open}
          className="combobox-list"
          data-no-swipe=""
        >
          {filtered.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              className="combobox-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-muted">{option.description}</span>
                ) : null}
              </span>
              {option.value === value ? (
                <Check size={16} className="shrink-0 text-brass" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <span
        id={`${id}-count`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={open ? "mt-1 block text-xs text-muted" : "sr-only"}
      >
        {open
          ? filtered.length
            ? `${filtered.length} ${filtered.length === 1 ? "opción disponible" : "opciones disponibles"}`
            : emptyText
          : selected
            ? `${selected.label} seleccionado`
            : "Ninguna opción seleccionada"}
      </span>
    </div>
  );
}
