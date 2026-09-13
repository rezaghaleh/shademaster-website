"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ApiError,
  createMeasurementSet,
  listMeasurementSets,
  type MeasurementSetSummary,
} from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3.5 text-sm outline-none transition-colors"

/**
 * Every measurement job, one entry per level.
 *
 * <p>A level that ran past one page is still one entry here: its sheets are pages of the
 * same job, not separate records. They are their own thing, not something filed under a
 * project — measuring happens on site before there is anything to quote, and often for a
 * contractor who never becomes a project here at all.
 */
export default function MeasurementSetsPage() {
  const router = useRouter()

  const [sets, setSets] = useState<MeasurementSetSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState("")

  const [projectName, setProjectName] = useState("")
  const [contractor, setContractor] = useState("")
  const [buildingLevel, setBuildingLevel] = useState("")
  const [installer, setInstaller] = useState("")

  const load = useCallback(async () => {
    try {
      setSets(await listMeasurementSets())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load measurement sheets")
      setSets([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Filtered in the browser rather than by the API.
   *
   * <p>Fine while the list is small, which it will be for a while. If it grows into the
   * hundreds this needs to move server-side and gain paging, the way projects already
   * have — this is the cheap version, not the permanent one.
   */
  const visible = useMemo(() => {
    if (!sets) return []
    const q = query.trim().toLowerCase()
    if (!q) return sets
    return sets.filter((s) =>
      [s.projectName, s.contractor, s.buildingLevel, s.installer]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  }, [sets, query])

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const set = await createMeasurementSet({
        projectName: projectName.trim() || null,
        contractor: contractor.trim() || null,
        buildingLevel: buildingLevel.trim() || null,
        installer: installer.trim() || null,
        // Today is right far more often than not — a sheet is normally started on the
        // day the measuring happens. It stays editable.
        sheetDate: new Date().toISOString().slice(0, 10),
      })
      router.push(`/admin/measurement/${set.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the sheet")
      setBusy(false)
    }
  }

  return (
    <div className="shell py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="hud text-faint">On-site records</p>
          <h1 className="display text-bone mt-2 text-[clamp(30px,4vw,52px)]">Measurement</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="btn btn-primary"
        >
          {creating ? "Cancel" : "New sheet"}
        </button>
      </header>

      {creating && (
        <section className="border-line bg-ink-raised/50 mt-8 rounded-2xl border p-6">
          <h2 className="hud text-sky-brand">Job details</h2>
          <p className="text-faint mt-2 text-xs leading-[1.6]">
            All optional — start measuring now and fill these in later. Entered once for
            the level: if it takes more than one sheet, every sheet prints this header.
          </p>

          <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="hud text-faint block">Project name</span>
              <input
                className={inputClass}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="whatever the contractor calls it"
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Contractor</span>
              <input
                className={inputClass}
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Building / level #</span>
              <input
                className={inputClass}
                value={buildingLevel}
                onChange={(e) => setBuildingLevel(e.target.value)}
                placeholder="Tower A - Level 8"
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Installer</span>
              <input
                className={inputClass}
                value={installer}
                onChange={(e) => setInstaller(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create & open"}
            </button>
          </div>
        </section>
      )}

      {sets !== null && sets.length > 0 && (
        <div className="border-line bg-ink-raised/50 mt-8 rounded-2xl border p-6">
          <label className="space-y-2">
            <span className="hud text-faint block">Search</span>
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Project, contractor, building or installer"
            />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {error}
        </p>
      )}

      {sets === null ? (
        <p className="hud text-faint mt-8">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-faint mt-8 text-sm">
          {sets.length === 0
            ? "No measurement sheets yet. Create one to record what you measure on site."
            : "No sheets match that search."}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((set) => (
            <li key={set.id}>
              <Link
                href={`/admin/measurement/${set.id}`}
                className="border-line bg-ink-raised/50 hover:border-sky-brand/50 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 transition-colors"
              >
                <span className="min-w-0">
                  <span className="text-bone block text-sm font-semibold">
                    {set.projectName ?? "Untitled sheet"}
                    {set.sheetCount > 1 && (
                      <span className="text-mute font-normal">
                        {" "}
                        · {set.sheetCount} sheets
                      </span>
                    )}
                  </span>
                  <span className="text-mute mt-1.5 block text-sm">
                    {[set.contractor, set.buildingLevel].filter(Boolean).join(" · ") ||
                      "No contractor or building recorded"}
                  </span>
                </span>

                <span className="hud text-faint shrink-0 text-right text-[0.6rem]">
                  <span className="text-sky-brand block">
                    {set.rowCount} opening{set.rowCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-1.5 block">
                    {[set.installer, set.measurementMethod, set.sheetDate]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-faint mt-8 text-xs leading-[1.6]">
        Sheets stand on their own — they are the record of what was measured, not a quote,
        and they are not filed under a project. A level that needs more than one sheet keeps
        them together as one job: the header is entered once and every sheet prints it.
        Measurements are entered in whole inches plus a fraction and stored exactly, in the
        same units the quote calculator uses.
      </p>
    </div>
  )
}
