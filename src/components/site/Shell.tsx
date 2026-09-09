"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BrandIntro } from "./BrandIntro"
import { Footer } from "./Footer"
import { Header } from "./Header"
import { ShadeCord } from "./ShadeCord"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"

/** Old page dips out, the new one is swapped in, then rises. */
const LEAD_MS = 220
const TOTAL_MS = 560

type Phase = "idle" | "leaving" | "entering"

function normalize(path: string): string {
  const stripped = path.replace(/index\.html$/, "").replace(/\/+$/, "")
  return stripped === "" ? "/" : stripped
}

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const reducedMotion = usePrefersReducedMotion()

  const [phase, setPhase] = useState<Phase>("idle")
  const timers = useRef<number[]>([])

  const isHome = normalize(pathname ?? "/") === "/"

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  /**
   * Intercept internal cross-route links anywhere in the tree so navigation
   * plays the shade wipe and stays client-side. `router.push` never reloads the
   * document, so anything parked on `window` survives the trip.
   */
  useEffect(() => {
    if (reducedMotion) return

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!anchor) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return

      const target = normalize(url.pathname)
      if (target === normalize(window.location.pathname)) return

      event.preventDefault()
      clearTimers()
      setPhase("leaving")

      timers.current.push(
        window.setTimeout(() => {
          router.push(url.pathname + url.hash)
          window.scrollTo(0, 0)
          setPhase("entering")
        }, LEAD_MS)
      )
      timers.current.push(window.setTimeout(() => setPhase("idle"), TOTAL_MS))
    }

    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [router, reducedMotion, clearTimers])

  const phaseClass =
    phase === "leaving"
      ? " is-leaving"
      : phase === "entering"
        ? " is-entering"
        : ""

  return (
    <>
      <BrandIntro />

      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Header />
      {isHome && <ShadeCord />}

      <div className={`page-view${phaseClass}`}>{children}</div>

      <Footer />

      <div
        className={`shade-wipe${phase !== "idle" ? " is-active" : ""}`}
        aria-hidden="true"
      />
    </>
  )
}
