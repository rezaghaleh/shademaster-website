"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { formatInches } from "@/lib/fractions"
import {
  ApiError,
  downloadMeasurementSetPdf,
  getMeasurementSet,
  type MeasurementRowView,
  type MeasurementSetView,
} from "@/lib/admin-api"

/**
 * Blank rows padded onto the end of each sheet, so a short page still prints as a full
 * form the workshop can write on — the paper version always has spare lines.
 */
const MIN_PRINTED_ROWS = 18

function cut(row: MeasurementRowView): string {
  if (!row.cutFabric) return ""
  return row.cutFabric === "CUSTOM"
    ? (row.cutFabricCustom ?? "Custom")
    : (row.cutFabricLabel ?? "")
}

function motors(row: MeasurementRowView): string {
  if (!row.motorControl) return ""
  return row.motorControl === "WAND" ? "Wand" : "Remote"
}

/**
 * The unit written once per suite, blank on the openings that follow it.
 *
 * <p>Matches how the sheet is filled in by hand, and how the PDF renders it. Every row
 * still carries its unit in the data; this only stops the number repeating down the page.
 *
 * <p>Scoped to one sheet: a suite continuing onto the next page is named again at the top
 * of it, because a page whose unit column starts blank cannot be read on its own once the
 * stack has been split up on a bench.
 */
function unitColumn(rows: MeasurementRowView[], index: number): string {
  const unit = (rows[index].unit ?? "").trim()
  if (index === 0) return unit
  const previous = (rows[index - 1].unit ?? "").trim()
  return previous.toLowerCase() === unit.toLowerCase() ? "" : unit
}

/**
 * The set as the shop receives it — the HT Blinds work order, filled in, one page per
 * sheet.
 *
 * <p>Everything here is deliberately plain black on white, with its own styles rather
 * than the admin theme: this page exists to be printed and handed over, and the dark
 * navy the rest of the tool uses would come out of a printer as a solid block of ink.
 */
