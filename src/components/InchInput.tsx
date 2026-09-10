"use client"

import { FRACTION_OPTIONS, formatInches, splitInches } from "@/lib/fractions"

/**
 * Fractional-inch entry: a whole-inches box and an eighths picker.
 *
 * The pair is the value of one measurement — "30" plus "1/2" is 30.5 — and the
 * component reports the combined decimal, so everything downstream (pricing,
 * storage, the API) keeps working on exactly the numbers it always did.
 *
 * Splitting the input in two rather than parsing free text is deliberate: it
 * makes the valid fractions discoverable, and it removes any chance of a typo
 * like "30 1/3" becoming a silently wrong measurement.
 *
 * <h2>Why the two boxes are a grid rather than a flex row</h2>
 * They used to be a flex row, and the two boxes fought each other. Both carried
 * the shared field styling, which includes `w-full`; the select then added
 * `w-[5.5rem] flex-none` to pull itself back to a fixed size. Tailwind emits
 * `.w-full` *after* `.w-[5.5rem]` and the two have equal specificity, so
 * `w-full` won — the select claimed the whole row and, being `flex-none`,
 * refused to give any of it back. The whole-inch input was `flex-1`, i.e.
 * `flex: 1 1 0%`, so its basis was zero and it collapsed to min-content: a
 * ~20px sliver that hid whatever you typed.
 *
 * A grid removes the argument entirely. Track sizes belong to the container, so
 * no utility on a child can override them, the fraction picker can never cover
 * or squeeze the number box, and the two can never overlap. `minmax(0, 1fr)`
 * lets the number box take all the room the column offers while still being
 * allowed to shrink on narrow screens.
 */
export function InchInput({
  idPrefix,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  compact = false,
}: {
  idPrefix: string
  label: string
  /** The combined decimal. Empty string when nothing has been entered yet. */
  value: number | ""
  onChange: (value: number | "") => void
  required?: boolean
  disabled?: boolean
  /** Tighter label spacing for the dense admin line-item rows. */
  compact?: boolean
}) {
  const numeric = typeof value === "number" ? value : null
  const parts = numeric === null ? { whole: "", fraction: 0 } : splitInches(numeric)

  const wholeValue = numeric === null ? "" : String(parts.whole)
  const fractionValue = numeric === null ? 0 : parts.fraction

  // No width utility here: the grid tracks below own the sizing. Padding is set
  // per box rather than shared, so there is no second pair of competing classes.
  const field =
    "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border text-sm outline-none transition-colors disabled:opacity-40"

  function emit(nextWhole: string, nextFraction: number) {
    if (nextWhole.trim() === "" && nextFraction === 0) {
      onChange("")
      return
    }
    const whole = nextWhole.trim() === "" ? 0 : Number(nextWhole)
    if (!Number.isFinite(whole) || whole < 0) {
      onChange("")
      return
    }
    onChange(whole + nextFraction)
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      <label className="hud text-faint block" htmlFor={`${idPrefix}-whole`}>
        {label}
        {required && <span className="text-sky-brand"> *</span>}
      </label>

      {/* [ 30 ]  [ 1/2 v ] — one measurement, two controls, one clear gap. */}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-3">
        <input
          id={`${idPrefix}-whole`}
          className={`${field} no-spin min-w-0 px-3.5 tabular-nums`}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="30"
          value={wholeValue}
          disabled={disabled}
          onChange={(e) => emit(e.target.value, fractionValue)}
          aria-describedby={`${idPrefix}-readout`}
        />
        <select
          id={`${idPrefix}-fraction`}
          className={`${field} cursor-pointer pr-2 pl-3.5`}
          value={String(fractionValue)}
          disabled={disabled}
          aria-label={`${label} — fraction of an inch`}
          onChange={(e) => emit(wholeValue, Number(e.target.value))}
        >
          {FRACTION_OPTIONS.map((f) => (
            <option key={f.label} value={String(f.value)}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reads back what was entered, so there is no doubt what "30 + 1/2"
          means, and carries the inch mark. Always one line, so a row never
          changes height as you type. */}
      <p
        id={`${idPrefix}-readout`}
        className={`hud text-[0.62rem] tabular-nums ${
          numeric === null || numeric === 0 ? "text-faint" : "text-mute"
        }`}
      >
        {numeric === null || numeric === 0 ? "—" : `${formatInches(numeric)}"`}
      </p>
    </div>
  )
}
