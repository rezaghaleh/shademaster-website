"use client"

import { useEffect, useRef, useState } from "react"

const OPENING_H = 90
const OPEN = 0.16
const CLOSED = 0.88

/**
 * Motorisation. Press the control and the shade drives itself to the other
 * preset — no cord, no reaching. The signal ring is the part that matters:
 * the command travels, then the rail moves.
 *
 * A real <button>, so Enter and Space work without any extra key handling.
 */
export function MotorDemo({ active }: { active: boolean }) {
  const [closed, setClosed] = useState(false)
  const [sending, setSending] = useState(false)
  const [touched, setTouched] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => () => clearTimers(), [])

  // Demonstrate once when the card comes into view, for touch devices.
  useEffect(() => {
    if (!active || touched) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    clearTimers()
    timers.current.push(
      window.setTimeout(() => {
        setSending(true)
        setClosed(true)
      }, 420)
    )
    timers.current.push(window.setTimeout(() => setSending(false), 1320))
    return clearTimers
  }, [active, touched])

  const press = () => {
    setTouched(true)
    clearTimers()
    setSending(true)
    setClosed((c) => !c)
    timers.current.push(window.setTimeout(() => setSending(false), 900))
  }

  const pos = closed ? CLOSED : OPEN

  return (
    <div className="flex flex-col gap-3">
      <div className={`demo-motor ${sending ? "is-sending" : ""}`}>
        <svg viewBox="0 0 200 130" className="w-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="dm-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.35" />
            </linearGradient>
            <clipPath id="dm-opening">
              <rect x="18" y="22" width="164" height={OPENING_H} rx="2" />
            </clipPath>
          </defs>

          <g clipPath="url(#dm-opening)">
            <rect x="18" y="22" width="164" height={OPENING_H} fill="url(#dm-light)" />
            <rect
              className="demo-motor__fabric"
              x="18"
              y="22"
              width="164"
              height={OPENING_H}
              fill="hsl(var(--sm-ink-raised))"
              style={{ transform: `scaleY(${pos})` }}
            />
          </g>

          <g
            className="demo-motor__rail"
            style={{ transform: `translateY(${-OPENING_H * (1 - pos)}px)` }}
          >
            <rect x="14" y={22 + OPENING_H - 4} width="172" height="7" rx="2" fill="hsl(var(--sm-mute))" />
          </g>

          <rect
            x="18"
            y="22"
            width="164"
            height={OPENING_H}
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

          {/* the command reaching the motor */}
          <circle
            className="demo-motor__signal"
            cx="172"
            cy="16"
            r="7"
            fill="none"
            stroke="hsl(var(--sm-accent))"
            strokeWidth="1.6"
          />
          <circle cx="172" cy="16" r="2.6" fill="hsl(var(--sm-accent))" />
        </svg>
      </div>

      <button
        type="button"
        onClick={press}
        aria-pressed={closed}
        className="border-line-strong hover:border-sky-brand/60 hover:bg-sky-brand/10 text-bone flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150"
      >
        <span className="hud">LL OneTouch™</span>
        <span className="hud text-sky-brand">
          {closed ? "Closed" : "Open"}
        </span>
      </button>
    </div>
  )
}