export default function PrintMeasurementSetPage() {
  const params = useParams<{ id: string }>()
  const [set, setSet] = useState<MeasurementSetView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    getMeasurementSet(params.id)
      .then(setSet)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load these sheets")
      )
  }, [params.id])

  if (error) {
    return (
      <main className="shell py-14">
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      </main>
    )
  }

  if (!set) {
    return (
      <main className="shell py-14">
        <p className="hud text-faint">Loading…</p>
      </main>
    )
  }

  const total = set.sheets.length

  return (
    <>
      {/*
        Scoped to this page. The admin theme is a dark navy that would print as a
        solid block, so the printed form defines its own black-on-white styling and
        drops everything that is not the form itself.
      */}
      <style>{`
        /* The paper itself, not just the sheet on it. A browser running in dark
           mode fills the whole page — margins included — with its dark canvas
           colour, and no element can paint over a page margin. Declaring this
           document light keeps the paper white. Visible only when someone prints
           with "Background graphics" turned on, which is exactly when it is worst. */
        html { color-scheme: light; }

        /* On screen each of these is a pane of paper: white ground, and the sheet
           scrolls inside it rather than being squeezed. A phone is 390px wide and
           the form has twelve columns, so squashing it makes the last ones
           unreadable. */
        .ht-page { background: #fff; color: #000; padding: 24px; overflow-x: auto; }
        .ht-sheet { font-family: Arial, Helvetica, sans-serif; color: #000; min-width: 940px; }
        .ht-title { text-align: center; font-weight: 700; font-size: 20px; letter-spacing: .02em; }
        .ht-sheetno { text-align: right; font-size: 11px; }
        .ht table { width: 100%; border-collapse: collapse; }
        .ht th, .ht td { border: 1px solid #000; padding: 3px 4px; font-size: 10px; color: #000; }
        .ht td, .ht th, .ht-title, .ht-sheetno, .ht-sheet * { color: #000 !important; }
        .ht th { font-weight: 700; text-align: center; background: #fff; }
        .ht .hdr td { font-size: 11px; height: 22px; }
        .ht .hdr .lbl { font-weight: 700; width: 130px; white-space: nowrap; }
        /* What was filled in: 2px larger and bold, so the sheet is easy to read
           on paper or on a phone. Only the answers — the column headers, the box
           labels and the title keep their existing size and weight, and the row
           height and padding are untouched so the grid and pagination do not move. */
        /* The row stays 24px; the space around the text inside it gives way instead,
           so the grid and the page breaks are exactly where they were. */
        .ht .rows td { height: 24px; padding: 2px 4px; font-size: 12px; font-weight: 700; line-height: 14px; }
        .ht .hdr .val { font-size: 13px; font-weight: 700; line-height: 15px; }
        .ht .c { text-align: center; }
        .ht .tick { font-size: 14px; line-height: 14px; }

        /* On screen, a visible gap so it reads as a stack of pages rather than one
           long table. In print the gap is the page break itself. */
        .ht-page + .ht-page { margin-top: 24px; border-top: 1px dashed #999; }

        @page { size: landscape; margin: 10mm; }

        @media print {
          /* on paper there is nothing to scroll: the sheet lays out at page width */
          .ht-page { padding: 0; overflow: visible; }
          .ht-sheet { min-width: 0; }
          .ht-page + .ht-page { margin-top: 0; border-top: 0; }
          /* one sheet per page: every page but the last ends here */
          .page-break { page-break-after: always; }
          /* Repeat the column headers when a long sheet runs onto a second page,
             or the shop gets a page of unlabelled numbers. */
          .ht thead { display: table-header-group; }
          .ht tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print shell flex flex-wrap items-center justify-between gap-4 py-6">
        <Link href={`/admin/measurement/${set.id}`} className="btn btn-ghost">
          ← Back to editing
        </Link>
        <div className="flex items-center gap-4">
          <p className="hud text-faint hidden md:block">
            {total} sheet{total === 1 ? "" : "s"} · one page each
          </p>
          <button
            type="button"
            onClick={async () => {
              setDownloading(true)
              try {
                await downloadMeasurementSetPdf(set.id)
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
          <button type="button" onClick={() => window.print()} className="btn btn-primary">
            Print
          </button>
        </div>
      </div>

      {set.sheets.map((sheet, sheetNo) => {
        const blanks = Math.max(0, MIN_PRINTED_ROWS - sheet.rows.length)

        return (
          <div
            key={sheet.id}
            // every page but the last breaks after itself
            className={`ht-page${sheetNo < total - 1 ? " page-break" : ""}`}
          >
            <div className="ht ht-sheet">
              <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 8 }}>
                <div className="ht-title" style={{ flex: 1 }}>
                  HT BLINDS
                </div>
                <div className="ht-sheetno" style={{ width: 160 }}>
                  SHEET# {sheet.sheetIndex} of {total}
                </div>
              </div>

              {/*
                The header boxes, laid out as on the paper form. Repeated on every
                page: once the stack is split up on a bench, a page has to say for
                itself which job and level it belongs to.
              */}
              <table style={{ marginBottom: 8 }}>
                <tbody className="hdr">
                  <tr>
                    <td className="lbl">CONTRACTOR</td>
                    <td className="val">{set.contractor ?? ""}</td>
                    <td className="lbl" style={{ width: 90 }}>
                      DATE
                    </td>
                    <td className="val" style={{ width: 220 }}>{set.sheetDate ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="lbl">PROJECT NAME</td>
                    <td className="val">{set.projectName ?? ""}</td>
                    <td className="lbl">MEASUREMENT</td>
                    <td className="val">
                      {/* both boxes always print, with the one that was used ticked */}
                      TAPE [{set.measurementMethod === "TAPE" ? "X" : " "}] &nbsp; LASER [
                      {set.measurementMethod === "LASER" ? "X" : " "}]
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">BUILDING/LEVEL #</td>
                    <td className="val">{set.buildingLevel ?? ""}</td>
                    <td className="lbl">INSTALLER</td>
                    <td className="val">{set.installer ?? ""}</td>
                  </tr>
                </tbody>
              </table>

              <table>
                <thead>
                  {/*
                    CUT FABRIC carries free text and is the one column that ran out of
                    room at the larger size, wrapping to a second line and pushing a full
                    sheet onto an extra page. The width comes from WIDTH, HEIGHT and
                    MOTORS, which hold six characters at most and had it to spare.
                  */}
                  <tr>
                    <th style={{ width: "5%" }}>Unit</th>
                    <th style={{ width: "5%" }}>S.NO</th>
                    <th style={{ width: "7.5%" }}>WIDTH</th>
                    <th style={{ width: "7.5%" }}>HEIGHT</th>
                    <th style={{ width: "5%" }}>CONT</th>
                    <th style={{ width: "5%" }}>OM FW</th>
                    <th style={{ width: "6%" }}>END CAP</th>
                    <th style={{ width: "15%" }}>CUT FABRIC</th>
                    <th style={{ width: "8%" }}>CHAIN LENGTH</th>
                    <th style={{ width: "7%" }}>FASCIA SIZE</th>
                    <th style={{ width: "7%" }}>MOTORS</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody className="rows">
                  {sheet.rows.map((row, i) => (
                    <tr key={row.id}>
                      <td className="c">{unitColumn(sheet.rows, i)}</td>
                      <td className="c">{row.serialNo}</td>
                      {/* the fractions as written on site, not the decimal */}
                      <td className="c">{formatInches(row.width)}</td>
                      <td className="c">{formatInches(row.height)}</td>
                      <td className="c">{row.cont ?? ""}</td>
                      <td className="c tick">{row.omFw ? "✓" : ""}</td>
                      <td className="c tick">{row.endCap ? "✓" : ""}</td>
                      <td>{cut(row)}</td>
                      <td className="c">
                        {row.chainLength == null ? "" : formatInches(row.chainLength)}
                      </td>
                      {/* "ND", or the size as it was written — the API derives both */}
                      <td className="c">{row.fasciaSize ?? ""}</td>
                      <td className="c">{motors(row)}</td>
                      <td>{row.notes ?? ""}</td>
                    </tr>
                  ))}

                  {Array.from({ length: blanks }).map((_, i) => (
                    <tr key={`blank-${i}`}>
                      {Array.from({ length: 12 }).map((__, j) => (
                        <td key={j}>&nbsp;</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {set.notes && (
                <p style={{ fontSize: 11, marginTop: 8 }}>
                  <strong>NOTES:</strong> {set.notes}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
