"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ApiError,
  createInvoice,
  listProjectInvoices,
  money,
  type InvoiceRef,
  type InvoiceSummary,
} from "@/lib/admin-api"
import { DocStatusBadge, PaymentBadge } from "@/components/admin/InvoiceBadges"

/**
 * The project's invoice: one per project.
 *
 * Before it exists, a single "Create invoice". After, the invoice itself with where it
 * stands and whether it is paid, and the way in to view or edit it — never a second
 * invoice. Projects invoiced before that rule also list their older invoices, read-only.
 */
export function ProjectInvoiceCard({
  projectId,
  invoice,
  invoiceCount,
  canInvoice,
}: {
  projectId: string
  invoice: InvoiceRef | null | undefined
  invoiceCount: number
  canInvoice: boolean
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [older, setOlder] = useState<InvoiceSummary[]>([])

  useEffect(() => {
    if (invoiceCount <= (invoice ? 1 : 0)) return
    listProjectInvoices(projectId)
      .then((all) => setOlder(all.filter((i) => !i.primary)))
      .catch(() => setOlder([]))
  }, [projectId, invoice, invoiceCount])

  async function create() {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      // Returns the existing invoice if there already is one, so a second click — or a
      // second admin — lands on the same invoice instead of making another.
      const created = await createInvoice(projectId)
      router.push(`/admin/invoices/${created.id}/edit`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the invoice")
      setCreating(false)
    }
  }

  return (
    <section
      className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
      aria-labelledby="invoice-title"
    >
      <h2 id="invoice-title" className="hud text-sky-brand">
        Invoice
      </h2>

      {!invoice ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-mute text-sm">
            {canInvoice
              ? "No invoice yet. It starts from this project's windows and prices, and can be edited before and after it is issued."
              : "Add at least one window before creating the invoice."}
          </p>
          <button
            type="button"
            onClick={create}
            disabled={!canInvoice || creating}
            className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create invoice"}
          </button>
        </div>
      ) : (
        <div className="border-line bg-ink/60 mt-5 flex flex-wrap items-center justify-between gap-5 rounded-xl border p-5">
          <div>
            <p className="text-bone text-lg font-medium">
              {invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Draft invoice"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DocStatusBadge status={invoice.status} />
              <PaymentBadge status={invoice.paymentStatus} docStatus={invoice.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="hud text-faint">Total</p>
            <p className="text-bone text-xl font-semibold tabular-nums">
              {money(invoice.grandTotal, invoice.currency)}
            </p>
            {invoice.paymentStatus === "PARTIALLY_PAID" && invoice.status !== "VOID" && (
              <p className="text-pending mt-1 text-sm tabular-nums">
                {money(invoice.balanceDue, invoice.currency)} due
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <Link href={`/admin/invoices/${invoice.id}`} className="btn btn-ghost">
              View invoice
            </Link>
            {invoice.status !== "VOID" && (
              <Link href={`/admin/invoices/${invoice.id}/edit`} className="btn btn-primary">
                Edit invoice
              </Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}

      {older.length > 0 && (
        <details className="mt-5">
          <summary className="hud text-faint hover:text-bone cursor-pointer">
            {older.length} older invoice{older.length === 1 ? "" : "s"} from before one invoice per project
          </summary>
          <ul className="mt-3 space-y-2">
            {older.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className="border-line hover:border-sky-brand/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="text-mute text-sm">{inv.invoiceNumber ?? "Draft"}</span>
                  <span className="flex items-center gap-2">
                    <DocStatusBadge status={inv.status} />
                    <PaymentBadge status={inv.paymentStatus} docStatus={inv.status} />
                    <span className="text-mute text-sm tabular-nums">{money(inv.grandTotal, inv.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
