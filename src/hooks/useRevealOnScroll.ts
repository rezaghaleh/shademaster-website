import { useEffect } from "react"

/**
 * Reveals `.reveal` elements as they scroll into view. The rule that hides them
 * is gated behind `.reveals-ready` on <html>, which is added here — so if JS
 * never runs, or the visitor prefers reduced motion, the content is simply
 * visible. Nothing is ever hidden behind an animation that might not play.
 *
 * `key` re-runs it after a client-side navigation swaps the page body.
 */
export function useRevealOnScroll(key?: string): void {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const elements = document.querySelectorAll<HTMLElement>(".reveal")
    if (elements.length === 0) return

    const root = document.documentElement
    root.classList.add("reveals-ready")

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.06 }
    )

    elements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      root.classList.remove("reveals-ready")
    }
  }, [key])
}
