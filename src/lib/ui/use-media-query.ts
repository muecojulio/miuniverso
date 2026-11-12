import { useCallback, useSyncExternalStore } from "react";

/** Hydration-safe media query: the server snapshot never reads `window`. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const serverSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}

export function useDesktopActions(): boolean {
  return useMediaQuery("(min-width: 768px) and (hover: hover) and (pointer: fine)");
}
