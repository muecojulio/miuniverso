import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/cn";

export type ActionStatus = "idle" | "success" | "error";
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  variant?: "primary" | "crimson" | "quiet" | "ghost";
  size?: "default" | "compact" | "icon";
  loading?: boolean;
  status?: ActionStatus;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown;
};

/**
 * Async clicks are locked synchronously, before React's next render. Handlers
 * that report their own errors can pass `status`; thrown errors get an inline
 * alert. Native form validation still runs before a submit handler.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    className,
    type = "button",
    children,
    loading = false,
    status,
    loadingLabel = "Procesando…",
    successLabel = "Listo",
    errorLabel = "No se pudo completar",
    disabled,
    onClick,
    ...props
  },
  ref,
) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ActionStatus>("idle");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackId = useId();
  const busy = loading || pending;
  const current = busy ? "loading" : (status ?? feedback);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function report(next: ActionStatus) {
    if (!mounted.current) return;
    setFeedback(next);
    if (timer.current) clearTimeout(timer.current);
    if (next !== "idle") {
      timer.current = setTimeout(
        () => {
          if (mounted.current) setFeedback("idle");
        },
        next === "error" ? 4000 : 1800,
      );
    }
  }

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled || busy || inFlight.current || event.defaultPrevented) {
      event.preventDefault();
      return;
    }
    report("idle");
    try {
      const result = onClick?.(event);
      if (result instanceof Promise && !event.defaultPrevented) {
        inFlight.current = true;
        setPending(true);
        await result;
        report("success");
      }
    } catch {
      report("error");
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  const message =
    current === "loading"
      ? loadingLabel
      : current === "success"
        ? successLabel
        : current === "error"
          ? errorLabel
          : null;

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "control",
        `control-${variant}`,
        size !== "default" && `control-${size}`,
        className,
      )}
      disabled={disabled || busy}
      aria-disabled={disabled || busy || undefined}
      aria-busy={busy || undefined}
      data-status={current}
      {...props}
      aria-describedby={
        message ? cn(props["aria-describedby"], feedbackId) : props["aria-describedby"]
      }
      aria-label={
        message
          ? props["aria-label"]
            ? `${props["aria-label"]}: ${message}`
            : message
          : props["aria-label"]
      }
      onClick={(event) => void handleClick(event)}
    >
      <span className="control-content" aria-hidden={message ? true : undefined}>
        {children}
      </span>
      {message ? (
        <span
          id={feedbackId}
          className="control-content"
          role={current === "error" ? "alert" : "status"}
          aria-live={current === "error" ? "assertive" : "polite"}
        >
          {current === "loading" ? (
            <LoaderCircle size={16} className="loading-spinner" aria-hidden="true" />
          ) : current === "success" ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <TriangleAlert size={16} aria-hidden="true" />
          )}
          {message}
        </span>
      ) : null}
    </button>
  );
});
