"use client"

import { useEffect, useRef, useState } from "react"
import { ProcessWindow } from "./ProcessWindow"
import { SERVICES } from "@/lib/site"

export function Process() {
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<Array<HTMLLIElement | null>>([])

  /**
   * The active step is computed from position rather than from an
   * IntersectionObserver band. A band only reports steps that actually cross
   * it, so any jump — a scrollbar drag, Home/End, an anchor link — can skip
   * every step and leave the pinned window showing a stale stage. Measuring
   * each frame is correct at any scroll position and costs one rect per step.
   */
  useEffect(() => {
    let raf = 0

    const update = () => {
      raf = 0
      const steps = stepRefs.current.filter(
        (el): el is HTMLLIElement => el !== null
      )
      if (steps.length === 0) return

      // Desktop reads the middle of the viewport. On mobile the pinned window
      // covers the top of the screen, so the line has to sit below it —
      // otherwise the step marked active is the one hidden behind the window.
      const wide = window.matchMedia("(min-width: 1024px)").matches
      const line = window.innerHeight * (wide ? 0.5 : 0.82)

      let current = 0
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].getBoundingClientRect().top <= line) current = i
        else break
      }
      setActiveStep(current)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="services" className="py-20 md:py-28" aria-labelledby="services-title">
      <div className="shell grid items-stretch gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        {/* The bottom padding is runway: without it the window unpins while the
            last step is still being read. */}
        <div className="pb-[32vh] lg:pb-[38vh]">
          <p className="hud text-faint">Services</p>
          <h2
            id="services-title"
            className="display text-bone mt-4 text-[clamp(34px,4.6vw,64px)]"
          >
            We measure &amp; install
          </h2>
          <p className="text-mute mt-5 max-w-[38rem] text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
            Everything from fabric samples to final adjustments, handled by
            ShadeMaster. We bring physical samples to your home, measure every
            window, and provide clear pricing before we order anything.
          </p>

          {/* Mobile: the window has to live inside this column to pin at all —
              in a single-column grid its own column would be exactly its own
              height, leaving sticky nothing to travel through. */}
          <div className="bg-ink border-line sticky top-[62px] z-10 mt-8 border-b pb-4 pt-5 lg:hidden">
            <div className="mx-auto h-[280px] w-[240px] sm:h-[340px] sm:w-[290px]">
              <ProcessWindow step={activeStep} />
            </div>
          </div>

          {/* Each step gets its own stretch of scroll, so the window has time to
              be read before the next state takes over. */}
          <ol className="mt-10 flex flex-col gap-[18vh] lg:mt-14">
            {SERVICES.map((service, index) => (
              <li
                key={service.title}
                data-step={index}
                ref={(el) => {
                  stepRefs.current[index] = el
                }}
                className={`flex gap-5 transition-opacity duration-500 motion-reduce:transition-none ${
                  activeStep === index ? "opacity-100" : "opacity-45"
                }`}
              >
                <span
                  className={`hud shrink-0 pt-1.5 transition-colors duration-500 motion-reduce:transition-none ${
                    activeStep === index ? "text-sky-brand" : "text-faint"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display text-bone text-[clamp(24px,2.6vw,38px)]">
                    {service.title}
                  </h3>
                  <p className="text-mute mt-2.5 max-w-[34rem] text-[0.98rem] leading-[1.65]">
                    {service.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="max-lg:hidden">
          <div className="sticky top-28">
            <div className="mx-auto h-[440px] w-full max-w-[380px]">
              <ProcessWindow step={activeStep} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
