import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion"

/**
 * Progress (0 → 1) of a tall element passing through the viewport, remapped so
 * the action happens across the middle of the pass rather than the whole
 * enter-and-exit. Under reduced motion it pins to 1 — the resolved state —
 * immediately, so the copy a scrubbed sequence resolves into is simply there.
 */
export function useSectionProgress(
  lo = 0.12,
  hi = 0.72
): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return

    let raf = 0

    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const raw = (vh - rect.top) / (vh + rect.height)
      setProgress(Math.min(1, Math.max(0, (raw - lo) / (hi - lo))))
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion, lo, hi])

  return [ref, reducedMotion ? 1 : progress]
}
