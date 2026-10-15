"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react"
import {
  ApiError,
  downloadSalesTaxReportPdf,
  getSalesTaxReport,
  money,
  type PaymentStatus,
  type SalesTaxCustomer,
  type SalesTaxReport,
} from "@/lib/admin-api"

/** Short enough for a narrow column. */
const PAYMENT_WORD: Record<PaymentStatus, string> = { PAID: "Paid", PARTIALLY_PAID: "Partial", UNPAID: "Unpaid" }

/** "Paid by Cash"; older payments recorded without a method say so plainly. */
const methodLabel = (m: { method: string; label: string }) =>
  m.method === "NOT_RECORDED" ? "Paid, method not recorded" : `Paid by ${m.label}`

/** One row a customer record: two different customers can share a name. */
const customerKey = (c: SalesTaxCustomer) => c.customerId ?? `name:${c.customer}`

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3.5 text-sm outline-none transition-colors"

type Preset = "this-year" | "last-year" | "custom"
type SortKey = "customer" | "invoiceCount" | "salesBeforeTax" | "taxCharged" | "totalSales" | "outstanding"
type Sort = { key: SortKey; dir: "asc" | "desc" }

/** A calendar year as an inclusive ISO range. */
function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/**
 * "Jan 1, 2025" from "2025-01-01".
 *
 * Built from the parts rather than `new Date("2025-01-01")`: that parses as midnight UTC,
 * which in Vancouver is still the previous evening, so every date would print a day early.
 */
function formatDate(iso: string, month: "short" | "long" = "short") {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { month, day: "numeric", year: "numeric" })
}

/** ISO dates compare correctly as strings, which is all a range check needs. */
function isValidIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function presetFor(from: string, to: string, thisYear: number): Preset {
  const t = yearRange(thisYear)
  const l = yearRange(thisYear - 1)
  if (from === t.from && to === t.to) return "this-year"
  if (from === l.from && to === l.to) return "last-year"
  return "custom"
}

const SORT_LABELS: Record<SortKey, string> = {
  customer: "Customer",
  invoiceCount: "Invoices",
  salesBeforeTax: "Sales before tax",
  taxCharged: "Tax charged",
  totalSales: "Total incl. tax",
  outstanding: "Outstanding",
}

/**
 * The year-end sales and tax report: what was sold, to whom, and the tax charged on it.
 *
 * <p>An internal accounting page, not an invoice. It reads invoices that were issued in the
 * period and adds up the totals stored on them when they were issued — nothing on it can
 * change an invoice, and nothing is recalculated from today's prices or tax rate.
 *
 * <p>Two renderings of the same data live here. The dashboard on screen can be searched,
 * sorted and expanded. The printed report beneath it is hidden on screen and always
 * complete: every customer A to Z and every invoice, whatever the dashboard is showing.
 */
