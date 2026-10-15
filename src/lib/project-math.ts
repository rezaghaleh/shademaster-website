/**
 * The project form's live pricing — the backend's ProjectPricing chain, previewed while
 * typing. Whole cents and thousandths of a percent, halves rounded up, as the backend does:
 *
 *   calculated cost = the size formula (the measurements), per shade
 *   base cost       = the supplier cost typed on the window, else the calculated cost
 *   markup          = the window's own markup, else the project's
 *   automatic price = base cost × (1 + markup ÷ 100)
 *   price           = the price typed on the window, else the automatic price
 *   line total      = price × quantity       line cost = base cost × quantity
 *   profit          = line total − line cost  margin   = profit ÷ line total
 *
 * Markup is added in one place only, here. The backend recomputes everything on save.
 */
import { toCents, taxCents } from "./invoice-math.ts"
import { MOTOR_SURCHARGE, ROLLER_RATE, ZEBRA_RATE } from "./pricing.ts"
import type { LineItemInput, PricingRates } from "./admin-api"

export const DEFAULT_MARKUP_PERCENT = 50
export const DEFAULT_RATES: PricingRates = {
  rollerRate: ROLLER_RATE, zebraRate: ZEBRA_RATE, motorSurcharge: MOTOR_SURCHARGE,
}

/** Round the decimal spelling of the size engine result, like Java BigDecimal.valueOf. */
function sizePriceCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const [coefficient, exponent = "0"] = String(amount).toLowerCase().split("e")
  const [whole, fraction = ""] = coefficient.split(".")
  const digits = BigInt(whole + fraction)
  const shift = Number(exponent) - fraction.length + 2
  if (shift >= 0) return Number(digits * BigInt(10) ** BigInt(shift))
  const denominator = BigInt(10) ** BigInt(-shift)
  return Number((digits * BigInt(2) + denominator) / (BigInt(2) * denominator))
}

/** A typed percentage, or null when the box is empty or holds no number yet. */
function percent(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** What the size formula gives for one shade, in cents: the cost unless a supplier cost replaces it. */
export function measurementCostCents(item: LineItemInput, rates = DEFAULT_RATES): number {
  const raw = Math.ceil(item.width / 12) * Math.ceil(item.height / 12)
    * (item.productType === "ROLLER" ? rates.rollerRate : rates.zebraRate)
    + (item.motorized ? rates.motorSurcharge : 0)
  return sizePriceCents(raw)
}

/** One window, every figure in cents. */
export function projectLine(item: LineItemInput, projectMarkup: number, rates = DEFAULT_RATES) {
  const measurementCost = measurementCostCents(item, rates)
  const supplierCost = toCents(item.costPerUnit)
  const baseCost = supplierCost ?? measurementCost
  const ownMarkup = percent(item.markupOverridePercent)
  const markup = ownMarkup ?? percent(projectMarkup) ?? 0
  // the markup amount is the base cost × markup, half up; added to whole cents that is
  // exactly the backend's base cost × (1 + markup), half up
  const automatic = baseCost + taxCents(baseCost, Math.max(0, Math.round(markup * 1000)))
  const manual = toCents(item.unitPriceOverride)
  const unit = manual ?? automatic
  const quantity = Number.isFinite(item.quantity) ? Math.max(0, Math.trunc(item.quantity)) : 0
  const revenue = unit * quantity
  const totalCost = baseCost * quantity
  const profit = revenue - totalCost
  return {
    measurementCost, supplierCost, baseCost, markup, inheritsMarkup: ownMarkup === null,
    automatic, unit, revenue, totalCost, profit, margin: marginPercent(profit, revenue),
    overridden: manual !== null,
  }
}

/** Profit as a share of the selling price, to two decimals, halves away from zero. */
export function marginPercent(profitCents: number, revenueCents: number): number {
  if (revenueCents <= 0) return 0
  const n = BigInt(Math.abs(profitCents)) * BigInt(10000)
  const d = BigInt(revenueCents)
  return Number((n * BigInt(2) + d) / (BigInt(2) * d)) / 100 * (profitCents < 0 ? -1 : 1)
}

/** One snapshot for every price field, line total, the subtotal and the financial summary. */
export function projectPricing(items: LineItemInput[], markup: number, rates = DEFAULT_RATES) {
  const lines = items.map((item) => projectLine(item, markup, rates))
  const totalCost = lines.reduce((sum, line) => sum + line.totalCost, 0)
  const revenue = lines.reduce((sum, line) => sum + line.revenue, 0)
  const financials = {
    totalCost: totalCost / 100, revenue: revenue / 100,
    grossProfit: (revenue - totalCost) / 100,
    profitMarginPercent: marginPercent(revenue - totalCost, revenue),
  }
  return { lines, subtotalCents: revenue, financials }
}

export function projectFinancials(items: LineItemInput[], markup: number, rates = DEFAULT_RATES) {
  return projectPricing(items, markup, rates).financials
}
