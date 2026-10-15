"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BellRing, CircleCheck, Clock, TriangleAlert } from "lucide-react"
import {
  ApiError,
  getReceivables,
  money,
  subscribeToInvoiceChanges,
  type ReceivableInvoice,
  type Receivables,
} from "@/lib/admin-api"
import { PaymentBadge, unpaidAge } from "@/components/admin/InvoiceBadges"
import { formatShortDate } from "@/components/admin/CustomerInvoicePreview"
import { MarkPaidModal, type PayableInvoice } from "@/components/admin/MarkPaidModal"

type Sort = "urgent" | "largest" | "customer"

/**
 * Payment reminders: every invoice with money still owed on it.
 *
 * Generated from the invoices each time the page loads — there is no list of reminders
 * to keep. Paying an invoice anywhere in the admin takes it off this page; marking it
 * unpaid again brings it back.
 */
export default function RemindersPage() {
  const [data, setData] = useState<Receivables | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>("urgent")
  const [paying, setPaying] = useState<PayableInvoice | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    getReceivables()
      .then((r) => {
        setData(r)
        setError(null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the payment reminders"))
  }, [])

  useEffect(() => {
    load()
    return subscribeToInvoiceChanges(load)
  }, [load])

  const invoices = useMemo(() => {
    if (!data) return []
    const list = [...data.invoices]
    if (sort === "largest") list.sort((a, b) => b.balanceDue - a.balanceDue)
    if (sort === "customer") list.sort((a, b) => a.customerName.localeCompare(b.customerName, "en-CA"))
    return list // "urgent" is the server's order: most overdue first, then longest waiting
  }, [data, sort])

  const s = data?.summary

  return (
    <div className="shell py-10 md:py-14">
      <header>
        <p className="hud text-faint">Accounts receivable</p>
        <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">Payment reminders</h1>
        <p className="text-mute mt-3 max-w-2xl text-sm leading-[1.65]">
          Every issued invoice with a balance still owed, worked out from the invoices themselves. Paying an
          invoice — here, on its project or on the invoice page — takes it off this list.
        </p>
      </header>

      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-good mt-6 text-sm">
          {notice}
        </p>
      )}

      <section aria-label="Summary" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Unpaid invoices" value={s ? String(s.unpaidInvoices) : "—"} />
        <SummaryCard label="Total outstanding" value={s ? money(s.totalOutstanding, s.currency) : "—"} strong />
        <SummaryCard label="Customers with balances" value={s ? String(s.customersWithBalance) : "—"} />
        <SummaryCard label="Overdue" value={s ? String(s.overdueInvoices) : "—"} danger={!!s && s.overdueInvoices > 0} />
      </section>

      {data && data.invoices.length === 0 ? (
        <section className="border-line bg-ink-raised/50 mt-6 flex flex-col items-center rounded-2xl border px-6 py-14 text-center">
          <CircleCheck aria-hidden="true" className="text-good h-12 w-12" strokeWidth={1.5} />
          <p className="text-bone mt-4 text-lg font-semibold">No unpaid payments</p>
          <p className="text-mute mt-1 text-sm">All outstanding balances have been cleared.</p>
        </section>
      ) : (
        data && (
          <>
            {/* ------------------------------------------- notifications */}
            <section aria-labelledby="reminders-feed-title" className="mt-8">
              <div className="flex items-center gap-3">
                <BellRing aria-hidden="true" className="text-sky-brand h-5 w-5" />
                <h2 id="reminders-feed-title" className="hud text-sky-brand">
                  Reminders
                </h2>
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {data.customers.map((c) => (
                  <li key={c.customerId}>
                    <Link
                      href={`/admin/customers/${c.customerId}`}
                      className={`bg-ink-raised/50 hover:bg-ink-raised flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                        c.overdue ? "border-danger/40" : "border-line"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          c.overdue ? "bg-danger/15 text-danger" : "bg-sky-brand/10 text-sky-brand"
                        }`}
                      >
                        {c.overdue ? (
                          <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                        ) : (
                          <Clock aria-hidden="true" className="h-5 w-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="hud text-faint block">{c.overdue ? "Payment overdue" : "Payment outstanding"}</span>
                        <span className="text-bone mt-1 block font-medium">{c.customerName}</span>
                        <span className="text-mute block text-sm">
                          {c.invoiceCount === 1
                            ? `Invoice ${c.firstInvoiceNumber ?? ""} · ${c.firstProjectName}`
                            : `${c.invoiceCount} invoices`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="text-bone block font-semibold tabular-nums">{money(c.outstanding)}</span>
                        <span className={`block text-xs ${c.overdue ? "text-danger" : "text-faint"}`}>
                          {unpaidAge(c.daysOutstanding)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* ------------------------------------------------- the invoices */}
            <section aria-labelledby="outstanding-title" className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="outstanding-title" className="hud text-sky-brand">
                  Outstanding invoices
                </h2>
                <label className="flex items-center gap-3">
                  <span className="hud text-faint">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="border-line-strong bg-ink text-bone h-10 rounded-lg border px-3 text-sm"
                  >
                    <option value="urgent">Most urgent first</option>
                    <option value="largest">Largest balance first</option>
                    <option value="customer">Customer A–Z</option>
                  </select>
                </label>
              </div>
              <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                {invoices.map((inv) => (
                  <ReminderCard
                    key={inv.invoiceId}
                    invoice={inv}
                    onPay={() =>
                      setPaying({
                        invoiceId: inv.invoiceId,
                        invoiceNumber: inv.invoiceNumber,
                        version: inv.version,
                        customerName: inv.customerName,
                        projectName: inv.projectName,
                        balanceDue: inv.balanceDue,
                        currency: inv.currency,
                      })
                    }
                  />
                ))}
              </ul>
            </section>
          </>
        )
      )}

      <MarkPaidModal
        target={paying}
        onClose={() => {
          setPaying(null)
          load()
        }}
        onPaid={(updated) => {
          setPaying(null)
          setNotice(
            updated.paymentStatus === "PAID"
              ? `Invoice ${updated.invoiceNumber} is paid.`
              : `Payment recorded on invoice ${updated.invoiceNumber}; ${money(updated.balanceDue, updated.currency)} still due.`
          )
          load()
        }}
      />
    </div>
  )
}

function ReminderCard({ invoice: inv, onPay }: { invoice: ReceivableInvoice; onPay: () => void }) {
  return (
    <li
      className={`bg-ink-raised/50 flex flex-col rounded-2xl border p-6 ${inv.overdue ? "border-danger/40" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/customers/${inv.customerId}`}
            className="text-bone hover:text-sky-brand text-lg font-semibold uppercase tracking-tight transition-colors"
          >
            {inv.customerName}
          </Link>
          <p className="text-mute mt-1 text-sm">Invoice {inv.invoiceNumber}</p>
          {inv.projectName && (
            <p className="text-faint text-sm">
              Project: {inv.projectName}
              {/* the project was deleted; the invoice kept its name, so there is nothing to open */}
              {!inv.projectId && " (deleted)"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge status={inv.paymentStatus} />
          {inv.overdue && (
            <span className="hud border-danger/50 text-danger rounded-full border px-2.5 py-1 font-bold">
              {inv.daysOverdue} {inv.daysOverdue === 1 ? "day" : "days"} overdue
            </span>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="hud text-faint">Outstanding balance</dt>
          <dd className="text-bone mt-1 text-2xl font-semibold tabular-nums">{money(inv.balanceDue, inv.currency)}</dd>
        </div>
        <div>
          <dt className="hud text-faint">Invoice total</dt>
          <dd className="text-mute mt-1 tabular-nums">{money(inv.grandTotal, inv.currency)}</dd>
        </div>
        <div>
          <dt className="hud text-faint">Issued</dt>
          <dd className="text-mute mt-1">{formatShortDate(inv.issuedOn)}</dd>
        </div>
        {inv.paidTotal > 0 && (
          <div className="col-span-2">
            <dt className="hud text-faint">Paid so far</dt>
            <dd className="text-mute mt-1 tabular-nums">{money(inv.paidTotal, inv.currency)}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="hud text-faint">Due</dt>
          <dd className={`mt-1 ${inv.overdue ? "text-danger" : "text-mute"}`}>
            {inv.dueOn ? formatShortDate(inv.dueOn) : "—"} · {unpaidAge(inv.daysOutstanding)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {inv.projectId && (
          <Link href={`/admin/projects/${inv.projectId}`} className="btn btn-ghost !py-2 !text-[0.85rem]">
            View project
          </Link>
        )}
        <Link href={`/admin/invoices/${inv.invoiceId}`} className="btn btn-ghost !py-2 !text-[0.85rem]">
          View invoice
        </Link>
        <button type="button" onClick={onPay} className="btn btn-primary !py-2 !text-[0.85rem]">
          Mark as paid
        </button>
      </div>
    </li>
  )
}

function SummaryCard({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="border-line bg-ink-raised/50 rounded-2xl border p-5">
      <p className="hud text-faint">{label}</p>
      <p
        className={`mt-3 text-[clamp(1.15rem,2.2vw,1.55rem)] font-semibold tabular-nums ${
          danger ? "text-danger" : strong ? "text-bone" : "text-bone"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
