"use client"

/**
 * Zebra / dual shades: two banded layers. Nudge one against the other and the
 * sheer stripes line up with the solid ones — the view goes from open to
 * private without the shade moving at all. That alignment is the entire point
 * of the product, so it is the only thing this demo animates.
 *
 * Driven by `.is-active` on the card, so it plays on hover and on scroll.
 */
export function ZebraDemo() {
  const bands = [0, 1, 2, 3, 4, 5]

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 200 130" className="w-full" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dz-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.4" />
          </linearGradient>
          <clipPath id="dz-opening">
            <rect x="18" y="22" width="164" height="90" rx="2" />
          </clipPath>
        </defs>

        <g clipPath="url(#dz-opening)">
          {/* daylight, dimmed as the bands close */}
          <rect
            className="demo-zebra__glow"
            x="18"
            y="22"
            width="164"
            height="90"
            fill="url(#dz-light)"
          />

          {/* back layer — fixed */}
          {bands.map((i) => (
            <rect
              key={`b${i}`}
              x="18"
              y={22 + i * 28}
              width="164"
              height="14"
              fill="hsl(var(--sm-ink-raised))"
              opacity="0.92"
            />
          ))}

          {/* front layer — slides down to close the gaps */}
          <g className="demo-zebra__bands">
            {bands.map((i) => (
              <rect
                key={`f${i}`}
                x="18"
                y={8 + i * 28}
                width="164"
                height="14"
                fill="hsl(var(--sm-ink-deep))"
                opacity="0.95"
              />
            ))}
          </g>
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

      <p className="hud text-faint">Sheer → private, no travel</p>
    </div>
  )
}
