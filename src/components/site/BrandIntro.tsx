"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import { LogoMark } from "./Logo"
import { finishIntro, markIntroSeen, shouldPlayIntro } from "@/lib/introState"
import { SITE } from "@/lib/site"

type Phase = "playing" | "leaving" | "done"

const FULL = 760
const LEAVE_AT = FULL - 200

/**
 * Whether the intro runs depends on sessionStorage, which the server cannot
 * read. So the decision has to happen after mount — and before paint, or the
 * overlay flashes on every repeat visit. useLayoutEffect warns during the
 * server pass, so fall back to useEffect there.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * One-per-session brand moment: four slats lift in sequence and the mark is
 * revealed beneath them, which is the whole business in one gesture. Under
 * 800ms, skipped on repeat visits, and it never blocks.
 *
 * Both the fresh and repeat paths render the SAME first tree, so hydration
 * matches; the repeat visit then drops it in a layout effect, before paint. The
 * overlay also clears itself from CSS alone (see `.brand-intro` in globals.css)
 * so a failed script can never trap the page behind it.
 */
export function BrandIntro() {
  const [phase, setPhase] = useState<Phase>("playing")

  useBeforePaint(() => {
    if (!shouldPlayIntro()) {
      setPhase("done")
      return
    }
    markIntroSeen()

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const leaveAt = reduce ? 60 : LEAVE_AT
    const doneAt = reduce ? 200 : FULL

    const t1 = window.setTimeout(() => setPhase("leaving"), leaveAt)
    const t2 = window.setTimeout(() => {
      setPhase("done")
      finishIntro()
    }, doneAt)
    // safety net — the overlay never stays over the page
    const t3 = window.setTimeout(() => {
      setPhase("done")
      finishIntro()
    }, 3000)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [])

  if (phase === "done") return null

  return (
    <div className={`brand-intro is-${phase}`} aria-hidden="true">
      <div className="relative px-6">
        {/* the slats that lift away */}
        <svg
          className="pointer-events-none absolute left-1/2 top-1/2 h-[128px] w-[340px] -translate-x-1/2 -translate-y-[58%] overflow-visible"
          viewBox="0 0 340 128"
          fill="none"
        >
          {[8, 36, 64, 92].map((y, i) => (
            <rect
              key={y}
              className={`brand-intro__slat s${i + 1}`}
              x="0"
              y={y}
              width="340"
              height="20"
              rx="2"
              fill="hsl(var(--sm-accent))"
              opacity={0.16 - i * 0.02}
            />
          ))}
        </svg>

        <div className="relative flex flex-col items-center gap-3.5">
          <LogoMark size={62} className="brand-intro__mark text-sky-brand" />
          <div className="brand-intro__word flex flex-col items-center">
            <span className="display text-bone text-[1.75rem] tracking-[-0.05em]">
              ShadeMaster Blinds
            </span>
            <span className="hud text-faint mt-2 text-[0.56rem]">
              {SITE.tagline}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
