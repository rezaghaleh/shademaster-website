"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { formatInches } from "@/lib/fractions"
import {
  MeasurementRowCard,
  joinNote,
  splitNote,
  type EditableRow,
  type SaveState,
} from "@/components/admin/MeasurementRowCard"
import {
  ApiError,
  MAX_OPENINGS_PER_SHEET,
  addMeasurementRow,
  addSheetToSet,
  deleteMeasurementRow,
  deleteMeasurementSet,
  deleteSheetFromSet,
  downloadMeasurementSetPdf,
  getMeasurementSet,
  updateMeasurementSet,
  type MeasurementMethod,
  type MeasurementRowInput,
  type MeasurementRowView,
  type MeasurementSetView,
} from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3.5 text-sm outline-none transition-colors"

/** How long to wait after the last keystroke before saving a row. */
const AUTOSAVE_DELAY_MS = 800

/** One page of the set, as the form holds it. */
type SheetState = {
  id: string
  sheetIndex: number
  rows: EditableRow[]
}

function toEditable(row: MeasurementRowView): EditableRow {
  return {
    id: row.id,
    serialNo: row.serialNo,
    unit: row.unit ?? "",
    width: row.width,
    height: row.height,
    cont: row.cont ?? null,
    omFw: row.omFw,
    endCap: row.endCap,
    cutFabric: row.cutFabric ?? null,
    cutFabricCustom: row.cutFabricCustom ?? "",
    chainLength: row.chainLength ?? "",
    fascia: row.fascia ?? null,
    fasciaCustom: row.fasciaCustom ?? "",
    motorControl: row.motorControl ?? null,
    notesTag: splitNote(row.notes).tag,
    notesText: splitNote(row.notes).text,
  }
}

function toInput(row: EditableRow, effectiveUnit: string): MeasurementRowInput {
  return {
    id: row.id,
    // the suite this opening is in, even when its own box was left blank because
    // the number is written further up the sheet
    unit: effectiveUnit || null,
    // blank means "leave whatever is on the sheet"; the server only suggests a
    // number for a row that has never had one
    serialNo: row.serialNo === "" ? null : row.serialNo,
    width: row.width === "" ? 0 : row.width,
    height: row.height === "" ? 0 : row.height,
    cont: row.cont,
    omFw: row.omFw,
    endCap: row.endCap,
    cutFabric: row.cutFabric,
    cutFabricCustom: row.cutFabricCustom.trim() || null,
    chainLength: row.chainLength === "" ? null : row.chainLength,
    fascia: row.fascia,
    fasciaCustom: row.fasciaCustom === "" ? null : row.fasciaCustom,
    motorControl: row.motorControl,
    // one field on the wire and one column on the printed sheet; the split is
    // only there to save typing on site
    notes: joinNote(row.notesTag, row.notesText) || null,
  }
}

/**
 * Whether two unit labels mean the same suite.
 *
 * <p>Trimmed and case-insensitive, matching the server: nobody typing "ph2" on a phone
 * means a different unit from "PH2".
 */
