"use client"

import { useState } from "react"
import { MotorDemo } from "./demos/MotorDemo"
import { RollerDemo } from "./demos/RollerDemo"
import { WoodDemo } from "./demos/WoodDemo"
import { ZebraDemo } from "./demos/ZebraDemo"
import { useInView } from "@/hooks/useInView"
import { PRODUCTS } from "@/lib/site"

function demoFor(id: string, active: boolean) {
  switch (id) {
    case "roller":
      return <RollerDemo active={active} />
    case "zebra":
      return <ZebraDemo />
    case "fauxwood":
      return <WoodDemo />
    default:
      return <MotorDemo active={active} />
  }
}

function ProductCard({
  id,
  name,
  desc,
  index,
}: {
  id: string
  name: string
  desc: string
  index: number
}) {
  const [hovered, setHovered] = useState(false)
  const [ref, inView] = useInView<HTMLLIElement>({ threshold: 0.4 })
  // Hover for pointers, scroll-into-view for touch — the demo runs either way.
  const active = hovered || inView

  return (
    <li
      ref={ref}
      className={`border-line bg-ink-raised/50 flex flex-col rounded-2xl border p-5 transition-colors duration-300 ${
        active ? "is-active border-sky-brand/30" : ""
      }`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="hud text-sky-brand">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="display text-bone mt-3 text-[clamp(23px,2.3vw,31px)]">
        {name}
      </h3>
      <p className="text-mute mt-2.5 text-[0.92rem] leading-[1.6]">{desc}</p>

      <div className="border-line mt-5 border-t pt-5">
        {demoFor(id, active)}
      </div>
    </li>
  )
}

export function Products() {
  return (
    <section id="products" className="py-20 md:py-28" aria-labelledby="products-title">
      <div className="shell">
        <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="hud text-faint">Products</p>
            <h2
              id="products-title"
              className="display text-bone mt-4 max-w-[16ch] text-[clamp(34px,4.6vw,64px)]"
            >
              Blinds &amp; shades we install every day
            </h2>
            <p className="text-mute mt-5 max-w-[38rem] text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
              Top choices for condos, townhomes, and single-family homes across
              Metro Vancouver.
            </p>
          </div>
          <p className="text-faint max-w-sm text-sm leading-[1.65]">
            Every product is measured to the millimeter and installed cleanly—no
            light gaps, no guesswork.
          </p>
        </div>

        <ul className="reveal mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PRODUCTS.map((p, i) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              desc={p.desc}
              index={i}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}
