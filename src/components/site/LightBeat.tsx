"use client"

import { useSectionProgress } from "@/hooks/useSectionProgress"

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const sub = (from: number, to: number, p: number) => clamp01((p - from) / (to - from))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

const OPENING_TOP = 60
const OPENING_H = 280

/**
 * The emotional centre, as pure motion: a room at midday, and the scroll is a
 * hand on the shade. Harsh flat light narrows to a single calm band across the
 * floor, and the whole thing resolves into the one line that says what this
 * company actually does.
 *
 * The sticky pin releases around progress 0.8, so everything — including the
 * copy — has to have arrived before then, or nobody ever sees the payoff.
 */
export function LightBeat() {
  const [ref, progress] = useSectionProgress(0.04, 0.82)

  // With a 220vh spacer the pin releases around progress 0.83, so both the
  // shade and the copy have to be finished well before that. Measured on a
  // 900px viewport: the shade settles ~560px and the copy lands ~290px of
  // scroll before the element unpins.
  const draw = easeInOut(sub(0.05, 0.58, progress))
  const textIn = sub(0.5, 0.7, progress)

  const drop = lerp(0.08, 0.62, draw)
  const beamScale = lerp(1, 0.32, draw)
  const beamOpacity = lerp(1, 0.5, draw)
  const glare = 1 - draw

  return (
    <section aria-labelledby="lightbeat-title">
      <div className="h-[220vh]" ref={ref}>
        <div className="sticky top-0 flex h-[100dvh] flex-col justify-center">
          <div className="shell w-full">
            <div className="mx-auto h-[38vh] w-full max-w-[860px] md:h-[42vh]">
              <svg
                viewBox="0 0 900 500"
                className="h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="lb-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="lb-beam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="lb-glare" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
                  </radialGradient>
                  <clipPath id="lb-opening">
                    <rect x="150" y={OPENING_TOP} width="600" height={OPENING_H} rx="2" />
                  </clipPath>
                </defs>

                <g clipPath="url(#lb-opening)">
                  <rect x="150" y={OPENING_TOP} width="600" height={OPENING_H} fill="url(#lb-sky)" />
                  <path
                    d="M150 236 L246 178 L318 214 L404 160 L500 220 L590 176 L672 214 L750 188 V340 H150Z"
                    fill="hsl(var(--sm-ink-deep))"
                    opacity="0.45"
                  />
                  {/* the shade coming down */}
                  <rect
                    x="150"
                    y={OPENING_TOP}
                    width="600"
                    height={OPENING_H}
                    fill="hsl(var(--sm-ink-raised))"
                    style={{
                      transform: `scaleY(${drop})`,
                      transformOrigin: "center top",
                    }}
                  />
                </g>

                {/* bottom rail */}
                <rect
                  x="144"
                  y={OPENING_TOP + OPENING_H - 6}
                  width="612"
                  height="10"
                  rx="2"
                  fill="hsl(var(--sm-mute))"
                  style={{ transform: `translateY(${-OPENING_H * (1 - drop)}px)` }}
                />

                {/* casing */}
                <g stroke="hsl(var(--sm-line-strong))" strokeWidth="2" fill="none">
                  <rect x="150" y={OPENING_TOP} width="600" height={OPENING_H} rx="2" />
                  <rect x="132" y="42" width="636" height="316" rx="3" opacity="0.55" />
                </g>
                <rect x="132" y="358" width="636" height="8" rx="2" fill="hsl(var(--sm-line-strong))" />
                <rect x="140" y="30" width="620" height="16" rx="4" fill="hsl(var(--sm-ink-raised))" stroke="hsl(var(--sm-line-strong))" />

                {/* light on the floor — wide and flat, then a single calm band */}
                <g
                  style={{
                    transform: `scaleX(${beamScale})`,
                    transformOrigin: "450px 366px",
                    opacity: beamOpacity,
                  }}
                >
                  <path d="M156 366 H744 L860 494 H40 Z" fill="url(#lb-beam)" />
                </g>
                <ellipse
                  cx="450"
                  cy="392"
                  rx="380"
                  ry="72"
                  fill="url(#lb-glare)"
                  style={{ opacity: glare * 0.8 }}
                />
              </svg>
            </div>

            <div
              className="mx-auto mt-6 max-w-[46rem] text-center"
              style={{
                opacity: textIn,
                transform: `translateY(${(1 - textIn) * 18}px)`,
              }}
            >
              <h2
                id="lightbeat-title"
                className="display text-bone text-[clamp(36px,5.6vw,78px)]"
              >
                Light control &amp; privacy experts
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
