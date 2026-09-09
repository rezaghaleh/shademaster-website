"use client"

/**
 * The pinned visual for the services sequence: one window that keeps changing
 * as the steps scroll past it — measured, then dressed, then motorised, then
 * finished. It is the same window each time, which is the point: this is what
 * ShadeMaster does to your actual opening.
 *
 * Every layer is toggled by `data-on`, so each state fades to its resolved form
 * and reduced motion simply lands on it with no transition.
 */

const OPENING_TOP = 54
const OPENING_H = 272

/** Shade drop per step: nothing for the first two, then dressed and finished. */
const DROP = [0, 0, 0.52, 0.36]

export function ProcessWindow({ step }: { step: number }) {
  const on = (n: number) => (step === n ? "true" : "false")
  const shadeOn = step >= 2
  const drop = DROP[step] ?? 0

  return (
    <svg
      viewBox="0 0 340 400"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="pw-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
        </linearGradient>
        <clipPath id="pw-opening">
          <rect x="44" y={OPENING_TOP} width="252" height={OPENING_H} rx="2" />
        </clipPath>
      </defs>

      {/* daylight in the opening */}
      <g clipPath="url(#pw-opening)">
        <rect x="44" y={OPENING_TOP} width="252" height={OPENING_H} fill="url(#pw-sky)" />
        <path
          d="M44 210 L96 168 L134 194 L182 152 L232 196 L272 172 L296 190 V326 H44Z"
          fill="hsl(var(--sm-ink-deep))"
          opacity="0.5"
        />

        {/* 02 — fabric options brought to the window */}
        <g className="pw-part" data-on={on(1)}>
          <rect x="44" y={OPENING_TOP} width="84" height={OPENING_H} fill="hsl(var(--sm-ink-raised))" opacity="0.55" />
          <rect x="128" y={OPENING_TOP} width="84" height={OPENING_H} fill="hsl(var(--sm-ink-raised))" opacity="0.8" />
          <rect x="212" y={OPENING_TOP} width="84" height={OPENING_H} fill="hsl(var(--sm-ink-deep))" opacity="0.95" />
          <rect
            x="129"
            y={OPENING_TOP + 1}
            width="82"
            height={OPENING_H - 2}
            fill="none"
            stroke="hsl(var(--sm-accent))"
            strokeWidth="2"
          />
        </g>

        {/* 03 / 04 — the shade, installed */}
        <rect
          className="pw-shade__fabric"
          x="44"
          y={OPENING_TOP}
          width="252"
          height={OPENING_H}
          fill="hsl(var(--sm-ink-raised))"
          style={{ transform: `scaleY(${drop})`, transformOrigin: "center top" }}
          opacity={shadeOn ? 1 : 0}
        />
      </g>

      {/* bottom rail, travelling with the fabric edge */}
      <g
        className="pw-shade__rail"
        style={{ transform: `translateY(${-OPENING_H * (1 - drop)}px)` }}
        opacity={shadeOn ? 1 : 0}
      >
        <rect x="40" y={OPENING_TOP + OPENING_H - 6} width="260" height="10" rx="2" fill="hsl(var(--sm-mute))" />
      </g>

      {/* casing */}
      <g stroke="hsl(var(--sm-line-strong))" strokeWidth="2" fill="none">
        <rect x="44" y={OPENING_TOP} width="252" height={OPENING_H} rx="2" />
        <rect x="30" y="40" width="280" height="300" rx="3" opacity="0.6" />
      </g>
      <rect x="30" y="340" width="280" height="8" rx="2" fill="hsl(var(--sm-line-strong))" />

      {/* 01 — measured to the millimetre */}
      <g className="pw-part" data-on={on(0)}>
        <g stroke="hsl(var(--sm-accent))" strokeWidth="1.4" strokeLinecap="round">
          <path className="pw-measure__line" d="M44 30 H296" pathLength={1} />
          <path className="pw-measure__line" d="M18 54 V326" pathLength={1} />
          <path d="M44 24v12M296 24v12M12 54h12M12 326h12" />
        </g>
        <text
          x="170"
          y="20"
          textAnchor="middle"
          fill="hsl(var(--sm-accent))"
          fontSize="11"
          fontFamily="var(--sm-font-mono)"
          letterSpacing="1.6"
        >
          WIDTH
        </text>
        <text
          x="10"
          y="196"
          textAnchor="middle"
          fill="hsl(var(--sm-accent))"
          fontSize="11"
          fontFamily="var(--sm-font-mono)"
          letterSpacing="1.6"
          transform="rotate(-90 10 196)"
        >
          DROP
        </text>
      </g>

      {/* 03 — the motor, and the command reaching it */}
      <g className="pw-part" data-on={on(2)}>
        <rect x="252" y="30" width="52" height="18" rx="4" fill="hsl(var(--sm-ink-raised))" stroke="hsl(var(--sm-line-strong))" />
        <circle cx="296" cy="39" r="3" fill="hsl(var(--sm-accent))" />
        <circle
          className="pw-motor__wave"
          cx="296"
          cy="39"
          r="8"
          fill="none"
          stroke="hsl(var(--sm-accent))"
          strokeWidth="1.5"
        />
      </g>

      {/* 04 — seated brackets, and the light it was all for */}
      <g className="pw-part" data-on={on(3)}>
        <g fill="hsl(var(--sm-accent))">
          <rect x="44" y="44" width="14" height="8" rx="2" />
          <rect x="282" y="44" width="14" height="8" rx="2" />
        </g>
        <path d="M40 348 H300 L338 396 H2 Z" fill="url(#pw-floor)" />
      </g>
    </svg>
  )
}
