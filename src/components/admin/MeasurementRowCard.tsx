"use client"

import { InchInput } from "@/components/InchInput"
import {
  CUT_FABRIC_OPTIONS,
  FASCIA_OPTIONS,
  type ContSide,
  type CutFabric,
  type Fascia,
  type MotorControl,
} from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3.5 text-sm outline-none transition-colors"

/** The two rooms that come up constantly, offered as one tap instead of typing. */
export const NOTE_TAGS = ["Bed", "LR"] as const
export type NoteTag = (typeof NOTE_TAGS)[number]

/**
 * How a tag and the rest of a note are joined into the single stored string.
 *
 * <p>One field, not two, because the sheet the workshop reads has one NOTES column —
 * the split exists to save typing on site, not to change what gets printed.
 */
export function joinNote(tag: NoteTag | null, text: string): string {
  const rest = text.trim()
  if (tag && rest) return `${tag} - ${rest}`
  if (tag) return tag
  return rest
}

/** The inverse, for loading a note back into the form. */
export function splitNote(notes: string | undefined): { tag: NoteTag | null; text: string } {
  const value = (notes ?? "").trim()
  for (const tag of NOTE_TAGS) {
    if (value === tag) return { tag, text: "" }
    if (value.startsWith(`${tag} - `)) return { tag, text: value.slice(tag.length + 3) }
  }
  // Anything written before these options existed stays exactly as it was, in the
  // free-text box, rather than being reinterpreted as a tag it never meant.
  return { tag: null, text: value }
}

/** The row as the form holds it, before it is sent. */
export type EditableRow = {
  id: string
  /** Empty while the field is being cleared and retyped. */
  serialNo: number | ""
  unit: string
  width: number | ""
  height: number | ""
  cont: ContSide | null
  omFw: boolean
  endCap: boolean
  cutFabric: CutFabric | null
  cutFabricCustom: string
  chainLength: number | ""
  /** null for no fascia, "ND" for the tick, "CUSTOM" when a size is given. */
  fascia: Fascia | null
  /** The size in decimal inches, only meaningful with fascia "CUSTOM". */
  fasciaCustom: number | ""
  motorControl: MotorControl | null
  /** The Bed / LR prefix, or null when the note is plain text. */
  notesTag: NoteTag | null
  /** Whatever follows the prefix — or the whole note when there is no prefix. */
  notesText: string
}

export type SaveState = "idle" | "saving" | "saved" | "error"

function Toggle({
  label,
  pressed,
  onClick,
}: {
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`hud h-11 w-full rounded-lg border px-2 transition-colors ${
        pressed
          ? "border-sky-brand bg-sky-brand/15 text-bone"
          : "border-line-strong text-mute hover:text-bone"
      }`}
    >
      {label}
    </button>
  )
}

/**
 * One opening, as a stacked card.
 *
 * <p>Deliberately not a row in a twelve-column table: this is filled in on a phone while
 * standing at the window, where a horizontally scrolling grid is unusable. Every control
 * is at least 44px tall so it can be hit with a thumb.
 */
