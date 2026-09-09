"use client"

import { useInView } from "@/hooks/useInView"
import { CONTACT, SITE } from "@/lib/site"

const OPENING_H = 180

/**
 * The end of the story: the shade travels to the position it was measured for
 * and stops there, light settled exactly where the room wanted it. Everything
 * above was about getting to this one set position.
 */
export function Arrival() {
  const [ref, inView] = useInView<HTMLDivElement>({
    threshold: 0.35,
    rootMargin: "0px 0px -8% 0px",
  })

  return (
    <section
      id="arrival"
      className="pb-24 pt-10 md:pb-32"
      aria-labelledby="arrival-title"
    >
      <div
        className={`shell flex flex-col items-center text-center ${
          inView ? "is-arrived" : ""
        }`}
        ref={ref}
      >
        <div className="w-full max-w-[440px]">
          <svg viewBox="0 0 400 300" className="w-full" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="ar-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.95" />
                <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="ar-floor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.34" />
                <stop offset="100%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0" />
              </linearGradient>
              <clipPath id="ar-opening">
                <rect x="110" y="30" width="180" height={OPENING_H} rx="2" />
              </clipPath>
            </defs>

            <g clipPath="url(#ar-opening)">
              <rect x="110" y="30" width="180" height={OPENING_H} fill="url(#ar-sky)" />
              <path
                d="M110 148 L146 118 L172 138 L206 108 L242 142 L268 122 L290 138 V210 H110Z"
                fill="hsl(var(--sm-ink-deep))"
                opacity="0.45"
              />
              <rect
                className="arrival__fabric"
                x="110"
                y="30"
                width="180"
                height={OPENING_H}
                fill="hsl(var(--sm-ink-raised))"
              />
            </g>

            <g className="arrival__rail">
              <rect x="105" y="204" width="190" height="8" rx="2" fill="hsl(var(--sm-mute))" />
            </g>

            <g stroke="hsl(var(--sm-line-strong))" strokeWidth="2" fill="none">
              <rect x="110" y="30" width="180" height={OPENING_H} rx="2" />
              <rect x="96" y="16" width="208" height="208" rx="3" opacity="0.6" />
            </g>
            <rect x="96" y="224" width="208" height="7" rx="2" fill="hsl(var(--sm-line-strong))" />
            <rect x="102" y="8" width="196" height="12" rx="3" fill="hsl(var(--sm-ink-raised))" stroke="hsl(var(--sm-line-strong))" />

            {/* set, and holding */}
            <circle
              className="arrival__pulse"
              cx="290"
              cy="14"
              r="7"
              fill="none"
              stroke="hsl(var(--sm-accent))"
              strokeWidth="1.6"
            />
            <circle cx="290" cy="14" r="2.6" fill="hsl(var(--sm-accent))" />

            <g className="arrival__light">
              <path d="M100 231 H300 L372 296 H28 Z" fill="url(#ar-floor)" />
            </g>
          </svg>
        </div>

        <p className="hud text-sky-brand mt-8">{SITE.tagline}</p>

        <h2
          id="arrival-title"
          className="display text-bone mt-5 max-w-[15ch] text-[clamp(40px,6vw,86px)]"
        >
          Book your free in-home measure
        </h2>

        <p className="text-mute mt-7 max-w-[36rem] text-[clamp(1rem,1.5vw,1.18rem)] leading-[1.65]">
          We’ll bring fabric samples, measure every window, and provide a clear
          quote.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a className="btn btn-primary" href={CONTACT.phoneHref}>
            {CONTACT.phone}
          </a>
          <a className="btn btn-ghost" href={CONTACT.emailHref}>
            {CONTACT.email}
          </a>
        </div>
      </div>
    </section>
  )
}
