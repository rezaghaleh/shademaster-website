"use client"

import type { CSSProperties } from "react"

/**
 * The hero's product visual: a real window doing the one thing ShadeMaster
 * sells. The shade rolls up, the view arrives, light lands on the floor, and
 * the rail settles at a set position — light control, staged over ~6s, then
 * left in slow ambient motion (the light breathes, dust drifts, the cord sways).
 *
 * All timing lives in globals.css so the whole sequence is a single set of
 * paused CSS animations that start when `.is-live` is added. Under reduced
 * motion `.is-static` resolves everything to the end of the sequence instead.
 *
 * Nothing here uses SVG `transform` attributes on animated nodes: a CSS
 * transform replaces the attribute outright, which would drop the positioning.
 * Where both are needed, the translate sits on an outer wrapper <g>.
 */

const MOTES = [
  { cx: 200, cy: 412, r: 1.9, dx: 9, dy: -16, dur: "17s", phase: "0s", peak: 0.5 },
  { cx: 268, cy: 430, r: 1.4, dx: -7, dy: -13, dur: "21s", phase: "-4s", peak: 0.4 },
  { cx: 330, cy: 404, r: 2.1, dx: 11, dy: -10, dur: "15s", phase: "-8s", peak: 0.45 },
  { cx: 386, cy: 428, r: 1.5, dx: -9, dy: -18, dur: "23s", phase: "-2s", peak: 0.35 },
  { cx: 244, cy: 396, r: 1.2, dx: 6, dy: -12, dur: "19s", phase: "-11s", peak: 0.3 },
]

export function HeroWindow({
  live,
  isStatic,
}: {
  live: boolean
  isStatic: boolean
}) {
  const stateClass = isStatic ? "is-static" : live ? "is-live" : ""

  return (
    <svg
      className={`hero-window h-full w-full ${stateClass}`}
      viewBox="0 0 560 470"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      role="img"
      aria-label="A roller shade rising to let daylight into a room"
    >
      <defs>
        <linearGradient id="hw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.95" />
          <stop offset="55%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.45" />
          <stop offset="100%" stopColor="hsl(var(--sm-accent-deep))" stopOpacity="0.22" />
        </linearGradient>

        <linearGradient id="hw-fabric-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--sm-ink-raised))" />
          <stop offset="100%" stopColor="hsl(var(--sm-ink-deep))" />
        </linearGradient>

        <linearGradient id="hw-beam-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.5" />
          <stop offset="60%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="hw-glow-g" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.42" />
          <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
        </radialGradient>

        <clipPath id="hw-opening">
          <rect x="120" y="52" width="320" height="320" rx="2" />
        </clipPath>
      </defs>

      {/* --- wall --- */}
      <rect x="0" y="0" width="560" height="470" fill="hsl(var(--sm-ink))" />

      {/* --- the view through the glass --- */}
      <g clipPath="url(#hw-opening)">
        <rect x="120" y="52" width="320" height="320" fill="hsl(var(--sm-ink-deep))" />
        <g className="hero-window__view">
          <rect x="120" y="52" width="320" height="320" fill="url(#hw-sky)" />
          {/* North Shore mountains */}
          <path
            d="M120 250 L176 196 L214 228 L262 178 L316 232 L360 200 L404 236 L440 214 V372 H120Z"
            fill="hsl(var(--sm-ink-deep))"
            opacity="0.55"
          />
          {/* a couple of towers */}
          <rect x="196" y="240" width="26" height="132" fill="hsl(var(--sm-ink-deep))" opacity="0.72" />
          <rect x="238" y="266" width="18" height="106" fill="hsl(var(--sm-ink-deep))" opacity="0.6" />
          <rect x="330" y="252" width="22" height="120" fill="hsl(var(--sm-ink-deep))" opacity="0.68" />
          {/* glass reflection */}
          <path d="M140 372 L268 52 h44 L184 372Z" fill="hsl(var(--sm-bone))" opacity="0.05" />
        </g>
      </g>

      {/* --- the shade itself, inside the opening --- */}
      <g clipPath="url(#hw-opening)">
        <rect
          className="hero-window__fabric"
          x="120"
          y="52"
          width="320"
          height="320"
          fill="url(#hw-fabric-g)"
        />
      </g>

      {/* bottom rail — travels with the fabric edge */}
      <g className="hero-window__rail">
        <rect x="116" y="366" width="328" height="9" rx="2" fill="hsl(var(--sm-mute))" opacity="0.85" />
        <rect x="252" y="375" width="56" height="4" rx="2" fill="hsl(var(--sm-mute))" opacity="0.5" />
      </g>

      {/* --- frame --- */}
      <g stroke="hsl(var(--sm-line-strong))" strokeWidth="2" fill="none">
        <rect x="120" y="52" width="320" height="320" rx="2" />
        <rect x="106" y="38" width="348" height="348" rx="3" opacity="0.6" />
      </g>
      <rect x="106" y="386" width="348" height="7" rx="2" fill="hsl(var(--sm-line-strong))" />

      {/* --- cassette + control cue --- */}
      <rect x="112" y="32" width="336" height="20" rx="4" fill="hsl(var(--sm-ink-raised))" />
      <rect x="112" y="32" width="336" height="20" rx="4" fill="none" stroke="hsl(var(--sm-line-strong))" />
      <circle
        className="hero-window__click"
        cx="428"
        cy="42"
        r="6"
        fill="none"
        stroke="hsl(var(--sm-accent))"
        strokeWidth="1.6"
      />
      <circle cx="428" cy="42" r="2.4" fill="hsl(var(--sm-accent))" />

      {/* --- side cord --- */}
      <g className="hero-window__cord">
        <path
          d="M462 52 V292"
          stroke="hsl(var(--sm-line-strong))"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="462" cy="298" r="4" fill="hsl(var(--sm-mute))" opacity="0.55" />
      </g>

      {/* --- light on the floor --- */}
      <g className="hero-window__beam">
        <path d="M126 393 H434 L502 462 H58 Z" fill="url(#hw-beam-g)" />
      </g>
      <ellipse
        className="hero-window__glow"
        cx="280"
        cy="410"
        rx="210"
        ry="62"
        fill="url(#hw-glow-g)"
      />

      {/* dust drifting through the light */}
      {MOTES.map((m, i) => (
        <circle
          key={i}
          className="hero-window__mote"
          cx={m.cx}
          cy={m.cy}
          r={m.r}
          fill="hsl(var(--sm-sky-soft))"
          style={
            {
              "--dx": `${m.dx}px`,
              "--dy": `${m.dy}px`,
              "--dur": m.dur,
              "--phase": m.phase,
              "--peak": m.peak,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  )
}
