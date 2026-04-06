import { useEffect, useRef, useLayoutEffect } from "react";

/**
 * Hook to execute a callback when the Escape key is pressed.
 * Uses the callbackRef pattern to ensure the callback is always up-to-date
 * without recreating the event listener.
 *
 * @param onEscape - Callback to execute when Escape is pressed
 */
export function useEscapeKey(onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape);

  // Keep ref up to date with latest callback (callbackRef pattern)
  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