export function MeasurementRowCard({
  row,
  inheritedUnit,
  onChange,
  onDelete,
  saveState,
}: {
  row: EditableRow
  /**
   * The unit this opening belongs to when its own box is blank — i.e. the one written
   * further up the sheet. Shown as placeholder text so a continuation row still says
   * which suite it is in, without repeating the number on every line.
   */
  inheritedUnit: string
  onChange: (patch: Partial<EditableRow>) => void
  onDelete: () => void
  saveState: SaveState
}) {
  const id = `row-${row.id}`

  return (
    <li className="border-line bg-ink/60 rounded-xl border p-5">
      <div className="flex items-center justify-end gap-3">
          <span
            aria-live="polite"
            className={`hud text-[0.6rem] ${
              saveState === "error"
                ? "text-red-400"
                : saveState === "saving"
                  ? "text-faint"
                  : saveState === "saved"
                    ? "text-sky-brand"
                    : "text-transparent"
            }`}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Not saved"
                  : "·"}
          </span>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove opening ${row.serialNo || ""}`}
            className="border-line-strong text-faint hover:border-red-400/50 hover:text-red-400 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
          >
            ×
          </button>
      </div>

      {/* unit, S.NO, and the two measurements */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-[minmax(6rem,0.6fr)_minmax(5rem,0.4fr)_minmax(13.5rem,1.2fr)_minmax(13.5rem,1.2fr)]">
        <label className="space-y-2">
          <span className="hud text-faint block">Unit</span>
          <input
            className={inputClass}
            // a numeric keypad on a phone, while still accepting "1201A" and "PH2"
            inputMode="numeric"
            value={row.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            // Blank on every opening after the first in a suite, exactly as it is
            // written on paper. The placeholder keeps it clear which unit this is,
            // and typing here starts a new one.
            placeholder={inheritedUnit || "1401"}
          />
        </label>

        <label className="space-y-2">
          <span className="hud text-faint block">S.NO</span>
          <input
            className={`${inputClass} no-spin tabular-nums`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={row.serialNo}
            onChange={(e) =>
              onChange({ serialNo: e.target.value === "" ? "" : Number(e.target.value) })
            }
          />
        </label>

        <InchInput
          compact
          idPrefix={`${id}-width`}
          label="Width"
          value={row.width}
          onChange={(v) => onChange({ width: v })}
        />
        <InchInput
          compact
          idPrefix={`${id}-height`}
          label="Height"
          value={row.height}
          onChange={(v) => onChange({ height: v })}
        />
      </div>

      {/* control side, and the three tick boxes */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-4">
        <div className="space-y-2">
          <span className="hud text-faint block">Cont</span>
          <div className="grid grid-cols-2 gap-2">
            {(["L", "R"] as const).map((side) => (
              <Toggle
                key={side}
                label={side}
                pressed={row.cont === side}
                // tapping the selected side clears it — not every blind has a chain
                onClick={() => onChange({ cont: row.cont === side ? null : side })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="hud text-faint block">OM / FW</span>
          <Toggle
            label={row.omFw ? "Ticked" : "—"}
            pressed={row.omFw}
            onClick={() => onChange({ omFw: !row.omFw })}
          />
        </div>

        <div className="space-y-2">
          <span className="hud text-faint block">End cap</span>
          <Toggle
            label={row.endCap ? "Yes" : "—"}
            pressed={row.endCap}
            onClick={() => onChange({ endCap: !row.endCap })}
          />
        </div>

        {/*
          Full width on a phone, like Motors below: "Custom" is a long word next to a
          two-letter one, and in a half-width cell at 390px the label is clipped inside
          its own button.
        */}
        <div className="col-span-2 space-y-2 lg:col-span-1">
          <span className="hud text-faint block">Fascia size</span>
          <div className="grid grid-cols-2 gap-2">
            {FASCIA_OPTIONS.map((o) => (
              <Toggle
                key={o.value}
                // the workshop reads "ND" in this column, so that is what the button shows
                label={o.label}
                pressed={row.fascia === o.value}
                // tapping the chosen one clears it: most openings have no fascia
                onClick={() =>
                  onChange(
                    row.fascia === o.value
                      ? { fascia: null, fasciaCustom: "" }
                      : // switching away from Custom drops the size with it, so the
                        // column and the value behind it cannot disagree
                        { fascia: o.value, fasciaCustom: o.value === "CUSTOM" ? row.fasciaCustom : "" }
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/*
        Only shown for a custom fascia, and required there: the whole point of the option
        is the measurement, and the API rejects it without one. Whole inches plus an
        eighth, like every other length on the sheet — "10", "10 1/2", "8 1/4".
      */}
      {row.fascia === "CUSTOM" && (
        <div className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <InchInput
              compact
              required
              idPrefix={`${id}-fascia`}
              label="Fascia size"
              value={row.fasciaCustom}
              onChange={(v) => onChange({ fasciaCustom: v })}
            />
            {row.fasciaCustom === "" && (
              <span className="block text-xs text-red-400">
                Needed before this row can save.
              </span>
            )}
          </div>
        </div>
      )}

      {/* cut, chain, motor */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="hud text-faint block">Cut fabric</span>
          <select
            className={`${inputClass} cursor-pointer`}
            value={row.cutFabric ?? ""}
            onChange={(e) =>
              onChange({ cutFabric: (e.target.value || null) as CutFabric | null })
            }
          >
            <option value="">—</option>
            {CUT_FABRIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="hud text-faint block">Chain length</span>
          <input
            className={`${inputClass} no-spin tabular-nums`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.125"
            value={row.chainLength}
            onChange={(e) =>
              onChange({ chainLength: e.target.value === "" ? "" : Number(e.target.value) })
            }
            placeholder="inches"
          />
        </label>

        <div className="col-span-2 space-y-2 lg:col-span-1">
          <span className="hud text-faint block">Motors</span>
          <div className="grid grid-cols-2 gap-2">
            {(["WAND", "REMOTE"] as const).map((m) => (
              <Toggle
                key={m}
                label={m === "WAND" ? "Wand" : "Remote"}
                pressed={row.motorControl === m}
                // tapping the selected one clears it: most openings have no motor
                onClick={() => onChange({ motorControl: row.motorControl === m ? null : m })}
              />
            ))}
          </div>
        </div>
      </div>

      {/*
        Only shown for Custom, and required there: "Custom" with nothing written after it
        is an unanswered question the workshop would discover with the fabric already cut.
        The API rejects it too — this is the polite version of the same rule.
      */}
      {row.cutFabric === "CUSTOM" && (
        <label className="mt-5 block space-y-2">
          <span className="hud text-sky-brand block">
            Custom cut — describe it <span aria-hidden="true">*</span>
          </span>
          <input
            className={inputClass}
            value={row.cutFabricCustom}
            onChange={(e) => onChange({ cutFabricCustom: e.target.value })}
            placeholder="trim 3/8 from the left, square the bottom"
            aria-invalid={row.cutFabricCustom.trim() === "" ? true : undefined}
          />
          {row.cutFabricCustom.trim() === "" && (
            <span className="block text-xs text-red-400">
              Needed before this row can save.
            </span>
          )}
        </label>
      )}

      <div className="mt-5 space-y-2">
        <span className="hud text-faint block">Notes</span>

        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          {NOTE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={row.notesTag === tag}
              // tapping the chosen one clears it, for a note that is neither room
              onClick={() => onChange({ notesTag: row.notesTag === tag ? null : tag })}
              className={`hud h-11 rounded-lg border px-4 transition-colors ${
                row.notesTag === tag
                  ? "border-sky-brand bg-sky-brand/15 text-bone"
                  : "border-line-strong text-mute hover:text-bone"
              }`}
            >
              {tag}
            </button>
          ))}

          <input
            className={inputClass}
            value={row.notesText}
            onChange={(e) => onChange({ notesText: e.target.value })}
            placeholder={row.notesTag ? "anything to add" : "blackout, obstruction, …"}
            aria-label="Notes"
          />
        </div>

        {/* exactly what lands in the NOTES column, so there is no guessing */}
        <p className="hud text-faint text-[0.6rem]">
          {joinNote(row.notesTag, row.notesText) || "—"}
        </p>
      </div>
    </li>
  )
}
