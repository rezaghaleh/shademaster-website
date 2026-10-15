/**
 * The invoice arithmetic, for the live totals while an invoice is being edited.
 *
 * Everything is whole cents (and tax rates whole thousandths of a percent), so nothing
 * here can produce 2499.9999997. The rules are the server's — each tax charged on the
 * same taxable amount and rounded half-up to the cent — so the preview shows what saving
 * will store. The server still does the saving calculation itself; this only previews it.
 */

import type { FeeKind } from "@/lib/admin-api"

/** "1,250.5" or 1250.5 → 125050. Null when it is not an amount of money. */
export function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const text = String(value).replace(/[\s,$]/g, "")
  const m = /^(-?)(\d*)(?:\.(\d{0,2}))?$/.exec(text)
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) return null
  const whole = Number(m[2] || "0")
  const frac = Number(((m[3] ?? "") + "00").slice(0, 2))
  const cents = whole * 100 + frac
  return m[1] === "-" ? -cents : cents
}

/** "7.125" → 7125. Null when it is not a rate with at most three decimals. */
export function toRateMilli(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const m = /^(\d*)(?:\.(\d{0,3}))?$/.exec(String(value).trim())
  if (!m || (m[1] === "" && (m[2] ?? "") === "")) return null
  return Number(m[1] || "0") * 1000 + Number(((m[2] ?? "") + "000").slice(0, 3))
}

/** 125050 → 1250.5, for sending to the API (two decimals at most, so exact in JSON). */
export function centsToAmount(cents: number): number {
  return cents / 100
}

/** 125050 → "1250.50", for an input box. */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}

/** The tax at a rate on an amount, half-up to the cent — the server's rule exactly. */
export function taxCents(taxableCents: number, rateMilli: number): number {
  if (taxableCents <= 0 || rateMilli <= 0) return 0
  const n = BigInt(taxableCents) * BigInt(rateMilli)
  const d = BigInt(100000)
  return Number((n * BigInt(2) + d) / (BigInt(2) * d))
}

export type DraftLine = { quantity: number; unitCents: number }
export type DraftFee = { kind: FeeKind; amountCents: number; taxable: boolean }
export type DraftTax = { rateMilli: number; overrideCents: number | null }

export type DraftTotals = {
  subtotal: number
  feesTotal: number
  taxable: number
  taxes: { amount: number; calculated: number }[]
  taxTotal: number
  grandTotal: number
}

/** All in cents. Fee amounts are sizes; a discount subtracts. */
export function computeTotals(lines: DraftLine[], fees: DraftFee[], taxes: DraftTax[]): DraftTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0)
  const signed = fees.map((f) => ({ ...f, value: f.kind === "DISCOUNT" ? -Math.abs(f.amountCents) : Math.abs(f.amountCents) }))
  const feesTotal = signed.reduce((sum, f) => sum + f.value, 0)
  const taxable = subtotal + signed.filter((f) => f.taxable).reduce((sum, f) => sum + f.value, 0)
  const lines_ = taxes.map((t) => {
    const calculated = taxCents(taxable, t.rateMilli)
    return { calculated, amount: t.overrideCents ?? calculated }
  })
  const taxTotal = lines_.reduce((sum, t) => sum + t.amount, 0)
  return { subtotal, feesTotal, taxable, taxes: lines_, taxTotal, grandTotal: subtotal + feesTotal + taxTotal }
}
