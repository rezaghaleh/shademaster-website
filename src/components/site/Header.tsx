"use client"

import type { CSSProperties } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "./Logo"
import { useScrollSpy } from "@/hooks/useScrollSpy"
import { NAV, SITE, SPY_IDS } from "@/lib/site"

const NO_SPY: readonly string[] = []

/** Items open in sequence and close in reverse — the template's cadence. */
const MENU_DELAYS = [
  { open: "delay-[180ms]", close: "delay-[250ms]" },
  { open: "delay-[240ms]", close: "delay-[200ms]" },
  { open: "delay-[300ms]", close: "delay-[150ms]" },
  { open: "delay-[360ms]", close: "delay-[100ms]" },
  { open: "delay-[420ms]", close: "delay-[50ms]" },
  { open: "delay-[480ms]", close: "delay-0" },
]

export function Header() {
  const pathname = usePathname()
  const home = pathname === "/"

  const [menuOpen, setMenuOpen] = useState(false)
  const activeSection = useScrollSpy(home ? SPY_IDS : NO_SPY)

  const listRef = useRef<HTMLUListElement>(null)
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const [rail, setRail] = useState({ x: 0, w: 0, ready: false })

  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menuOpen])

  const hrefFor = (item: (typeof NAV)[number]) => {
    if (item.kind === "page") return item.href
    return home ? `#${item.id}` : `/#${item.id}`
  }

  const isActive = (item: (typeof NAV)[number]) => {
    if (item.kind === "page") return pathname === item.href
    if (!home) return false
    if (item.id === "home") return activeSection === null || activeSection === "home"
    return activeSection === item.id
  }

  const activeIndex = NAV.findIndex(isActive)

  // The rail under the active item, sized and positioned from the real link box.
  useLayoutEffect(() => {
    const list = listRef.current
    const link = linkRefs.current[activeIndex]
    if (!list || !link || list.offsetParent === null) return

    const listRect = list.getBoundingClientRect()
    const rect = link.getBoundingClientRect()
    setRail((prev) => ({
      x: rect.left - listRect.left,
      w: rect.width,
      ready: prev.ready,
    }))
  }, [activeIndex, pathname])

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setRail((s) => ({ ...s, ready: true }))
    )
    const onResize = () => {
      const list = listRef.current
      const link = linkRefs.current[activeIndex]
      if (!list || !link || list.offsetParent === null) return
      const listRect = list.getBoundingClientRect()
      const rect = link.getBoundingClientRect()
      setRail((s) => ({ ...s, x: rect.left - listRect.left, w: rect.width }))
    }
    window.addEventListener("resize", onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [activeIndex])

  const railClass = rail.ready
    ? "transition-[translate,width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    : "opacity-0"
  const railStyle = {
    translate: `${rail.x}px 0`,
    width: `${rail.w}px`,
  } as CSSProperties

  const ctaHref = home ? "#contact" : "/#contact"

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="bg-ink/85 border-line border-b backdrop-blur-xl">
          <div className="shell flex h-[62px] items-center justify-between gap-4">
            <Link
              href="/"
              className="shrink-0"
              aria-label={`${SITE.name} — home`}
            >
              <Logo size={30} />
            </Link>

            <nav className="hidden lg:block" aria-label="Primary">
              <ul className="relative flex items-center gap-1" ref={listRef}>
                {/* the travelling rail — a bottom rail sliding to its position */}
                <span
                  className={`bg-sky-brand pointer-events-none absolute -bottom-[9px] h-[2px] rounded-full shadow-[0_0_10px_hsl(var(--sm-accent)/0.9)] ${railClass}`}
                  style={railStyle}
                  aria-hidden="true"
                />

                {NAV.map((item, index) => {
                  const active = isActive(item)
                  const className = `hud block px-3 py-2 transition-colors duration-200 ${
                    active ? "text-bone" : "text-faint hover:text-mute"
                  }`
                  const ariaCurrent = active
                    ? item.kind === "page"
                      ? ("page" as const)
                      : ("true" as const)
                    : undefined

                  return (
                    <li key={item.id}>
                      {item.kind === "page" ? (
                        <Link
                          ref={(el) => {
                            linkRefs.current[index] = el
                          }}
                          className={className}
                          href={item.href}
                          aria-current={ariaCurrent}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          ref={(el) => {
                            linkRefs.current[index] = el
                          }}
                          className={className}
                          href={hrefFor(item)}
                          aria-current={ariaCurrent}
                        >
                          {item.label}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="flex shrink-0 items-center gap-4">
              <a
                className="btn btn-primary hidden !px-4 !py-2 !text-[0.8rem] sm:inline-flex"
                href={ctaHref}
              >
                Free Quote
              </a>

              <button
                type="button"
                className="hud text-bone group inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 lg:hidden"
                aria-label="Open menu"
                aria-controls="main-menu-overlay"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                Menu
                <span
                  className="inline-flex w-[17px] flex-col justify-center gap-[3px]"
                  aria-hidden="true"
                >
                  <span className="block h-px w-full origin-right bg-current transition-transform duration-200" />
                  <span className="block h-px w-full origin-right bg-current transition-transform duration-200 group-hover:scale-x-[0.62]" />
                  <span className="block h-px w-full origin-right bg-current transition-transform duration-200" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen menu — wipes down like a shade, items arriving in sequence. */}
      <div
        id="main-menu-overlay"
        className={`bg-ink-deep text-bone fixed inset-0 z-[60] overflow-y-auto transition-[clip-path] duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none ${
          menuOpen
            ? "pointer-events-auto [clip-path:inset(0_0_0_0)]"
            : "pointer-events-none [clip-path:inset(0_0_100%_0)]"
        }`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
      >
        <div className="shell flex min-h-full flex-col py-5">
          <div className="border-line flex h-[52px] items-center justify-between border-b">
            <Logo size={28} />
            <button
              type="button"
              className="hud text-bone inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0"
              onClick={() => setMenuOpen(false)}
            >
              Close
              <span
                className="text-[22px] leading-[0.4] font-normal"
                aria-hidden="true"
              >
                ×
              </span>
            </button>
          </div>

          <nav className="my-auto w-full py-6" aria-label="Mobile">
            {NAV.map((item, index) => {
              // NAV is no longer a fixed-length tuple, so an added item must
              // not walk off the end of the delay table.
              const delays = MENU_DELAYS[index] ?? MENU_DELAYS[MENU_DELAYS.length - 1]
              const rowClass = `border-line hover:text-sky-brand grid grid-cols-[38px_1fr_auto] items-baseline gap-3 border-t py-3.5 transition-[opacity,translate,clip-path,color] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] last:border-b motion-reduce:transition-none ${
                menuOpen
                  ? `translate-y-0 opacity-100 [clip-path:inset(0_0_0_0)] ${delays.open}`
                  : `translate-y-[46px] opacity-0 [clip-path:inset(100%_0_0_0)] ${delays.close}`
              }`

              const inner = (
                <>
                  <span className="hud text-sky-brand">
                    0{index + 1}
                  </span>
                  <span className="display text-[clamp(34px,10.5vw,58px)]">
                    {item.label}
                  </span>
                  <span
                    className="text-[clamp(18px,3vw,28px)] leading-[0.8] font-light"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </>
              )

              return item.kind === "page" ? (
                <Link
                  className={rowClass}
                  href={item.href}
                  key={item.id}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item) ? "page" : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <a
                  className={rowClass}
                  href={hrefFor(item)}
                  key={item.id}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item) ? "true" : undefined}
                >
                  {inner}
                </a>
              )
            })}
          </nav>

          <div className="border-line text-faint flex justify-between gap-4 border-t pt-4">
            <span className="hud">{SITE.tagline}</span>
            <span className="hud max-sm:hidden">{SITE.location}</span>
          </div>
        </div>
      </div>
    </>
  )
}

