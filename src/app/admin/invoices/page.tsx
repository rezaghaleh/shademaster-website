"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ApiError,
  listInvoices,
  money,
  PAYMENT_METHODS,
  type InvoiceStatus,
  type InvoiceSummary,
  type Page,
  type PaymentStatus,
} from "@/lib/admin-api"
import { DocStatusBadge, PaymentBadge } from "@/components/admin/InvoiceBadges"
import { formatShortDate } from "@/components/admin/CustomerInvoicePreview"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

const METHOD_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]))

/**
 * Every invoice, newest first, with where each stands and whether it is paid — one
 * invoice per project, so this is also the list of invoiced jobs.
 */
export default function InvoicesPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<InvoiceStatus | "">("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<InvoiceSummary> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(
        await listInvoices({
          query: query.trim() || undefined,
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          page,
          size: 20,
        })
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load invoices")
    } finally {
      setLoading(false)
    }
  }, [query, status, paymentStatus, page])

  // debounced, so typing in the search box does not send a request per keystroke
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    setPage(0)
  }, [query, status, paymentStatus])

  const filtered = query || status || paymentStatus

  return (
    <div className="shell py-10 md:py-14">
      <header>
        <p className="hud text-faint">One per project</p>
        <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">Invoices</h1>
      </header>

      <section
        className="border-line bg-ink-raised/50 mt-8 grid gap-4 rounded-2xl border p-5 md:grid-cols-[2fr_1fr_1fr]"
        aria-label="Search and filter"
      >
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="invoice-q">
            Search
          </label>
          <input
            id="invoice-q"
            className={inputClass}
            placeholder="Invoice number, customer or project"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="invoice-status">
            Invoice
          </label>
          <select
            id="invoice-status"
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus | "")}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="SENT">Sent</option>
            <option value="VOID">Void</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="invoice-payment">
            Payment
          </label>
          <select
            id="invoice-payment"
            className={inputClass}
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus | "")}
          >
            <option value="">All</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}

      <section className="mt-8" aria-label="Invoices" aria-busy={loading}>
        {data && data.content.length === 0 && !loading ? (
          <p className="text-faint text-sm">
            {filtered ? "No invoices match those filters." : "No invoices yet. Create one from a project."}
          </p>
        ) : (
          <ul className="space-y-3">
            {data?.content.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className="border-line bg-ink-raised/50 hover:border-sky-brand/40 grid gap-3 rounded-xl border p-4 transition-colors md:grid-cols-[1.3fr_2fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-bone font-medium">
                      {inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Draft"}
                      {!inv.primary && <span className="hud text-faint ml-2">older</span>}
                    </p>
                    <p className="text-faint mt-1 text-xs">
                      {inv.issuedOn ? `Issued ${formatShortDate(inv.issuedOn)}` : "Not issued"}
                    </p>
                  </div>
                  <div>
                    <p className="text-mute text-sm">{inv.customerName}</p>
                    <p className="text-faint text-xs">{inv.projectName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <DocStatusBadge status={inv.status} />
                    <PaymentBadge status={inv.paymentStatus} docStatus={inv.status} />
                    {inv.lastPaymentMethod && inv.status !== "VOID" && (
                      <span className="hud text-faint" title="Internal — never on the customer invoice">
                        {METHOD_LABEL[inv.lastPaymentMethod]}
                      </span>
                    )}
                  </div>
                  <div className="md:min-w-[8rem] md:text-right">
                    <p className="text-bone font-semibold tabular-nums">{money(inv.grandTotal, inv.currency)}</p>
                    {inv.paymentStatus === "PARTIALLY_PAID" && inv.status !== "VOID" && (
                      <p className="text-pending mt-0.5 text-xs tabular-nums">
                        {money(inv.balanceDue, inv.currency)} due
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <nav className="border-line mt-6 flex items-center justify-between border-t pt-5" aria-label="Pagination">
            <button
              type="button"
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 disabled:opacity-40"
              disabled={data.first}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
            >
              Previous
            </button>
            <span className="hud text-faint">
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} total
            </span>
            <button
              type="button"
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 disabled:opacity-40"
              disabled={data.last}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
