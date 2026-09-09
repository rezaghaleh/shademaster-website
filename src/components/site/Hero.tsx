"use client"

import { useEffect, useState } from "react"
import { HeroWindow } from "./HeroWindow"
import { useInView } from "@/hooks/useInView"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import { useIntroDone } from "@/lib/introState"
import { STATS } from "@/lib/site"

export function Hero() {
  const reducedMotion = usePrefersReducedMotion()
  const introDone = useIntroDone()
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 })

  // Hold the sequence until the brand intro has cleared, so the two moments do
  // not play over the top of each other.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!introDone) return
    const t = window.setTimeout(() => setArmed(true), 120)
    return () => window.clearTimeout(t)
  }, [introDone])

  const live = armed && inView && !reducedMotion

  return (
    <section
      id="home"
      className="relative pt-[62px]"
      aria-labelledby="hero-title"
    >
      <div className="shell grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
        <div>
          <p className="hud text-sky-brand">Metro Vancouver • Mobile Showroom</p>

          <h1
            id="hero-title"
            className="display text-bone mt-6 text-[clamp(38px,5.2vw,76px)]"
          >
            <span className="block">Premium custom</span>
            <span className="block">window coverings—</span>
            <span className="text-sky-brand block">designed, measured,</span>
            <span className="block">&amp; installed.</span>
          </h1>

          <p className="text-mute mt-7 max-w-[38rem] text-[clamp(1rem,1.4vw,1.16rem)] leading-[1.65]">
            ShadeMaster Blinds LTD. helps homeowners and designers across Metro
            Vancouver find the perfect roller, zebra, and motorized shades—without
            the showroom hassle.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a className="btn btn-primary" href="#contact">
              Book Free Measure
            </a>
            <a className="btn btn-ghost" href="/estimate">
              Pre-Quote Price Estimate
            </a>
          </div>

          <p className="hud text-faint mt-7">
            400+ windows measured &amp; installed locally
          </p>

          <dl className="border-line mt-7 grid max-w-lg grid-cols-3 gap-5 border-t pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="hud text-faint text-[0.6rem]">{s.label}</dt>
                <dd className="display text-bone mt-2 text-[clamp(17px,2vw,26px)]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={ref}>
          <div className="relative mx-auto aspect-[560/470] w-full max-w-[560px]">
            <HeroWindow live={live} isStatic={reducedMotion} />
          </div>

          <dl className="border-line mt-6 grid grid-cols-2 gap-5 border-t pt-5">
            <div>
              <dt className="hud text-faint text-[0.6rem]">Popular for</dt>
              <dd className="text-mute mt-2 text-sm">
                Condos • Townhomes • Single family homes
              </dd>
            </div>
            <div>
              <dt className="hud text-faint text-[0.6rem]">Controls</dt>
              <dd className="text-mute mt-2 text-sm">
                Chain • Cordless • Motorized (LL OneTouch™)
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