function sameUnit(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * The unit each opening actually belongs to.
 *
 * <p>A row's own box carries the number only where the unit changes; every opening after
 * that in the same suite is left blank, the way it is written on paper. The unit still
 * has to be known for each row — it is what gets stored and printed — so it is carried
 * down from the last row that named one.
 */
function effectiveUnits(rows: EditableRow[]): string[] {
  let current = ""
  return rows.map((r) => {
    if (r.unit.trim() !== "") current = r.unit.trim()
    return current
  })
}

/**
 * The next S.NO within one unit: one past the highest already used there.
 *
 * <p>Derived from the highest in use rather than the count, so deleting the middle of
 * three does not suggest a number already on the sheet.
 */
function nextSerialForUnit(
  rows: EditableRow[],
  units: string[],
  unit: string,
  ignoreId?: string
): number {
  const used = rows
    .filter((r, i) => r.id !== ignoreId && sameUnit(units[i], unit))
    .map((r) => (r.serialNo === "" ? 0 : r.serialNo))
  return used.length === 0 ? 1 : Math.max(...used) + 1
}

/**
 * Numbers every opening in the named groups 1, 2, 3… in the order they appear.
 *
 * <p>Only the groups whose membership actually changed are touched. Renumbering the whole
 * sheet on every edit would quietly undo an S.NO somebody typed by hand two units ago,
 * which is the one thing the manual field exists to allow.
 */
function renumber(rows: EditableRow[], affected: Set<string>): EditableRow[] {
  const units = effectiveUnits(rows)
  const counters = new Map<string, number>()
  return rows.map((row, i) => {
    const key = units[i].toLowerCase()
    if (!affected.has(key)) return row
    const next = (counters.get(key) ?? 0) + 1
    counters.set(key, next)
    return row.serialNo === next ? row : { ...row, serialNo: next }
  })
}

/** The row's measurements as they were written, for the delete confirmation. */
function describe(row: EditableRow): string {
  if (row.width === "" || row.height === "") return ""
  return `${formatInches(row.width)}" x ${formatInches(row.height)}"`
}

/**
 * A row is only worth sending once it describes a real opening.
 *
 * <p>Both dimensions are required by the API, and the two custom columns need their
 * detail. Checking here keeps a half-typed row from firing a request on every keystroke
 * that can only come back as a 400 — the installer is still typing, not making a mistake.
 */
function isSendable(row: EditableRow): boolean {
  if (row.width === "" || row.height === "" || row.width <= 0 || row.height <= 0) return false
  if (row.serialNo !== "" && row.serialNo <= 0) return false
  if (row.cutFabric === "CUSTOM" && row.cutFabricCustom.trim() === "") return false
  if (row.fascia === "CUSTOM" && row.fasciaCustom === "") return false
  return true
}

/**
 * How full the sheet is, in the form the paper asks the question: spots used out of
 * eighteen.
 *
 * <p>Shown above and below the list, because on a phone the two ends of a full sheet are
 * a long way apart and the answer matters in both places — at the bottom you are deciding
 * whether to keep going, at the top you are deciding whether to start a new sheet.
 */
function OpeningCount({ used }: { used: number }) {
  const full = used >= MAX_OPENINGS_PER_SHEET
  return (
    <span
      aria-live="polite"
      aria-label={`${used} of ${MAX_OPENINGS_PER_SHEET} openings used on this sheet`}
      className={`hud tabular-nums rounded-lg border px-3 py-1.5 text-[0.7rem] ${
        full
          ? "border-sky-brand bg-sky-brand/15 text-bone"
          : "border-line-strong text-mute"
      }`}
    >
      {used}/{MAX_OPENINGS_PER_SHEET}
      {full && <span className="ml-2">sheet full</span>}
    </span>
  )
}

/** Loading a sheet blanks the unit on every row that repeats the one above it. */
function loadRows(rows: MeasurementRowView[]): EditableRow[] {
  const loaded = rows.map(toEditable)
  return loaded.map((row, i) =>
    i > 0 && sameUnit(loaded[i - 1].unit, row.unit) ? { ...row, unit: "" } : row
  )
}

export default function MeasurementSetPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const setId = params.id

  const [set, setSet] = useState<MeasurementSetView | null>(null)
  const [sheets, setSheets] = useState<SheetState[]>([])
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [downloading, setDownloading] = useState(false)
  const [addingSheet, setAddingSheet] = useState(false)
  const [headerState, setHeaderState] = useState<SaveState>("idle")

  // header fields, edited locally and autosaved. They belong to the set, so one
  // edit here changes what every sheet in it prints.
  const [projectName, setProjectName] = useState("")
  const [contractor, setContractor] = useState("")
  const [buildingLevel, setBuildingLevel] = useState("")
  const [sheetDate, setSheetDate] = useState("")
  const [method, setMethod] = useState<MeasurementMethod | null>(null)
  const [installer, setInstaller] = useState("")
  const [notes, setNotes] = useState("")

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Set once the user has actually edited something. Without it, loading the set
  // would look like a change and immediately PATCH back what we just read.
  const dirty = useRef<Record<string, boolean>>({})

  useEffect(() => {
    getMeasurementSet(setId)
      .then((s) => {
        setSet(s)
        setSheets(
          s.sheets.map((sheet) => ({
            id: sheet.id,
            sheetIndex: sheet.sheetIndex,
            rows: loadRows(sheet.rows),
          }))
        )
        // The last sheet is the one being filled in: coming back to a level in
        // progress should land where the measuring stopped, not on page 1.
        setActiveSheetId(s.sheets.length > 0 ? s.sheets[s.sheets.length - 1].id : null)
        setProjectName(s.projectName ?? "")
        setContractor(s.contractor ?? "")
        setBuildingLevel(s.buildingLevel ?? "")
        setSheetDate(s.sheetDate ?? "")
        setMethod(s.measurementMethod ?? null)
        setInstaller(s.installer ?? "")
        setNotes(s.notes ?? "")
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load these sheets")
      )
  }, [setId])

  // Clear any pending saves on unmount, so a timer cannot fire against a gone page.
  useEffect(() => {
    const pending = timers.current
    return () => Object.values(pending).forEach(clearTimeout)
  }, [])

  const scheduleHeaderSave = useCallback(() => {
    dirty.current.header = true
    clearTimeout(timers.current.header)
    timers.current.header = setTimeout(async () => {
      setHeaderState("saving")
      try {
        await updateMeasurementSet(setId, {
          projectName: projectName.trim() || null,
          contractor: contractor.trim() || null,
          buildingLevel: buildingLevel.trim() || null,
          sheetDate: sheetDate || null,
          measurementMethod: method,
          installer: installer.trim() || null,
          notes: notes.trim() || null,
        })
        setHeaderState("saved")
      } catch {
        setHeaderState("error")
      }
    }, AUTOSAVE_DELAY_MS)
  }, [setId, projectName, contractor, buildingLevel, sheetDate, method, installer, notes])

  useEffect(() => {
    if (!dirty.current.header) return
    scheduleHeaderSave()
  }, [scheduleHeaderSave])

  /**
   * Saves one row, whole, after the typing stops.
   *
   * <p>Always a POST, never a PUT, even for a row that already exists. The endpoint keys
   * on the client-generated id: it creates the row the first time and replaces it every
   * time after. That means this component never has to track which rows the server has
   * seen — and more usefully, a save whose response was lost can simply be repeated. With
   * PUT the first save of a new opening would 404, and with a create/update split a lost
   * response would leave the client wrong about which one to send next.
   *
   * <p>The row goes in its entirety rather than a diff, so a retry re-applies the same
   * state instead of half of an edit. Bad signal inside a concrete building is the normal
   * case here, not the exception.
   */
  const saveRow = useCallback(
    (sheetId: string, row: EditableRow, effectiveUnit: string) => {
      clearTimeout(timers.current[row.id])
      if (!isSendable(row)) return

      timers.current[row.id] = setTimeout(async () => {
        setSaveStates((s) => ({ ...s, [row.id]: "saving" }))
        try {
          const saved = await addMeasurementRow(sheetId, toInput(row, effectiveUnit))
          setSaveStates((s) => ({ ...s, [row.id]: "saved" }))
          // keep the server's S.NO, which it owns
          setSheets((ss) =>
            ss.map((sheet) =>
              sheet.id !== sheetId
                ? sheet
                : {
                    ...sheet,
                    rows: sheet.rows.map((r) =>
                      r.id === row.id ? { ...r, serialNo: saved.serialNo } : r
                    ),
                  }
            )
          )
        } catch {
          setSaveStates((s) => ({ ...s, [row.id]: "error" }))
        }
      }, AUTOSAVE_DELAY_MS)
    },
    []
  )

  function editRow(sheetId: string, id: string, patch: Partial<EditableRow>) {
    setSheets((ss) =>
      ss.map((sheet) => {
        if (sheet.id !== sheetId) return sheet
        const rs = sheet.rows

        const index = rs.findIndex((r) => r.id === id)
        if (index < 0) return sheet

        const unitChanged =
          patch.unit !== undefined && !sameUnit(rs[index].unit, patch.unit)

        const before = effectiveUnits(rs)
        let next = rs.map((r) => (r.id === id ? { ...r, ...patch } : r))

        if (unitChanged) {
          // Writing a unit here starts a new suite, and every blank row below it
          // joins that suite until the next one is named — so both the group being
          // left and the group being started are renumbered from 1.
          const after = effectiveUnits(next)
          const affected = new Set<string>()
          next.forEach((_, i) => {
            if (!sameUnit(before[i], after[i])) {
              affected.add(before[i].toLowerCase())
              affected.add(after[i].toLowerCase())
            }
          })
          next = renumber(next, affected)
        }

        const units = effectiveUnits(next)
        const editedIndex = next.findIndex((r) => r.id === id)
        const edited = next[editedIndex]
        if (edited) saveRow(sheetId, edited, units[editedIndex])

        // Rows below can have been renumbered or moved into another suite, so each
        // of those is saved too rather than left disagreeing with what is on screen.
        if (unitChanged) {
          next.forEach((row, i) => {
            if (i === editedIndex) return
            const changed = row !== rs[i] || !sameUnit(before[i], units[i])
            if (changed) saveRow(sheetId, row, units[i])
          })
        }

        return { ...sheet, rows: next }
      })
    )
  }

  function addRow(sheetId: string) {
    // The id is generated here, not by the server: if the response is lost and the
    // request is retried, the API updates this row rather than creating a second one.
    const id = crypto.randomUUID()

    setSheets((ss) =>
      ss.map((sheet) => {
        if (sheet.id !== sheetId) return sheet
        // The sheet holds eighteen, the same as the paper one. The buttons are already
        // disabled at that point; this is the guard behind them, and the API refuses a
        // nineteenth row regardless of what the form does.
        if (sheet.rows.length >= MAX_OPENINGS_PER_SHEET) return sheet

        // The box is left blank: this opening belongs to the suite already named
        // further up, which is how it is written on paper. Typing a number here
        // starts the next unit and restarts its numbering.
        const units = effectiveUnits(sheet.rows)
        const unit = units.length > 0 ? units[units.length - 1] : ""

        const blank: EditableRow = {
          id,
          serialNo: nextSerialForUnit(sheet.rows, units, unit),
          unit: "",
          width: "",
          height: "",
          cont: null,
          omFw: false,
          endCap: false,
          cutFabric: null,
          cutFabricCustom: "",
          chainLength: "",
          fascia: null,
          fasciaCustom: "",
          motorControl: null,
          notesTag: null,
          notesText: "",
        }
        // Shown immediately; it reaches the server once it has both measurements, so
        // an empty card never produces a request that can only be rejected.
        return { ...sheet, rows: [...sheet.rows, blank] }
      })
    )
  }

  async function removeRow(sheetId: string, row: EditableRow) {
    const measured = isSendable(row)
    if (
      measured &&
      !window.confirm(
        `Delete opening ${row.serialNo || "?"}${row.unit ? ` (unit ${row.unit})` : ""}?\n\n` +
          `${describe(row)}\n\nThis cannot be undone.`
      )
    ) {
      return
    }
    clearTimeout(timers.current[row.id])
    setSheets((ss) =>
      ss.map((sheet) =>
        sheet.id === sheetId
          ? { ...sheet, rows: sheet.rows.filter((r) => r.id !== row.id) }
          : sheet
      )
    )
    try {
      await deleteMeasurementRow(sheetId, row.id)
    } catch (err) {
      // A row that was never sendable has no server copy, so a 404 here is expected.
      if (err instanceof ApiError && err.status !== 404) {
        setError(err.message)
      }
    }
  }

  /**
   * Starts the next sheet of this level.
   *
   * <p>The openings already taken stay exactly where they are; the new page arrives
   * empty, under the same header, numbered one past the last.
   */
  async function addSheet() {
    setAddingSheet(true)
    setError(null)
    try {
      const sheet = await addSheetToSet(setId)
      setSheets((ss) => [...ss, { id: sheet.id, sheetIndex: sheet.sheetIndex, rows: [] }])
      setActiveSheetId(sheet.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add a sheet")
    } finally {
      setAddingSheet(false)
    }
  }

  async function removeSheet(sheetId: string) {
    const sheet = sheets.find((s) => s.id === sheetId)
    if (!sheet) return
    if (
      !window.confirm(
        `Delete sheet ${sheet.sheetIndex} and its ${sheet.rows.length} opening(s)?\n\n` +
          `The other sheets are renumbered. This cannot be undone.`
      )
    ) {
      return
    }
    try {
      await deleteSheetFromSet(setId, sheetId)
      setSheets((ss) => {
        const kept = ss.filter((s) => s.id !== sheetId)
        // the server closes the gap in the numbering; mirror it rather than re-fetch
        return kept.map((s, i) => ({ ...s, sheetIndex: i + 1 }))
      })
      setActiveSheetId((current) => {
        if (current !== sheetId) return current
        const remaining = sheets.filter((s) => s.id !== sheetId)
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete that sheet")
    }
  }

  async function removeSet() {
    const openings = sheets.reduce((n, s) => n + s.rows.length, 0)
    if (
      !window.confirm(
        `Delete all ${sheets.length} sheet(s) for this level and their ${openings} opening(s)? ` +
          `This cannot be undone.`
      )
    ) {
      return
    }
    try {
      await deleteMeasurementSet(setId)
      router.push("/admin/measurement")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete these sheets")
    }
  }

  if (error && !set) {
    return (
      <div className="shell py-14">
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <Link href="/admin/measurement" className="btn btn-ghost mt-6">
          Back to all sheets
        </Link>
      </div>
    )
  }

  if (!set) {
    return (
      <div className="shell py-14">
        <p className="hud text-faint">Loading…</p>
      </div>
    )
  }

  const onHeaderEdit = () => {
    dirty.current.header = true
  }

  const active = sheets.find((s) => s.id === activeSheetId) ?? sheets[0] ?? null
  const totalOpenings = sheets.reduce((n, s) => n + s.rows.length, 0)
  const activeUnits = active ? effectiveUnits(active.rows) : []
  const sheetFull = (active?.rows.length ?? 0) >= MAX_OPENINGS_PER_SHEET

  return (
    <div className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="hud text-faint">
        <Link href="/admin/measurement" className="hover:text-bone transition-colors">
          Measurement
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mute">{projectName || "Untitled sheet"}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="display text-bone text-[clamp(28px,4vw,48px)]">
            {projectName || "Measurement sheet"}
          </h1>
          <p className="text-mute mt-3 text-sm">
            {buildingLevel && <span>{buildingLevel} · </span>}
            {sheets.length} sheet{sheets.length === 1 ? "" : "s"} · {totalOpenings} opening
            {totalOpenings === 1 ? "" : "s"} · changes save on their own
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/*
            The two ways of finishing: both cover the whole set, because what gets
            handed to the shop is the level, not the page that happens to be open.
          */}
          <button
            type="button"
            onClick={async () => {
              setDownloading(true)
              try {
                await downloadMeasurementSetPdf(setId)
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not download the PDF")
              } finally {
                setDownloading(false)
              }
            }}
            disabled={downloading}
            className="btn btn-ghost disabled:pointer-events-none disabled:opacity-50"
          >
            {downloading ? "Preparing…" : "Download"}
          </button>
          <Link href={`/admin/measurement/${setId}/print`} className="btn btn-primary">
            Print
          </Link>
          <button
            type="button"
            onClick={removeSet}
            className="hud h-11 rounded-lg border border-red-400/40 px-4 text-red-400 transition-colors hover:bg-red-400/10"
          >
            Delete all
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------- header */}
      <section
        className="border-line bg-ink-raised/50 mt-8 rounded-2xl border p-6"
        aria-labelledby="sheet-header-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="sheet-header-title" className="hud text-sky-brand">
            Job details
          </h2>
          <span
            aria-live="polite"
            className={`hud text-[0.6rem] ${
              headerState === "error"
                ? "text-red-400"
                : headerState === "saved"
                  ? "text-sky-brand"
                  : "text-faint"
            }`}
          >
            {headerState === "saving"
              ? "Saving…"
              : headerState === "saved"
                ? "Saved"
                : headerState === "error"
                  ? "Not saved"
                  : ""}
          </span>
        </div>

        <p className="text-faint mt-2 text-xs leading-[1.6]">
          Entered once for the level. Every sheet here prints this header, so a correction
          applies to all of them at once.
        </p>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="hud text-faint block">Project name</span>
            <input
              className={inputClass}
              value={projectName}
              onChange={(e) => {
                onHeaderEdit()
                setProjectName(e.target.value)
              }}
              placeholder="whatever the contractor calls it"
            />
          </label>

          <label className="space-y-2">
            <span className="hud text-faint block">Contractor</span>
            <input
              className={inputClass}
              value={contractor}
              onChange={(e) => {
                onHeaderEdit()
                setContractor(e.target.value)
              }}
            />
          </label>

          <label className="space-y-2">
            <span className="hud text-faint block">Building / level #</span>
            <input
              className={inputClass}
              value={buildingLevel}
              onChange={(e) => {
                onHeaderEdit()
                setBuildingLevel(e.target.value)
              }}
              placeholder="Tower A - Level 8"
            />
          </label>

          <label className="space-y-2">
            <span className="hud text-faint block">Date</span>
            <input
              type="date"
              className={inputClass}
              value={sheetDate}
              onChange={(e) => {
                onHeaderEdit()
                setSheetDate(e.target.value)
              }}
            />
          </label>

          <label className="space-y-2">
            <span className="hud text-faint block">Installer</span>
            <input
              className={inputClass}
              value={installer}
              onChange={(e) => {
                onHeaderEdit()
                setInstaller(e.target.value)
              }}
            />
          </label>

          <div className="space-y-2">
            <span className="hud text-faint block">Measured with</span>
            <div className="grid grid-cols-2 gap-2">
              {(["TAPE", "LASER"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => {
                    onHeaderEdit()
                    setMethod(method === m ? null : m)
                  }}
                  className={`hud h-11 rounded-lg border px-2 capitalize transition-colors ${
                    method === m
                      ? "border-sky-brand bg-sky-brand/15 text-bone"
                      : "border-line-strong text-mute hover:text-bone"
                  }`}
                >
                  {m.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="hud text-faint block">Notes</span>
          <textarea
            rows={2}
            className={`${inputClass} h-auto py-2.5`}
            value={notes}
            onChange={(e) => {
              onHeaderEdit()
              setNotes(e.target.value)
            }}
          />
        </label>
      </section>

      {/* -------------------------------------------------------- sheet tabs */}
      <nav
        aria-label="Sheets"
        className="border-line bg-ink-raised/50 mt-6 flex flex-wrap items-center gap-2 rounded-2xl border p-4"
      >
        {sheets.map((sheet) => {
          const current = active?.id === sheet.id
          return (
            <button
              key={sheet.id}
              type="button"
              aria-current={current ? "page" : undefined}
              // Spelled out for a screen reader: the visible text runs the two parts
              // together as "Sheet 118/18", which is not what it says on screen.
              aria-label={`Sheet ${sheet.sheetIndex}, ${sheet.rows.length} of ${MAX_OPENINGS_PER_SHEET} openings`}
              onClick={() => setActiveSheetId(sheet.id)}
              className={`hud h-11 rounded-lg border px-4 transition-colors ${
                current
                  ? "border-sky-brand bg-sky-brand/15 text-bone"
                  : "border-line-strong text-mute hover:text-bone"
              }`}
            >
              Sheet {sheet.sheetIndex}{" "}
              {/* so a glance at the tabs shows which sheet still has room */}
              <span className="text-faint ml-2 tabular-nums text-[0.6rem]">
                {sheet.rows.length}/{MAX_OPENINGS_PER_SHEET}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={addSheet}
          disabled={addingSheet}
          className="btn btn-ghost !h-11 !py-0 !text-[0.85rem] disabled:pointer-events-none disabled:opacity-50"
        >
          {addingSheet ? "Adding…" : "+ Add sheet"}
        </button>

        {sheets.length > 1 && active && (
          <button
            type="button"
            onClick={() => removeSheet(active.id)}
            className="hud text-faint ml-auto h-11 rounded-lg px-3 transition-colors hover:text-red-400"
          >
            Delete sheet {active.sheetIndex}
          </button>
        )}
      </nav>

      {/* --------------------------------------------------------------- rows */}
      {active && (
        <section
          className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
          aria-labelledby="openings-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="openings-title" className="hud text-sky-brand">
              Openings · sheet {active.sheetIndex} of {sheets.length}
            </h2>
            <div className="flex items-center gap-3">
              <OpeningCount used={active.rows.length} />
              <button
                type="button"
                onClick={() => addRow(active.id)}
                disabled={sheetFull}
                className="btn btn-ghost !h-11 !py-0 !text-[0.85rem] disabled:pointer-events-none disabled:opacity-40"
              >
                Add opening
              </button>
            </div>
          </div>

          {active.rows.length === 0 ? (
            <p className="text-faint mt-6 text-sm">
              No openings on this sheet yet. Add one and start measuring.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {active.rows.map((row, i) => (
                <MeasurementRowCard
                  key={row.id}
                  row={row}
                  inheritedUnit={activeUnits[i]}
                  saveState={saveStates[row.id] ?? "idle"}
                  onChange={(patch) => editRow(active.id, row.id, patch)}
                  onDelete={() => removeRow(active.id, row)}
                />
              ))}
            </ul>
          )}

          {/*
            The same action again at the foot of the list, with the count beside it.
            After filling in the last opening you are already at the bottom of a long
            page, and scrolling back to the top to add the next one — or just to see how
            many spots are left — is the friction that makes people stop using a form and
            go back to paper.
          */}
          {/* shown even on an empty sheet, so the count is at the foot of the list either way */}
          {
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <OpeningCount used={active.rows.length} />
                {!sheetFull && (
                  <span className="hud text-faint text-[0.6rem]">
                    {MAX_OPENINGS_PER_SHEET - active.rows.length} spot
                    {MAX_OPENINGS_PER_SHEET - active.rows.length === 1 ? "" : "s"} left
                  </span>
                )}
              </div>

              {sheetFull ? (
                // The wall, and the way past it in the same place. Being told a sheet is
                // full without being shown what to do next is where someone reaches for
                // the paper pad.
                <div className="border-sky-brand/40 bg-sky-brand/5 rounded-lg border p-4 text-center">
                  <p className="text-mute text-sm">
                    This sheet is full at {MAX_OPENINGS_PER_SHEET} openings — the same as
                    the paper form.
                  </p>
                  <button
                    type="button"
                    onClick={addSheet}
                    disabled={addingSheet}
                    className="btn btn-primary mt-4 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {addingSheet ? "Adding…" : `+ Add sheet ${sheets.length + 1}`}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addRow(active.id)}
                  className="btn btn-ghost !h-12 w-full !py-0"
                >
                  + Add opening
                </button>
              )}
            </div>
          }

          <p className="text-faint mt-6 text-xs leading-[1.6]">
            Each opening saves on its own, shortly after you stop typing. A row is sent once
            it has both a width and a height, so a half-filled card will not be saved yet.
            A new opening keeps the unit from the one before it, and numbering restarts at 1
            whenever you change the unit. A sheet holds {MAX_OPENINGS_PER_SHEET} openings,
            the same as the paper form; at {MAX_OPENINGS_PER_SHEET}/{MAX_OPENINGS_PER_SHEET}{" "}
            add another sheet — the header carries over and the openings already taken stay
            where they are.
          </p>
        </section>
      )}

      <div className="mt-8">
        <Link href="/admin/measurement" className="btn btn-ghost">
          Back to all sheets
        </Link>
      </div>
    </div>
  )
}
