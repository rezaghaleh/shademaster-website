"use client"

import type { CSSProperties } from "react"

/**
 * Faux wood blinds: the slats tilt through their range, top to bottom, and the
 * daylight comes through the gaps. Tilt is what a slatted blind does that a
 * roller cannot, so it is the only thing worth animating here.
 */
export function WoodDemo() {
  const slats = [0, 1, 2, 3, 4, 5, 6]

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 200 130" className="w-full" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dw-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id="dw-opening">
            <rect x="18" y="22" width="164" height="90" rx="2" />
          </clipPath>
        </defs>

        <g clipPath="url(#dw-opening)">
          <rect x="18" y="22" width="164" height="90" fill="url(#dw-light)" />

          {slats.map((i) => (
            <rect
              key={i}
              className="demo-wood__slat"
              x="18"
              y={24 + i * 12.6}
              width="164"
              height="11"
              rx="1.5"
              fill="hsl(var(--sm-ink-raised))"
              style={{ "--i": i } as CSSProperties}
            />
          ))}

          {/* tilt rod */}
          <rect x="36" y="22" width="2.4" height="90" fill="hsl(var(--sm-mute))" opacity="0.35" />
        </g>

        <rect
          x="18"
          y="22"
          width="164"
          height="90"
          rx="2"
          stroke="hsl(var(--sm-line-strong))"
          strokeWidth="1.5"
        />
        <rect
          x="12"
          y="10"
          width="176"
          height="12"
          rx="3"
          fill="hsl(var(--sm-ink-raised))"
          stroke="hsl(var(--sm-line-strong))"
        />
      </svg>

      <p className="hud text-faint">Slats tilt, light stays yours</p>
    </div>
  )
}
