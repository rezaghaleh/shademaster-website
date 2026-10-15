/* The project form's pricing chain (src/lib/project-math.ts), checked against the same
 * cases as the backend's ProjectPricingTest. Run with `npm run project-pricing:verify`. */
import assert from "node:assert/strict"
import { measurementCostCents, projectFinancials, projectLine, projectPricing } from "../src/lib/project-math.ts"
import { calculateLinePrice } from "../src/lib/pricing.ts"
import type { LineItemInput } from "../src/lib/admin-api"

// A manual roller, 89" × 90": 8 ft × 8 ft = 64 sq ft × $4.50 = $288.00 of cost.
const window: LineItemInput = { width: 89, height: 90, quantity: 1, productType: "ROLLER", motorized: false }

// The measurements give the cost, not the selling price.
assert.equal(measurementCostCents(window), 28800)
assert.equal(projectLine(window, 50).baseCost, 28800)

// The project markup goes on top of the measurement cost — and never changes the cost.
for (const [markup, price] of [[0, 28800], [25, 36000], [50, 43200], [75, 50400], [100, 57600], [150, 72000]]) {
  const line = projectLine(window, markup)
  assert.equal(line.automatic, price, `${markup}% markup`)
  assert.equal(line.unit, price)
  assert.equal(line.baseCost, 28800)
  assert.equal(line.inheritsMarkup, true)
}

// The worked example: 50%, then 100%, then a manual $525 that later markup changes leave alone.
assert.deepEqual(projectFinancials([window], 50), { totalCost: 288, revenue: 432, grossProfit: 144, profitMarginPercent: 33.33 })
assert.deepEqual(projectFinancials([window], 100), { totalCost: 288, revenue: 576, grossProfit: 288, profitMarginPercent: 50 })
const manual = { ...window, unitPriceOverride: 525 }
assert.deepEqual(projectFinancials([manual], 100), { totalCost: 288, revenue: 525, grossProfit: 237, profitMarginPercent: 45.14 })
assert.equal(projectLine(manual, 150).unit, 52500)
assert.equal(projectLine(manual, 150).automatic, 72000)
assert.equal(projectLine(manual, 150).overridden, true)
assert.deepEqual(projectFinancials([{ ...window, unitPriceOverride: 400 }], 50),
  { totalCost: 288, revenue: 400, grossProfit: 112, profitMarginPercent: 28 })

// A supplier cost replaces the measurement cost — whole shade, motor included.
assert.equal(projectLine({ ...window, costPerUnit: 250 }, 50).baseCost, 25000)
assert.equal(projectLine({ ...window, costPerUnit: 250 }, 50).measurementCost, 28800)
assert.equal(projectLine({ ...window, costPerUnit: 250 }, 50).unit, 37500)
assert.equal(projectLine({ ...window, motorized: true, costPerUnit: 250 }, 50).unit, 37500)

// A window markup overrides the project's; an empty one follows the project.
assert.equal(projectLine({ ...window, markupOverridePercent: 75 }, 50).unit, 50400)
assert.equal(projectLine({ ...window, markupOverridePercent: 75 }, 100).unit, 50400)
assert.equal(projectLine({ ...window, markupOverridePercent: 75 }, 100).inheritsMarkup, false)
assert.equal(projectLine({ ...window, markupOverridePercent: null }, 100).unit, 57600)
assert.equal(projectLine({ ...window, markupOverridePercent: 0 }, 100).unit, 28800, "0% is a real markup")

// Quantity multiplies the price and the cost.
assert.deepEqual(projectFinancials([{ ...window, quantity: 3 }], 50),
  { totalCost: 864, revenue: 1296, grossProfit: 432, profitMarginPercent: 33.33 })

// The size formula still prices both products, motorized or not, at any rates.
for (const productType of ["ROLLER", "ZEBRA"] as const) {
  for (const motorized of [false, true]) {
    const item = { ...window, width: 30.5, height: 57, productType, motorized }
    assert.equal(projectLine(item, 0).unit / 100,
      calculateLinePrice({ ...item, productType: productType === "ROLLER" ? "roller" : "zebra" }), "0% sells at cost")
  }
}
const rates = { rollerRate: 6.25, zebraRate: 8.5, motorSurcharge: 333 }
assert.equal(measurementCostCents({ ...window, width: 30.5, height: 57, motorized: true }, rates), 42675)
assert.equal(measurementCostCents({ ...window, width: 12, height: 12 }, { ...rates, rollerRate: 10.075 }), 1008)

// Zero, rounding (halves up, as the backend), losses, and an empty project.
assert.equal(projectLine({ ...window, costPerUnit: 0 }, 50).unit, 0)
assert.equal(projectLine({ ...window, costPerUnit: 0.01 }, 50).unit, 2)
assert.equal(projectLine({ ...window, costPerUnit: 333.33 }, 50).unit, 50000)
assert.equal(projectLine({ ...window, markupOverridePercent: 50.125 }, 50).unit, 43236)
assert.equal(projectLine({ ...window, unitPriceOverride: 144 }, 50).margin, -100)
assert.equal(projectLine({ ...window, unitPriceOverride: 0 }, 50).margin, 0)
assert.equal(projectFinancials([], 50).profitMarginPercent, 0)
assert.equal(projectLine(window, Number.NaN).unit, 28800, "an emptied project markup box previews as 0%")

// Changing only the project markup reprices every window that follows it — the measured
// ones included — and the subtotal is always the sum of the line totals.
const mixed: LineItemInput[] = [
  { ...window, quantity: 2 },                         // follows the project
  { ...window, costPerUnit: 250, markupOverridePercent: 75 }, // its own 75%: 437.50
  { ...window, unitPriceOverride: 300 },              // manual
]
const at50 = projectPricing(mixed, 50)
const at100 = projectPricing(mixed, 100)
assert.deepEqual(at50.lines.map((line) => line.unit), [43200, 43750, 30000])
assert.deepEqual(at100.lines.map((line) => line.unit), [57600, 43750, 30000])
assert.equal(at50.subtotalCents, 160150)    // 2 × 432 + 437.50 + 300
assert.equal(at100.subtotalCents, 188950)   // 2 × 576 + 437.50 + 300
assert.equal(at100.subtotalCents, at100.lines.reduce((sum, line) => sum + line.revenue, 0))
assert.deepEqual(at100.financials, { totalCost: 1114, revenue: 1889.5, grossProfit: 775.5, profitMarginPercent: 41.04 })
assert.equal(mixed[0].unitPriceOverride, undefined, "an automatic price never becomes a manual one")
assert.equal(mixed[0].markupOverridePercent, undefined, "following the project never copies its markup")

console.log("Project pricing: measurement cost, supplier cost, markup, manual prices, quantities and totals passed.")
