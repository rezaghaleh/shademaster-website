/**
 * ShadeMaster pricing — the single source of truth for quote math.
 *
 * This is the formula that used to live inline in src/app/estimate/page.tsx.
 * It was pulled out so that exactly one TypeScript definition exists, shared by:
 *   · the public pre-quote calculator (src/app/estimate/page.tsx)
 *   · the parity generator (scripts/pricing-vectors.ts), which emits the golden
 *     vectors that the Spring Boot backend's PricingCalculatorTest asserts against
 *
 * The Java mirror lives at
 * shademaster-admin-backend/src/main/java/com/shademaster/admin/pricing/PricingCalculator.java
 * and MUST stay in step. Run `npm run pricing:verify` to prove it does.
 *
 * A note on arithmetic: 4.5 and 4.75 are both exactly representable in IEEE-754,
 * and sqft is always a whole number, so every operation below is exact in double
 * precision. That is why the Java port uses `double` and not BigDecimal — a
 * BigDecimal port would have to pick a rounding mode for the `/ 12` step and
 * would no longer agree with this file.
 */

export type ProductType = "roller" | "zebra"

/** The fields that actually affect price. */
export type PricingInput = {
  width: number // inches
  height: number // inches
  productType: ProductType
  motorized: boolean
  quantity: number
}

export const MAX_ITEMS = 30
export const MOTOR_SURCHARGE = 250 // your motorized price per shade
export const ROLLER_RATE = 4.5
export const ZEBRA_RATE = 4.75

// 👉 YOUR REAL FORMULA
export function calculateLinePrice(item: PricingInput): number {
  // 1) inches -> feet, round UP
  const widthFt = Math.ceil(item.width / 12)
  const heightFt = Math.ceil(item.height / 12)

  // 2) square footage
  const sqft = widthFt * heightFt

  // 3) rate: roller vs zebra
  const rate = item.productType === "roller" ? ROLLER_RATE : ZEBRA_RATE

  // 4) base price per shade
  let pricePerShade = sqft * rate

  // 5) motorized surcharge
  if (item.motorized) {
    pricePerShade += MOTOR_SURCHARGE
  }

  // 6) quantity
  return pricePerShade * item.quantity
}
