"use client"

import { useEffect, useRef, useState } from "react"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"

const CENTER = 0.5
const AMP = 0.17

/** A hanging cord sways slightly; expressed as a 0–1 fraction of strip width. */
function swayT(t: number): number {
  return (
    CENTER +
    AMP * Math.sin(t * Math.PI * 1.8 + 0.4) +
    AMP * 0.35 * Math.sin(t * Math.PI * 4.3 + 1.9)
  )
}

/**
 * Built in real pixel units rather than a stretched viewBox. Under a
 * `preserveAspectRatio="none"` viewBox, x and y scale by different factors, and
 * the dash pattern (screen space, because of non-scaling-stroke) stops agreeing
 * with getPointAtLength (user space) — so the drawn line and the rail drift
 * apart. At 1:1 there is no discrepancy.
 */
function buildCordPath(w: number, h: number): string {
  const steps = 48
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([swayT(t) * w, t * h])
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${((cx + nx) / 2).toFixed(2)} ${((cy + ny) / 2).toFixed(2)}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`
  return d
}

/**
 * The metaphor as a progress indicator: a shade cord down the left edge of the
 * viewport with the bottom rail riding it. How far you have scrolled is how far
 * the shade has been drawn.
 *
 * The rail is placed with getPointAtLength(p × totalLength) — the same units the
 * dash offset uses. Positioning it by progress × height would drift off the
 * line, because arc length along the sway is longer than the vertical drop.
 */
export function ShadeCord() {
  const reducedMotion = usePrefersReducedMotion()

  const rootRef = useRef<HTMLDivElement>(null)
  const drawnRef = useRef<SVGPathElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null)

  // Re-measure the strip and rebuild the path at its true pixel size.
  useEffect(() => {
    if (reducedMotion) return
    const root = rootRef.current
    if (!root) return

    const measure = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (w < 2 || h < 2) return
      setGeo((prev) =>
        prev && prev.w === w && prev.h === h
          ? prev
          : { w, h, d: buildCordPath(w, h) }
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion || !geo) return
    const root = rootRef.current
    const drawn = drawnRef.current
    const rail = railRef.current
    if (!root || !drawn || !rail) return

    let raf = 0
    let target = 0
    let current = -1
    const totalLen = drawn.getTotalLength()

    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      target = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }

    const render = (p: number) => {
      drawn.style.strokeDashoffset = String(1 - p)
      const pt = drawn.getPointAtLength(p * totalLen)
      rail.style.transform = `translate3d(${pt.x.toFixed(2)}px, ${pt.y.toFixed(2)}px, 0)`
    }

    const tick = () => {
      current += (target - current) * 0.14
      const settled = Math.abs(target - current) < 0.0005
      render(settled ? target : current)
      if (settled) {
        current = target
        raf = 0
      } else {
        raf = requestAnimationFrame(tick)
      }
    }

    const onScroll = () => {
      measure()
      if (!raf) raf = requestAnimationFrame(tick)
    }

    measure()
    current = target
    render(current)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion, geo])

  if (reducedMotion) return null

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[6] hidden h-[100dvh] w-[34px] sm:block lg:w-[52px]"
      ref={rootRef}
      aria-hidden="true"
    >
      {geo && (
        <svg
          className="absolute inset-0 overflow-visible"
          width={geo.w}
          height={geo.h}
          viewBox={`0 0 ${geo.w} ${geo.h}`}
          fill="none"
        >
          <path className="shade-cord__base" d={geo.d} />
          <path
            ref={drawnRef}
            className="shade-cord__drawn"
            d={geo.d}
            pathLength={1}
          />
        </svg>
      )}

      {/* the bottom rail riding the cord */}
      <div
        className="absolute left-0 top-0 h-0 w-0 will-change-transform"
        ref={railRef}
      >
        <span className="shade-cord__pulse bg-sky-brand/50 absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <span className="bg-sky-brand absolute h-[3px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_hsl(var(--sm-ink)),0_0_10px_hsl(var(--sm-accent)/0.7)]" />
      </div>
    </div>
  )
}
