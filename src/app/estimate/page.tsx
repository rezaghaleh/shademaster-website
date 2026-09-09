"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"

type ProductType = "roller" | "zebra"

type LineItem = {
  id: number
  width: number // inches
  height: number // inches
  productType: ProductType
  motorized: boolean
  quantity: number
}

const MAX_ITEMS = 30
const MOTOR_SURCHARGE = 215 // your motorized price per shade

// 👉 YOUR REAL FORMULA
function calculateLinePrice(item: LineItem): number {
  // 1) inches -> feet, round UP
  const widthFt = Math.ceil(item.width / 12)
  const heightFt = Math.ceil(item.height / 12)

  // 2) square footage
  const sqft = widthFt * heightFt

  // 3) rate: roller vs zebra
  const rate = item.productType === "roller" ? 4.5 : 4.75

  // 4) base price per shade
  let pricePerShade = sqft * rate

  // 5) motorized surcharge
  if (item.motorized) {
    pricePerShade += MOTOR_SURCHARGE
  }

  // 6) quantity
  return pricePerShade * item.quantity
}

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
})

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export default function EstimatePage() {
  const [items, setItems] = useState<LineItem[]>([])
  const [width, setWidth] = useState<string>("")
  const [height, setHeight] = useState<string>("")
  const [productType, setProductType] = useState<ProductType>("roller")
  const [motorized, setMotorized] = useState<boolean>(false)
  const [quantity, setQuantity] = useState<string>("1")
  const [error, setError] = useState<string | null>(null)

  const totalEstimate = useMemo(
    () => items.reduce((sum, item) => sum + calculateLinePrice(item), 0),
    [items]
  )

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return

    const w = Number(width)
    const h = Number(height)
    const q = Number(quantity)

    if (!w || !h || !q || w <= 0 || h <= 0 || q <= 0) {
      setError("Please enter valid width, height, and quantity.")
      return
    }

    const newItem: LineItem = {
      id: Date.now(),
      width: w,
      height: h,
      productType,
      motorized,
      quantity: q,
    }

    setItems((prev) => [...prev, newItem])
    setError(null)
    setWidth("")
    setHeight("")
    setQuantity("1")
    setMotorized(false)
  }

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <main id="main" tabIndex={-1} className="pt-[62px]">
      <div className="shell space-y-8 py-14 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="hud text-faint">Vancouver • Pre-Quote Calculator</p>
            <h1 className="display text-bone mt-4 max-w-[14ch] text-[clamp(34px,4.8vw,68px)]">
              Pre-Quote Price Estimate
            </h1>
            <p className="text-mute mt-5 max-w-xl text-[clamp(1rem,1.4vw,1.14rem)] leading-[1.65]">
              Enter your window sizes to get a rough idea of your project cost.
              Final pricing will be confirmed after an in-home visit.
            </p>
          </div>
          <span className="hud text-faint border-line shrink-0 rounded-full border px-3 py-1.5">
            Up to {MAX_ITEMS} windows / shades
          </span>
        </header>

        {/* 1 — add a window */}
        <section
          className="border-line bg-ink-raised/50 rounded-2xl border p-6"
          aria-labelledby="add-title"
        >
          <h2 id="add-title" className="hud text-sky-brand">
            01 — Add a window / shade
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-4">
            <div className="space-y-2">
              <label className="hud text-faint block" htmlFor="est-width">
                Width (inches)
              </label>
              <input
                id="est-width"
                className={inputClass}
                type="number"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g. 78"
              />
            </div>
            <div className="space-y-2">
              <label className="hud text-faint block" htmlFor="est-height">
                Height (inches)
              </label>
              <input
                id="est-height"
                className={inputClass}
                type="number"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 57"
              />
            </div>
            <div className="space-y-2">
              <label className="hud text-faint block" htmlFor="est-qty">
                Quantity
              </label>
              <input
                id="est-qty"
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="hud text-faint mb-2">Product type</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["roller", "zebra"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProductType(type)}
                    aria-pressed={productType === type}
                    className={`hud rounded-lg border px-3 py-2.5 capitalize transition-colors ${
                      productType === type
                        ? "border-sky-brand bg-sky-brand/15 text-bone"
                        : "border-line-strong text-mute hover:text-bone"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="border-line mt-6 flex flex-wrap items-center justify-between gap-5 border-t pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setMotorized((m) => !m)}
                aria-pressed={motorized}
                className={`hud inline-flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors ${
                  motorized
                    ? "border-sky-brand bg-sky-brand/15 text-bone"
                    : "border-line-strong text-mute hover:text-bone"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-colors ${
                    motorized ? "bg-sky-brand" : "bg-faint"
                  }`}
                  aria-hidden="true"
                />
                {motorized ? "Motorized (LL OneTouch™)" : "Manual control"}
              </button>
              <p className="text-faint text-xs">
                Motorization adds ${MOTOR_SURCHARGE} per shade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={items.length >= MAX_ITEMS}
                className="btn btn-primary !py-2.5 !text-[0.85rem] disabled:pointer-events-none disabled:opacity-50"
              >
                Add to estimate
              </button>
              {items.length >= MAX_ITEMS && (
                <p className="text-xs text-red-400">
                  You’ve reached the maximum of {MAX_ITEMS} items.
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-red-400 empty:hidden" role="alert">
            {error}
          </p>
        </section>

        {/* 2 — the list */}
        <section
          className="border-line bg-ink-raised/50 rounded-2xl border p-6"
          aria-labelledby="items-title"
        >
          <h2 id="items-title" className="hud text-sky-brand">
            02 — Your estimate items
          </h2>

          {items.length === 0 ? (
            <p className="text-faint mt-6 text-sm">
              No items yet. Enter a window above and click{" "}
              <span className="text-mute font-medium">“Add to estimate”.</span>
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="hud text-faint border-line hidden grid-cols-[1.3fr_1fr_1.1fr_0.7fr_0.9fr_auto] gap-3 border-b pb-3 md:grid">
                <span>Window</span>
                <span>Type</span>
                <span>Control</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Line total</span>
                <span className="w-8" />
              </div>

              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    className="border-line bg-ink/60 grid grid-cols-1 gap-2 rounded-xl border p-4 text-sm md:grid-cols-[1.3fr_1fr_1.1fr_0.7fr_0.9fr_auto] md:items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="hud text-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-bone font-medium tabular-nums">
                        {item.width}&quot; × {item.height}&quot;
                      </span>
                    </div>
                    <span className="text-mute capitalize max-md:hidden">
                      {item.productType}
                    </span>
                    <span className="text-mute max-md:hidden">
                      {item.motorized ? "Motorized" : "Manual"}
                    </span>
                    <span className="text-mute text-xs md:hidden">
                      {item.productType === "roller" ? "Roller" : "Zebra"} •{" "}
                      {item.motorized ? "Motorized" : "Manual"}
                    </span>
                    <span className="text-mute tabular-nums md:text-right">
                      <span className="hud text-faint mr-2 md:hidden">Qty</span>
                      {item.quantity}
                    </span>
                    <span className="text-bone font-semibold tabular-nums md:text-right">
                      {currency.format(calculateLinePrice(item))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="border-line-strong text-faint hover:border-red-400/50 hover:text-red-400 ml-auto grid h-8 w-8 place-items-center rounded-full border transition-colors"
                      aria-label={`Remove window ${index + 1}`}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* total */}
        <section
          className="border-line bg-ink-raised/50 flex flex-col gap-6 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between"
          aria-labelledby="total-title"
        >
          <div>
            <h2 id="total-title" className="hud text-faint">
              Estimated project total
            </h2>
            <p className="display text-bone mt-3 text-[clamp(38px,6vw,72px)] tabular-nums">
              {currency.format(totalEstimate)}
            </p>
            <p className="text-faint mt-4 max-w-sm text-xs leading-[1.6]">
              This is a rough estimate only. Final pricing may change based on
              exact measurements, fabric choice, hardware, installation
              conditions, and taxes.
            </p>
          </div>
          <div className="md:max-w-xs">
            <Link className="btn btn-primary w-full" href="/#contact">
              Send this estimate to ShadeMaster
            </Link>
            <p className="text-faint mt-4 text-xs leading-[1.6]">
              Mention this total when you contact us and we’ll confirm everything
              on a free in-home visit.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
