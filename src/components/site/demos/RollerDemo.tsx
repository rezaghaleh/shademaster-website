"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const OPENING_TOP = 22
const OPENING_H = 90

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The interactive one. Drag the shade, hold the rail, or use the arrow keys —
 * the fabric follows and the daylight behind it dims to match. That is the
 * whole product in one control: you decide how much light comes in.
 *
 * `active` (hover or scrolled into view) plays a short one-shot demonstration
 * so the card reads on touch, where there is no hover. The demo stands down the
 * moment the visitor takes over.
 */
export function RollerDemo({ active }: { active: boolean }) {
  // 0 = rolled all the way up, 1 = fully lowered
  const [pos, setPos] = useState(0.28)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const trackRef = useRef<SVGRectElement>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => () => clearTimers(), [])

  // One-shot demonstration when the card becomes active on touch/hover.
  useEffect(() => {
    if (!active || touched) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPos(0.6)
      return
    }
    clearTimers()
    timers.current.push(window.setTimeout(() => setPos(0.82), 260))
    timers.current.push(window.setTimeout(() => setPos(0.34), 1500))
    timers.current.push(window.setTimeout(() => setPos(0.6), 2600))
    return clearTimers
  }, [active, touched])

  const setFromPointer = useCallback((clientY: number) => {
    const track = trackRef.current
    if (!track) return
    const box = track.getBoundingClientRect()
    setPos(clamp01((clientY - box.top) / box.height))
  }, [])

  const nudge = (delta: number) => {
    setTouched(true)
    clearTimers()
    setPos((p) => clamp01(p + delta))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault()
        nudge(0.1)
        break
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault()
        nudge(-0.1)
        break
      case "Home":
        e.preventDefault()
        nudge(-1)
        break
      case "End":
        e.preventDefault()
        nudge(1)
        break
    }
  }

  const percent = Math.round(pos * 100)

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`demo-roller ${dragging ? "is-dragging" : ""} cursor-ns-resize rounded-lg`}
        role="slider"
        tabIndex={0}
        aria-label="Roller shade position — drag or use the arrow keys"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% lowered`}
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.preventDefault()
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          setTouched(true)
          clearTimers()
          setDragging(true)
          setFromPointer(e.clientY)
        }}
        onPointerMove={(e) => {
          if (dragging) setFromPointer(e.clientY)
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <svg viewBox="0 0 200 130" className="w-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="dr-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--sm-sky-soft))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(var(--sm-accent))" stopOpacity="0.35" />
            </linearGradient>
            <clipPath id="dr-opening">
              <rect x="18" y={OPENING_TOP} width="164" height={OPENING_H} rx="2" />
            </clipPath>
          </defs>

          {/* daylight behind the fabric */}
          <g clipPath="url(#dr-opening)">
            <rect
              className="demo-roller__light"
              x="18"
              y={OPENING_TOP}
              width="164"
              height={OPENING_H}
              fill="url(#dr-light)"
              style={{ opacity: 1 - pos * 0.88 }}
            />
            <rect
              className="demo-roller__fabric"
              x="18"
              y={OPENING_TOP}
              width="164"
              height={OPENING_H}
              fill="hsl(var(--sm-ink-raised))"
              style={{ transform: `scaleY(${pos})` }}
            />
          </g>

          {/* the rail the visitor is really dragging */}
          <g
            className="demo-roller__rail"
            style={{ transform: `translateY(${-OPENING_H * (1 - pos)}px)` }}
          >
            <rect
              x="14"
              y={OPENING_TOP + OPENING_H - 4}
              width="172"
              height="7"
              rx="2"
              fill="hsl(var(--sm-mute))"
            />
            <rect
              x="88"
              y={OPENING_TOP + OPENING_H + 3}
              width="24"
              height="3"
              rx="1.5"
              fill="hsl(var(--sm-mute))"
              opacity="0.6"
            />
          </g>

          {/* frame + cassette */}
          <rect
            x="18"
            y={OPENING_TOP}
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

          {/* hit target for the drag */}
          <rect
            ref={trackRef}
            x="18"
            y={OPENING_TOP}
            width="164"
            height={OPENING_H}
            fill="transparent"
          />
        </svg>
      </div>

      <p className="hud text-faint flex items-center justify-between gap-3">
        <span>Drag or arrow keys</span>
        <span className="text-sky-brand tabular-nums">{percent}% lowered</span>
      </p>
    </div>
  )
}
