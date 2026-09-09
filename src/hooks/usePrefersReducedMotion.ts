import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/**
 * Tracks the user's reduced-motion preference. The server snapshot assumes
 * reduced motion, so ambient motion only ever starts on the client and the
 * first server and client trees always match.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
