"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ApiError,
  deleteDraftInvoice,
  downloadInvoicePdf,
  emailInvoice,
  getInvoice,
  issueInvoice,
  restoreInvoice,
  voidInvoice,
  type InvoiceView,
} from "@/lib/admin-api"
import { DocStatusBadge, PaymentBadge } from "@/components/admin/InvoiceBadges"
import { CustomerInvoicePreview, formatLongDate } from "@/components/admin/CustomerInvoicePreview"
import { PaymentPanel } from "@/components/admin/PaymentPanel"
import { RevisionHistory } from "@/components/admin/RevisionHistory"

/**
 * One invoice: what the customer sees, beside everything internal about it — payment,
 * status, internal notes and history.
 *
 * Printing this page prints the customer invoice and nothing else. Every internal panel
 * is hidden from print, so a printed copy can be handed to a customer as it is.
 */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setInvoice(await getInvoice(id))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this invoice")
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // The tab, the print header and a "Save as PDF" file name all use the title.
  useEffect(() => {
    if (!invoice) return
    const previous = document.title
    document.title = invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Draft invoice"
    return () => {
      document.title = previous
    }
  }, [invoice])

  async function run(key: string, action: () => Promise<InvoiceView | void>, done?: string) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      const result = await action()
      if (result) setInvoice(result)
      if (done) setNotice(done)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  if (!invoice) {
    return (
      <div className="shell py-14">
        {error ? (
          <>
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
            <Link href="/admin/invoices" className="btn btn-ghost mt-6">
              All invoices
            </Link>
          </>
        ) : (
          <p className="hud text-faint">Loading…</p>
        )}
      </div>
    )
  }

  const inv = invoice
  const title = inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Draft invoice"
  const issued = inv.status === "ISSUED" || inv.status === "SENT"
  const canIssue = inv.status === "DRAFT" && (inv.primary || !inv.projectExists)

  return (
    <div className="shell py-10 md:py-14 print:p-0">
      <style>{`
        @media print {
          html { color-scheme: light !important; background: #fff !important; }
          .invoice-paper { box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; }
        }
        @page { size: letter portrait; margin: 14mm; }
      `}</style>

      <nav aria-label="Breadcrumb" className="hud text-faint print:hidden">
        <Link href="/admin/invoices" className="hover:text-bone transition-colors">
          Invoices
        </Link>
        {inv.projectExists && inv.projectId && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/admin/projects/${inv.projectId}`} className="hover:text-bone transition-colors">
              {inv.projectName}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-mute">{inv.invoiceNumber ?? "Draft"}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6 print:hidden">
        <div>
          <h1 className="display text-bone text-[clamp(28px,4vw,48px)]">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DocStatusBadge status={inv.status} />
            <PaymentBadge status={inv.paymentStatus} docStatus={inv.status} />
            <Link
              href={`/admin/customers/${inv.customerId}`}
              className="text-mute hover:text-bone ml-1 text-sm underline-offset-4 hover:underline"
            >
              {inv.customerName}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {inv.status !== "VOID" && (
            <Link href={`/admin/invoices/${inv.id}/edit`} className="btn btn-primary">
              Edit invoice
            </Link>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("pdf", () => downloadInvoicePdf(inv.id, `${inv.invoiceNumber ?? "draft-invoice"}.pdf`))}
            className="btn btn-ghost disabled:opacity-50"
          >
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
          <button type="button" onClick={() => window.print()} className="btn btn-ghost">
            Print
          </button>
        </div>
      </header>

      {!inv.primary && inv.projectExists && (
        <p className="border-pending/50 text-pending mt-6 rounded-xl border px-4 py-3 text-sm print:hidden">
          This is an older invoice, kept from before each project had one invoice. It can be viewed and
          edited, but the project&rsquo;s own invoice is the one to use going forward.
        </p>
      )}
      {notice && (
        <p role="status" className="text-sky-brand mt-6 text-sm print:hidden">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger mt-6 text-sm print:hidden">
          {error}
        </p>
      )}

      {/* grid-cols-1, not the implicit column: that one grows to the invoice table's width
          on a phone instead of letting the table scroll inside its own box */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] print:mt-0 print:block">
        <div>
          <p className="hud text-faint mb-3 print:hidden">What the customer sees</p>
          <CustomerInvoicePreview invoice={inv} />
        </div>

        <div className="space-y-6 print:hidden">
          <PaymentPanel invoice={inv} onChange={setInvoice} />

          <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="status-title">
            <h2 id="status-title" className="hud text-sky-brand">
              Invoice status
            </h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-faint">Document</dt>
              <dd className="text-bone">
                <DocStatusBadge status={inv.status} />
              </dd>
              <dt className="text-faint">Number</dt>
              <dd className="text-bone">{inv.invoiceNumber ?? "Assigned when issued"}</dd>
              <dt className="text-faint">Issued</dt>
              <dd className="text-bone">{formatLongDate(inv.issuedOn)}</dd>
              <dt className="text-faint">Due</dt>
              <dd className="text-bone">{formatLongDate(inv.dueOn)}</dd>
              {inv.sentAt && (
                <>
                  <dt className="text-faint">Emailed</dt>
                  <dd className="text-bone break-words">
                    {new Date(inv.sentAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                    {inv.sentTo ? ` to ${inv.sentTo}` : ""}
                  </dd>
                </>
              )}
            </dl>

            <div className="mt-5 flex flex-wrap gap-3">
              {canIssue && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!window.confirm("Issue this invoice? It gets its permanent number. It can still be edited afterwards.")) return
                    run("issue", () => issueInvoice(inv.id), "Issued.")
                  }}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {busy === "issue" ? "Issuing…" : "Issue invoice"}
                </button>
              )}
              {issued && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    const to = window.prompt("Email the invoice PDF to:", inv.customerEmail ?? "")
                    if (to === null) return
                    run("email", () => emailInvoice(inv.id, to.trim() ? { to: to.trim() } : {}), "Emailed.")
                  }}
                  className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-4 py-2.5 transition-colors disabled:opacity-40"
                >
                  {busy === "email" ? "Sending…" : "Email to customer"}
                </button>
              )}
              {issued && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    const reason = window.prompt(
                      "Void this invoice? It keeps its number and can be restored later.\n\nReason (optional):",
                      ""
                    )
                    if (reason === null) return
                    run("void", () => voidInvoice(inv.id, inv.version, reason.trim() || undefined), "Voided.")
                  }}
                  className="hud border-danger/40 text-danger hover:bg-danger/10 rounded-lg border px-4 py-2.5 transition-colors disabled:opacity-40"
                >
                  Void
                </button>
              )}
              {inv.status === "VOID" && (inv.primary || !inv.projectExists) && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!window.confirm("Restore this invoice?")) return
                    run("restore", () => restoreInvoice(inv.id, inv.version), "Restored.")
                  }}
                  className="btn btn-ghost disabled:opacity-50"
                >
                  Restore invoice
                </button>
              )}
              {inv.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    if (!window.confirm("Delete this draft? The project can then be invoiced again from the start.")) return
                    setBusy("delete")
                    try {
                      await deleteDraftInvoice(inv.id)
                      router.push(inv.projectExists && inv.projectId ? `/admin/projects/${inv.projectId}` : "/admin/invoices")
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Could not delete the draft")
                      setBusy(null)
                    }
                  }}
                  className="hud border-danger/40 text-danger hover:bg-danger/10 rounded-lg border px-4 py-2.5 transition-colors disabled:opacity-40"
                >
                  Delete draft
                </button>
              )}
            </div>
          </section>

          <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="internal-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="internal-title" className="hud text-sky-brand">
                Internal notes
              </h2>
              <span className="hud text-faint">Never printed</span>
            </div>
            <p className={`mt-3 whitespace-pre-line text-sm ${inv.internalNotes ? "text-mute" : "text-faint"}`}>
              {inv.internalNotes || "None."}
            </p>
          </section>

          <RevisionHistory invoiceId={inv.id} version={inv.version} currency={inv.currency} />
        </div>
      </div>
    </div>
  )
}
