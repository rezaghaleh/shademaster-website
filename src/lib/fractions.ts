/**
 * Fractional-inch entry and display.
 *
 * Blinds are measured in whole inches plus an eighth, not decimals — "30 1/2",
 * not "30.5". This module is purely a presentation and input layer: values are
 * still stored and priced as the same decimal number they always were, so
 * `calculateLinePrice` and the golden vectors are completely unaffected.
 *
 * Every eighth is exactly representable in binary floating point
 * (0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875), so the round trip
 * decimal -> fraction -> decimal is lossless. That is what makes it safe to
 * swap the input format without touching the arithmetic.
 */

export type FractionOption = { label: string; value: number }

/** The eighths offered in the picker, in order. */
export const FRACTION_OPTIONS: FractionOption[] = [
  { label: "—", value: 0 },
  { label: "1/8", value: 0.125 },
  { label: "1/4", value: 0.25 },
  { label: "3/8", value: 0.375 },
  { label: "1/2", value: 0.5 },
  { label: "5/8", value: 0.625 },
  { label: "3/4", value: 0.75 },
  { label: "7/8", value: 0.875 },
]

/** Tolerance for deciding a stored decimal lands on an eighth. */
const EPSILON = 1e-9

/** Reduces e.g. 4/8 to 1/2. */
function reduce(numerator: number, denominator: number): [number, number] {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(numerator, denominator) || 1
  return [numerator / g, denominator / g]
}

/**
 * Splits a decimal into whole inches and its fractional part.
 * The fraction is snapped to the nearest eighth when it is one.
 */
export function splitInches(value: number): { whole: number; fraction: number } {
  if (!Number.isFinite(value) || value < 0) return { whole: 0, fraction: 0 }
  const whole = Math.floor(value)
  const remainder = value - whole
  const eighths = Math.round(remainder * 8)
  // A remainder that rounds to a full inch belongs to the whole part.
  if (eighths === 8) return { whole: whole + 1, fraction: 0 }
  return { whole, fraction: eighths / 8 }
}

/** True when the value sits exactly on an eighth. */
export function isEighth(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return Math.abs(value * 8 - Math.round(value * 8)) < EPSILON
}

/**
 * Formats a decimal for display: `30.5` -> `30 1/2`, `30` -> `30`.
 *
 * A value that is not on an eighth — legacy data, or something typed as a raw
 * decimal — is shown as a trimmed decimal rather than silently rounded, so the
 * display never misreports what is actually stored.
 */
export function formatInches(value: number): string {
  if (!Number.isFinite(value)) return ""
  if (!isEighth(value)) {
    return String(Number(value.toFixed(4)))
  }

  const whole = Math.floor(value + EPSILON)
  const eighths = Math.round((value - whole) * 8)

  if (eighths === 0) return String(whole)

  const [n, d] = reduce(eighths, 8)
  return whole === 0 ? `${n}/${d}` : `${whole} ${n}/${d}`
}

/** Formats with the inch mark, e.g. `30 1/2"`. */
export function formatInchesWithMark(value: number): string {
  const text = formatInches(value)
  return text === "" ? "" : `${text}"`
}

/**
 * Parses text into a decimal. Accepts the shapes people actually type:
 *
 *   30            -> 30
 *   30 1/2        -> 30.5
 *   30-1/2        -> 30.5
 *   30 1/2"       -> 30.5
 *   1/2           -> 0.5
 *   30.5          -> 30.5   (decimals still work)
 *
 * Returns null when the text is not a measurement, so callers can distinguish
 * "empty/invalid" from a genuine zero.
 */
export function parseInches(input: string): number | null {
  if (input == null) return null
  const text = String(input).trim().replace(/["″]/g, "").replace(/\s+/g, " ")
  if (text === "") return null

  // whole + fraction, separated by a space or hyphen: "30 1/2", "30-1/2"
  const mixed = text.match(/^(\d+)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)$/)
  if (mixed) {
    const whole = Number(mixed[1])
    const numerator = Number(mixed[2])
    const denominator = Number(mixed[3])
    if (denominator === 0) return null
    return whole + numerator / denominator
  }

  // bare fraction: "1/2"
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }

  // plain number, decimal or whole
  const plain = text.match(/^\d*\.?\d+$/)
  if (plain) return Number(text)

  return null
}

/** Combines the two inputs of the picker back into a decimal. */
export function joinInches(whole: number | string, fraction: number): number {
  const w = typeof whole === "string" ? (whole.trim() === "" ? 0 : Number(whole)) : whole
  if (!Number.isFinite(w) || w < 0) return fraction
  return w + fraction
}

/**
 * Snaps the fractional part of a value to the nearest option in the picker.
 * Used when loading an existing record whose value may not be an exact eighth.
 */
export function nearestFractionOption(value: number): number {
  return splitInches(value).fraction
}
