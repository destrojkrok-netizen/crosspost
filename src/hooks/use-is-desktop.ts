"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)"; // Tailwind's lg

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True at lg and up. The server snapshot says desktop, so the first client render
 * matches the HTML; a phone switches after hydration. */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
