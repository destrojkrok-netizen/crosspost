"use client";

import { useEffect, useRef } from "react";

/** Calls `fn` once now, then every `intervalMs` while the tab is visible (and again the
 * moment it becomes visible); `deps` restart it. The callback is read through a ref so a
 * new closure never restarts the timer. */
export function usePolling(fn: () => void | Promise<void>, intervalMs: number, deps: unknown[]) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => void ref.current();
    const start = () => {
      if (!timer) timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };
    tick();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