export default function SalesTaxReportPage() {
  const thisYear = new Date().getFullYear()

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [preset, setPreset] = useState<Preset>("this-year")
  const [report, setReport] = useState<SalesTaxReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<Sort>({ key: "customer", dir: "asc" })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fromInput = useRef<HTMLInputElement>(null)
  // Only the latest request may land: picking dates quickly must not let an older,
  // slower response overwrite a newer one.
  const requestId = useRef(0)

  // The range lives in the address bar, so a reload or a shared link shows the same period.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const f = params.get("from") ?? ""
    const t = params.get("to") ?? ""
    if (isValidIso(f) && isValidIso(t)) {
      setFrom(f)
      setTo(t)
      setPreset(presetFor(f, t, thisYear))
    } else {
      const r = yearRange(thisYear)
      setFrom(r.from)
      setTo(r.to)
      setPreset("this-year")
    }
  }, [thisYear])

  const rangeOk = isValidIso(from) && isValidIso(to) && from <= to

  useEffect(() => {
    if (!rangeOk) return
    const url = new URL(window.location.href)
    url.searchParams.set("from", from)
    url.searchParams.set("to", to)
    window.history.replaceState(null, "", url)

    const id = ++requestId.current
    setLoading(true)
    setError(null)
    getSalesTaxReport(from, to)
      .then((r) => {
        if (id !== requestId.current) return
        setReport(r)
        setExpanded(new Set())
      })
      .catch((err) => {
        if (id !== requestId.current) return
        setError(err instanceof ApiError ? err.message : "Could not build the report")
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [from, to, rangeOk])

  // The tab, the browser's print header and its "Save as PDF" file name all use the title.
  useEffect(() => {
    if (!report) return
    const previous = document.title
    document.title = `Sales & Tax Report ${report.from} to ${report.to}`
    return () => {
      document.title = previous
    }
  }, [report])

  function choose(next: Preset) {
    setPreset(next)
    if (next === "this-year") {
      const r = yearRange(thisYear)
      setFrom(r.from)
      setTo(r.to)
    } else if (next === "last-year") {
      const r = yearRange(thisYear - 1)
      setFrom(r.from)
      setTo(r.to)
    } else {
      // Custom keeps the dates already chosen and hands them over for editing
      fromInput.current?.focus()
    }
  }

  function changeSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : // names read A to Z first; figures read largest first, which is the question
          // anyone sorting by money is asking
          { key, dir: key === "customer" ? "asc" : "desc" }
    )
  }

  function toggle(key: string) {
    setExpanded((open) => {
      const next = new Set(open)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** The dashboard's view: searched and sorted. The printed report ignores both. */
  const visible = useMemo(() => {
    if (!report) return []
    const q = search.trim().toLowerCase()
    const rows = q
      ? report.customers.filter((c) => c.customer.toLowerCase().includes(q))
      : [...report.customers]
    const dir = sort.dir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      const cmp =
        sort.key === "customer"
          ? a.customer.localeCompare(b.customer, "en-CA", { sensitivity: "base" })
          : (a[sort.key] as number) - (b[sort.key] as number)
      // ties fall back to the name, so the order never shuffles between renders
      return cmp !== 0 ? cmp * dir : a.customer.localeCompare(b.customer, "en-CA", { sensitivity: "base" })
    })
    return rows
  }, [report, search, sort])

  const currency = report?.currency ?? "CAD"
  const fmt = (value: number) => money(value, currency)
  const period = rangeOk ? `${formatDate(from)} → ${formatDate(to)}` : "Choose a period"
  const empty = report !== null && report.summary.invoiceCount === 0
  const filtered = search.trim() !== ""

  async function download() {
    if (!rangeOk) return
    setDownloading(true)
    try {
      await downloadSalesTaxReportPdf(from, to)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the PDF")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      {/* ================================================================ screen */}
      <div className="shell py-10 md:py-14 print:hidden">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="hud text-faint">Accounting · internal</p>
            <h1 className="display text-bone mt-2 text-[clamp(30px,4vw,52px)]">Sales &amp; Tax Report</h1>
            <p className="text-mute mt-3 text-sm tabular-nums">{period}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report || loading || !rangeOk}
              className="btn btn-ghost disabled:pointer-events-none disabled:opacity-50"
            >
              Print Report
            </button>
            <button
              type="button"
              onClick={download}
              disabled={!rangeOk || downloading}
              className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </header>

        {/* ---------------------------------------------------------- the period */}
        <section
          aria-labelledby="period-title"
          className="border-line bg-ink-raised/50 mt-8 rounded-2xl border p-6"
        >
          <h2 id="period-title" className="hud text-sky-brand">
            Reporting period
          </h2>
          <div className="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-[auto_1fr_1fr] md:items-end">
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quick periods">
              {(
                [
                  ["this-year", "This year"],
                  ["last-year", "Last year"],
                  ["custom", "Custom"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={preset === value}
                  onClick={() => choose(value)}
                  className={`hud h-11 whitespace-nowrap rounded-lg border px-3 transition-colors ${
                    preset === value
                      ? "border-sky-brand bg-sky-brand/15 text-bone"
                      : "border-line-strong text-mute hover:text-bone"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="space-y-2">
              <span className="hud text-faint block">From</span>
              <input
                ref={fromInput}
                type="date"
                className={inputClass}
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPreset(presetFor(e.target.value, to, thisYear))
                }}
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">To</span>
              <input
                type="date"
                className={inputClass}
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPreset(presetFor(from, e.target.value, thisYear))
                }}
              />
            </label>
          </div>
          {from && to && !rangeOk && (
            <p role="alert" className="text-danger mt-4 text-sm">
              The start date must be on or before the end date.
            </p>
          )}
          <p className="text-faint mt-4 text-xs leading-[1.6]">
            Both dates are included. Invoices count by their invoice date, using the amounts
            and tax stored on each invoice when it was issued. Issued, sent and paid invoices
            are included; drafts and void invoices are not.
          </p>
        </section>

        {error && (
          <p role="alert" className="text-danger mt-6 text-sm">
            {error}
          </p>
        )}

        {!report ? (
          <p className="hud text-faint mt-8">{loading ? "Building the report…" : ""}</p>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
            {/* -------------------------------------------------------- summary */}
            <section aria-label="Summary" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {(
                [
                  ["Customers", String(report.summary.customerCount)],
                  ["Invoices", String(report.summary.invoiceCount)],
                  ["Sales before tax", fmt(report.summary.salesBeforeTax)],
                  ["Tax collected", fmt(report.summary.taxCollected)],
                  ["Total sales", fmt(report.summary.totalSales)],
                ] as const
              ).map(([label, value], i) => (
                <div
                  key={label}
                  className={`border-line bg-ink-raised/50 rounded-2xl border p-5 ${
                    i === 4 ? "col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <p className="hud text-faint">{label}</p>
                  <p className="text-bone mt-3 text-[clamp(1.15rem,2.2vw,1.55rem)] font-semibold tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            {empty ? (
              <section className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-10 text-center">
                <p className="text-bone text-base">No sales were found for this reporting period.</p>
                <p className="text-faint mt-2 text-sm">
                  Only issued and sent invoices dated within the period are counted, paid or not.
                </p>
              </section>
            ) : (
              <>
                {/* ------------------------------------------- customer breakdown */}
                <section
                  aria-labelledby="customers-title"
                  className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2 id="customers-title" className="hud text-sky-brand">
                      Customer breakdown
                    </h2>
                    <label className="w-full space-y-2 sm:w-72">
                      <span className="sr-only">Search customers</span>
                      <input
                        type="search"
                        className={inputClass}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search customer name"
                      />
                    </label>
                  </div>

                  <p className="text-faint mt-3 text-xs">
                    {filtered
                      ? `Showing ${visible.length} of ${report.customers.length} customers. Totals below cover all of them.`
                      : `${report.customers.length} customer${report.customers.length === 1 ? "" : "s"}. Select a column to sort; open a customer to see the invoices behind the total.`}
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[52rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-line-strong border-b">
                          <th className="w-10" aria-label="Show invoices" />
                          {(
                            ["customer", "invoiceCount", "salesBeforeTax", "taxCharged", "totalSales", "outstanding"] as const
                          ).map((key) =>
                            key === "taxCharged" ? (
                              <Fragment key="taxes">
                                <th className="hud text-faint px-3 py-3 text-left font-semibold">Tax rate(s)</th>
                                <SortHeader k={key} sort={sort} onSort={changeSort} numeric />
                              </Fragment>
                            ) : (
                              <SortHeader key={key} k={key} sort={sort} onSort={changeSort} numeric={key !== "customer"} />
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-faint px-3 py-6 text-center">
                              No customers match “{search.trim()}”.
                            </td>
                          </tr>
                        ) : (
                          visible.map((c) => (
                            <CustomerRows
                              key={customerKey(c)}
                              customer={c}
                              open={expanded.has(customerKey(c))}
                              onToggle={() => toggle(customerKey(c))}
                              fmt={fmt}
                            />
                          ))
                        )}
                      </tbody>
                      {!filtered && (
                        <tfoot>
                          <tr className="border-line-strong text-bone border-t-2 font-semibold">
                            <td />
                            <td className="px-3 py-3">Total</td>
                            <td className="px-3 py-3 text-right tabular-nums">{report.summary.invoiceCount}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{fmt(report.summary.salesBeforeTax)}</td>
                            <td />
                            <td className="px-3 py-3 text-right tabular-nums">{fmt(report.summary.taxCollected)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{fmt(report.summary.totalSales)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{fmt(report.summary.outstanding)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </section>

                {/* ------------------------------------------------ tax breakdown */}
                <section
                  aria-labelledby="taxes-title"
                  className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
                >
                  <h2 id="taxes-title" className="hud text-sky-brand">
                    Tax breakdown
                  </h2>
                  <p className="text-faint mt-3 text-xs leading-[1.6]">
                    One line per tax and rate, as written on the invoices. An invoice charging GST
                    and PST counts under each; invoices from before taxes were itemised keep their
                    combined line.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[34rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-line-strong border-b">
                          <th className="hud text-faint px-3 py-3 text-left font-semibold">Tax (as charged)</th>
                          <th className="hud text-faint px-3 py-3 text-right font-semibold">Invoices</th>
                          <th className="hud text-faint px-3 py-3 text-right font-semibold">Taxable amount</th>
                          <th className="hud text-faint px-3 py-3 text-right font-semibold">Tax collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.taxes.map((t) => (
                          <tr key={t.display} className="border-line border-b">
                            <td className="text-bone px-3 py-3">{t.display}</td>
                            <td className="text-mute px-3 py-3 text-right tabular-nums">{t.invoiceCount}</td>
                            <td className="text-mute px-3 py-3 text-right tabular-nums">{fmt(t.taxableAmount)}</td>
                            <td className="text-bone px-3 py-3 text-right tabular-nums">{fmt(t.taxCollected)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-line-strong text-bone border-t-2 font-semibold">
                          <td className="px-3 py-3">Total tax collected</td>
                          <td />
                          <td />
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(report.summary.taxCollected)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                {/* --------------------------------------------------- the totals */}
                <section
                  aria-labelledby="totals-title"
                  className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
                >
                  <h2 id="totals-title" className="hud text-sky-brand">
                    Totals for the period
                  </h2>
                  <dl className="mt-4 max-w-xl text-sm">
                    <TotalRow label="Total customers" value={String(report.summary.customerCount)} />
                    <TotalRow label="Total invoices" value={String(report.summary.invoiceCount)} />
                    <TotalRow label="Sales before tax" value={fmt(report.summary.salesBeforeTax)} />
                    {report.taxes.map((t) => (
                      <TotalRow key={t.display} label={`${t.display} collected`} value={fmt(t.taxCollected)} />
                    ))}
                    <TotalRow label="Total tax collected" value={fmt(report.summary.taxCollected)} strong />
                    <TotalRow label="Total sales including tax" value={fmt(report.summary.totalSales)} strong />
                    <TotalRow label="Total paid" value={fmt(report.summary.totalPaid)} />
                    <TotalRow label="Outstanding" value={fmt(report.summary.outstanding)} />
                  </dl>
                </section>

                {/* ----------------------------------------------------- payments */}
                <section
                  aria-labelledby="payments-title"
                  className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="payments-title" className="hud text-sky-brand">
                      Payments
                    </h2>
                    <span className="hud text-faint">Internal</span>
                  </div>
                  <p className="text-faint mt-3 text-xs leading-[1.6]">
                    Money received against the invoices in this period, recorded up to when the
                    report was generated. Voided payments are left out.
                  </p>
                  <dl className="mt-4 max-w-xl text-sm">
                    {report.payments.methods.map((m) => (
                      <TotalRow
                        key={m.method}
                        label={`${methodLabel(m)}${m.paymentCount ? ` (${m.paymentCount})` : ""}`}
                        value={fmt(m.amount)}
                      />
                    ))}
                    <TotalRow label="Total paid" value={fmt(report.payments.totalPaid)} strong />
                    <TotalRow label="Outstanding" value={fmt(report.payments.outstanding)} strong />
                    {report.payments.overpaid > 0 && (
                      <TotalRow label="Paid beyond invoice totals" value={fmt(report.payments.overpaid)} />
                    )}
                    <TotalRow label="Total invoiced" value={fmt(report.payments.totalInvoiced)} />
                  </dl>
                  <p className="text-mute mt-3 text-xs">
                    {report.payments.paidCount} paid · {report.payments.partiallyPaidCount} partially paid ·{" "}
                    {report.payments.unpaidCount} unpaid
                  </p>
                </section>
              </>
            )}

            <p className="text-faint mt-6 text-xs leading-[1.6]">
              Generated{" "}
              {new Date(report.generatedAt).toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" })}.
              Read-only: running this report never changes an invoice.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================== the printout */}
      {report && <PrintedReport report={report} fmt={fmt} />}
    </>
  )
}

/** A column heading that sorts the table. */
function SortHeader({
  k,
  sort,
  onSort,
  numeric = false,
}: {
  k: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
  numeric?: boolean
}) {
  const active = sort.key === k
  return (
    <th
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-3 ${numeric ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`hud inline-flex items-center gap-1.5 font-semibold transition-colors ${
          active ? "text-bone" : "text-faint hover:text-bone"
        } ${numeric ? "flex-row-reverse" : ""}`}
      >
        {SORT_LABELS[k]}
        {active ? (
          sort.dir === "asc" ? (
            <ChevronUp aria-hidden="true" className="text-sky-brand h-3.5 w-3.5" />
          ) : (
            <ChevronDown aria-hidden="true" className="text-sky-brand h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}

/** One customer's line, and — when opened — the invoices behind it. */
function CustomerRows({
  customer: c,
  open,
  onToggle,
  fmt,
}: {
  customer: SalesTaxCustomer
  open: boolean
  onToggle: () => void
  fmt: (value: number) => string
}) {
  const detailId = `detail-${customerKey(c).replace(/[^a-z0-9]+/gi, "-")}`
  return (
    <>
      <tr className={`border-line border-b ${open ? "bg-sky-brand/[0.04]" : ""}`}>
        <td className="px-2 py-2 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`${open ? "Hide" : "Show"} invoices for ${c.customer}`}
            className="border-line-strong text-mute hover:text-bone grid h-8 w-8 place-items-center rounded-md border transition-colors"
          >
            <ChevronRight aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        </td>
        <td className="text-bone px-3 py-3 align-top font-medium">
          {/* the customer's page — also how two customers who share a name are told apart */}
          {c.customerId ? (
            <Link
              href={`/admin/customers/${c.customerId}`}
              className="hover:text-sky-brand underline-offset-4 transition-colors hover:underline"
            >
              {c.customer}
            </Link>
          ) : (
            c.customer
          )}
        </td>
        <td className="text-mute px-3 py-3 text-right align-top tabular-nums">{c.invoiceCount}</td>
        <td className="text-mute px-3 py-3 text-right align-top tabular-nums">{fmt(c.salesBeforeTax)}</td>
        <td className="text-mute px-3 py-3 align-top">
          {c.taxRates.map((r) => (
            <span key={r} className="block whitespace-nowrap">
              {r}
            </span>
          ))}
        </td>
        <td className="text-mute px-3 py-3 text-right align-top tabular-nums">{fmt(c.taxCharged)}</td>
        <td className="text-bone px-3 py-3 text-right align-top font-medium tabular-nums">{fmt(c.totalSales)}</td>
        <td
          className={`px-3 py-3 text-right align-top tabular-nums ${c.outstanding > 0 ? "text-pending" : "text-mute"}`}
        >
          {fmt(c.outstanding)}
        </td>
      </tr>
      {open && (
        <tr id={detailId} className="border-line border-b">
          <td />
          <td colSpan={7} className="pb-4 pr-3">
            <table className="w-full border-collapse text-[0.8rem]">
              <thead>
                <tr className="text-faint">
                  <th className="hud px-2 py-2 text-left font-semibold">Invoice</th>
                  <th className="hud px-2 py-2 text-left font-semibold">Date</th>
                  <th className="hud px-2 py-2 text-left font-semibold">Project</th>
                  <th className="hud px-2 py-2 text-right font-semibold">Before tax</th>
                  <th className="hud px-2 py-2 text-left font-semibold">Tax</th>
                  <th className="hud px-2 py-2 text-right font-semibold">Tax amount</th>
                  <th className="hud px-2 py-2 text-right font-semibold">Total</th>
                  <th className="hud px-2 py-2 text-left font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody>
                {c.invoices.map((i) => (
                  <tr key={i.id} className="border-line border-t">
                    <td className="text-bone px-2 py-2 tabular-nums">{i.invoiceNumber ?? "—"}</td>
                    <td className="text-mute whitespace-nowrap px-2 py-2">{formatDate(i.issuedOn)}</td>
                    <td className="text-mute px-2 py-2">{i.projectName ?? ""}</td>
                    <td className="text-mute px-2 py-2 text-right tabular-nums">{fmt(i.salesBeforeTax)}</td>
                    <td className="text-mute whitespace-nowrap px-2 py-2">{i.taxDisplay}</td>
                    <td className="text-mute px-2 py-2 text-right tabular-nums">{fmt(i.taxCharged)}</td>
                    <td className="text-bone px-2 py-2 text-right tabular-nums">{fmt(i.total)}</td>
                    <td className={`whitespace-nowrap px-2 py-2 ${i.paymentStatus === "PAID" ? "text-good" : "text-mute"}`}>
                      {PAYMENT_WORD[i.paymentStatus]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-6 border-b py-2.5 ${
        strong ? "border-line-strong text-bone font-semibold" : "border-line text-mute"
      }`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * The report as it goes on paper: hidden on screen, the only thing that prints.
 *
 * Always the whole report — every customer A to Z and every invoice behind them —
 * regardless of the search, sort or open rows on the dashboard above. Black on white with
 * its own styles, because the admin theme's navy would print as a solid block.
 */
function PrintedReport({ report, fmt }: { report: SalesTaxReport; fmt: (value: number) => string }) {
  const empty = report.summary.invoiceCount === 0
  const generated = new Date(report.generatedAt).toLocaleString("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  })
  const statuses = report.statusesIncluded.map((s) => s.toLowerCase())
  const basis =
    statuses.length > 1
      ? `${statuses.slice(0, -1).join(", ")} and ${statuses[statuses.length - 1]}`
      : statuses.join("")

  return (
    <section className="str-print hidden print:block" aria-hidden="true">
      <style>{`
        /* The paper, not the theme: a dark-mode admin otherwise fills the page margins
           with its dark canvas when "Background graphics" is on. */
        @media print {
          html { color-scheme: light !important; background: #fff !important; }
        }
        @page { size: letter portrait; margin: 14mm 13mm 16mm 13mm; }

        .str-print { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9.5pt; }
        .str-print * { color: #000 !important; }
        /* the logo file sits on a #F8F8F8 square; lifting it to white drops the grey box,
           as the PDF does by making that background transparent */
        .str-print .logo { width: 22mm; height: auto; margin-bottom: 2mm; filter: brightness(1.07); }
        .str-print .company { font-size: 13pt; font-weight: 700; }
        .str-print .title { font-size: 19pt; font-weight: 700; margin: 5mm 0 1.5mm; }
        .str-print .meta { margin: 0.6mm 0; }
        .str-print .rule { border-bottom: 1.2pt solid #000; margin: 4mm 0 5mm; }

        .str-print .cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2mm; margin-bottom: 5mm; }
        .str-print .card { border: 0.6pt solid #999; padding: 2.5mm 3mm; }
        .str-print .card-label { font-size: 7pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
        .str-print .card-value { font-size: 11.5pt; font-weight: 700; margin-top: 1.2mm; font-variant-numeric: tabular-nums; }

        .str-print h2 { font-size: 11.5pt; font-weight: 700; margin: 7mm 0 2.5mm; break-after: avoid; page-break-after: avoid; }
        .str-print table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .str-print th { font-size: 7.5pt; font-weight: 700; text-align: left; border-bottom: 1pt solid #000; padding: 1.6mm 1.4mm; vertical-align: bottom; }
        .str-print td { font-size: 8.5pt; padding: 1.6mm 1.4mm; border-bottom: 0.4pt solid #bbb; vertical-align: top; overflow-wrap: anywhere; }
        .str-print .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .str-print .rate { display: block; }
        /* headings repeat on every page a long table runs onto; rows never split */
        .str-print thead { display: table-header-group; }
        .str-print tr { break-inside: avoid; page-break-inside: avoid; }
        .str-print tr.total td { font-weight: 700; border-top: 1pt solid #000; border-bottom: 1.5pt double #000; }
        .str-print tr.group td { font-weight: 700; background: #f0f0f0; border-bottom: 0.6pt solid #888; }
        .str-print tr.subtotal td { font-weight: 700; border-bottom: 0.8pt solid #666; }
        /* a customer's heading, invoices and subtotal stay on one page, as in the PDF */
        .str-print tbody.customer { break-inside: avoid; page-break-inside: avoid; }
        .str-print .totals { width: 62%; break-inside: avoid; page-break-inside: avoid; }
        .str-print .totals td { font-size: 9pt; }
        .str-print .totals tr.grand td { font-weight: 700; font-size: 10pt; border-top: 1pt solid #000; border-bottom: 1.5pt double #000; }
        .str-print .empty { border: 0.8pt solid #999; padding: 8mm; text-align: center; font-size: 11pt; margin: 6mm 0; }
        /* a short table, kept whole rather than leaving its total row alone on a page */
        .str-print table.keep { break-inside: avoid; page-break-inside: avoid; }
        .str-print .counts { font-size: 8pt; margin: 1.5mm 0 0; }
        .str-print .basis { font-size: 7.5pt; margin-top: 6mm; }
      `}</style>

      {/* eslint-disable-next-line @next/next/no-img-element -- printed, not optimised */}
      <img className="logo" src="/shademaster-logo.png" alt="" />
      <div className="company">{report.companyName}</div>
      <div className="title">Sales &amp; Tax Report</div>
      <div className="meta">
        <strong>Reporting period:</strong> {formatDate(report.from, "long")} – {formatDate(report.to, "long")}
      </div>
      <div className="meta">
        <strong>Generated:</strong> {generated}
      </div>
      <div className="rule" />

      <div className="cards">
        {(
          [
            ["Customers", String(report.summary.customerCount)],
            ["Invoices", String(report.summary.invoiceCount)],
            ["Sales before tax", fmt(report.summary.salesBeforeTax)],
            ["Tax collected", fmt(report.summary.taxCollected)],
            ["Total sales", fmt(report.summary.totalSales)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card">
            <div className="card-label">{label}</div>
            <div className="card-value">{value}</div>
          </div>
        ))}
      </div>

      {empty ? (
        <div className="empty">No sales were found for this reporting period.</div>
      ) : (
        <>
          <h2>Customer Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Customer</th>
                <th className="num" style={{ width: "8%" }}>Invoices</th>
                <th className="num" style={{ width: "14%" }}>Sales before tax</th>
                <th style={{ width: "16%" }}>Tax rate(s)</th>
                <th className="num" style={{ width: "12%" }}>Tax charged</th>
                <th className="num" style={{ width: "14%" }}>Total incl. tax</th>
                <th className="num" style={{ width: "14%" }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {report.customers.map((c) => (
                <tr key={customerKey(c)}>
                  <td>{c.customer}</td>
                  <td className="num">{c.invoiceCount}</td>
                  <td className="num">{fmt(c.salesBeforeTax)}</td>
                  <td>
                    {c.taxRates.map((r) => (
                      <span key={r} className="rate">
                        {r}
                      </span>
                    ))}
                  </td>
                  <td className="num">{fmt(c.taxCharged)}</td>
                  <td className="num">{fmt(c.totalSales)}</td>
                  <td className="num">{fmt(c.outstanding)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="num">{report.summary.invoiceCount}</td>
                <td className="num">{fmt(report.summary.salesBeforeTax)}</td>
                <td />
                <td className="num">{fmt(report.summary.taxCollected)}</td>
                <td className="num">{fmt(report.summary.totalSales)}</td>
                <td className="num">{fmt(report.summary.outstanding)}</td>
              </tr>
            </tbody>
          </table>

          <h2>Tax Breakdown</h2>
          <table className="keep">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Tax (as charged)</th>
                <th className="num" style={{ width: "14%" }}>Invoices</th>
                <th className="num" style={{ width: "23%" }}>Taxable amount</th>
                <th className="num" style={{ width: "23%" }}>Tax collected</th>
              </tr>
            </thead>
            <tbody>
              {report.taxes.map((t) => (
                <tr key={t.display}>
                  <td>{t.display}</td>
                  <td className="num">{t.invoiceCount}</td>
                  <td className="num">{fmt(t.taxableAmount)}</td>
                  <td className="num">{fmt(t.taxCollected)}</td>
                </tr>
              ))}
              {/* only the tax adds up: an invoice with GST and PST counts under each */}
              <tr className="total">
                <td>Total tax collected</td>
                <td />
                <td />
                <td className="num">{fmt(report.summary.taxCollected)}</td>
              </tr>
            </tbody>
          </table>

          <h2>Totals for the Period</h2>
          <table className="totals">
            <tbody>
              <tr><td>Customers</td><td className="num">{report.summary.customerCount}</td></tr>
              <tr><td>Invoices</td><td className="num">{report.summary.invoiceCount}</td></tr>
              <tr><td>Sales before tax</td><td className="num">{fmt(report.summary.salesBeforeTax)}</td></tr>
              {report.taxes.map((t) => (
                <tr key={t.display}>
                  <td>{t.display} collected</td>
                  <td className="num">{fmt(t.taxCollected)}</td>
                </tr>
              ))}
              <tr><td>Total tax collected</td><td className="num">{fmt(report.summary.taxCollected)}</td></tr>
              <tr className="grand"><td>Total sales including tax</td><td className="num">{fmt(report.summary.totalSales)}</td></tr>
              <tr><td>Total paid</td><td className="num">{fmt(report.summary.totalPaid)}</td></tr>
              <tr><td>Outstanding</td><td className="num">{fmt(report.summary.outstanding)}</td></tr>
            </tbody>
          </table>

          <h2>Payments</h2>
          <table className="totals">
            <tbody>
              {report.payments.methods.map((m) => (
                <tr key={m.method}>
                  <td>
                    {methodLabel(m)} ({m.paymentCount})
                  </td>
                  <td className="num">{fmt(m.amount)}</td>
                </tr>
              ))}
              <tr className="grand"><td>Total paid</td><td className="num">{fmt(report.payments.totalPaid)}</td></tr>
              <tr><td>Outstanding</td><td className="num">{fmt(report.payments.outstanding)}</td></tr>
              {report.payments.overpaid > 0 && (
                <tr><td>Paid beyond invoice totals</td><td className="num">{fmt(report.payments.overpaid)}</td></tr>
              )}
              <tr><td>Total invoiced</td><td className="num">{fmt(report.payments.totalInvoiced)}</td></tr>
            </tbody>
          </table>
          <p className="counts">
            {report.payments.paidCount} paid · {report.payments.partiallyPaidCount} partially paid ·{" "}
            {report.payments.unpaidCount} unpaid
          </p>

          <h2>Invoice Detail</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Invoice</th>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "13%" }}>Project</th>
                <th className="num" style={{ width: "13%" }}>Before tax</th>
                <th style={{ width: "14%" }}>Tax</th>
                <th className="num" style={{ width: "12%" }}>Tax charged</th>
                <th className="num" style={{ width: "13%" }}>Total</th>
                <th style={{ width: "10%" }}>Payment</th>
              </tr>
            </thead>
            {/* one tbody a customer, so a page break falls between customers, not inside one */}
            {report.customers.map((c) => (
              <tbody key={customerKey(c)} className="customer">
                <tr className="group">
                  <td colSpan={8}>
                    {c.customer} ({c.invoiceCount === 1 ? "1 invoice" : `${c.invoiceCount} invoices`})
                  </td>
                </tr>
                {c.invoices.map((i) => (
                  <tr key={i.id}>
                    <td>{i.invoiceNumber ?? "—"}</td>
                    <td>{formatDate(i.issuedOn)}</td>
                    <td>{i.projectName ?? ""}</td>
                    <td className="num">{fmt(i.salesBeforeTax)}</td>
                    <td>{i.taxDisplay}</td>
                    <td className="num">{fmt(i.taxCharged)}</td>
                    <td className="num">{fmt(i.total)}</td>
                    <td>{PAYMENT_WORD[i.paymentStatus]}</td>
                  </tr>
                ))}
                <tr className="subtotal">
                  <td colSpan={3}>{c.customer} total</td>
                  <td className="num">{fmt(c.salesBeforeTax)}</td>
                  <td />
                  <td className="num">{fmt(c.taxCharged)}</td>
                  <td className="num">{fmt(c.totalSales)}</td>
                  <td />
                </tr>
              </tbody>
            ))}
          </table>
        </>
      )}

      <p className="basis">
        Includes {basis} invoices by invoice date, at the amounts and tax stored on each invoice
        now, paid or not. Each invoice counts once, however often it was edited. Drafts and void
        invoices are excluded. Payments are those recorded against these invoices when the report
        was generated.
      </p>
    </section>
  )
}
