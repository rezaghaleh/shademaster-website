"use client"

import { useEffect, useState } from "react"
import { ApiError, getInvoiceRevisions, money, type InvoiceRevision } from "@/lib/admin-api"
import { paymentStatusLabel } from "@/components/admin/InvoiceBadges"

/**
 * The invoice's history, newest first: who changed what, when, and the total before and
 * after. Internal only, and never a separate invoice — the report counts the invoice once.
 */
export function RevisionHistory({
  invoiceId,
  version,
  currency,
}: {
  invoiceId: string
  /** Reloads whenever the invoice changes. */
  version: number
  currency: string
}) {
  const [revisions, setRevisions] = useState<InvoiceRevision[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    getInvoiceRevisions(invoiceId)
      .then((r) => live && setRevisions(r))
      .catch((err) => live && setError(err instanceof ApiError ? err.message : "Could not load the history"))
    return () => {
      live = false
    }
  }, [invoiceId, version])

  return (
    <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="history-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="history-title" className="hud text-sky-brand">
          History
        </h2>
        <span className="hud text-faint">Internal</span>
      </div>

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
      {revisions && revisions.length === 0 && (
        <p className="text-faint mt-4 text-sm">
          Nothing recorded yet. Changes are kept from the moment the invoice is issued.
        </p>
      )}

      {revisions && revisions.length > 0 && (
        <ol className="mt-4 space-y-3">
          {revisions.map((r) => {
            const totalMoved =
              r.totalBefore != null && r.totalAfter != null && Number(r.totalBefore) !== Number(r.totalAfter)
            const paymentMoved =
              r.paymentStatusBefore && r.paymentStatusAfter && r.paymentStatusBefore !== r.paymentStatusAfter
            return (
              <li key={r.id} className="border-line bg-ink/60 rounded-xl border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-bone text-sm font-medium">{r.summary}</p>
                  <p className="text-faint text-xs tabular-nums">
                    #{r.revisionNumber} ·{" "}
                    {new Date(r.changedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                    {r.changedByName || r.changedBy ? ` · ${r.changedByName ?? r.changedBy}` : ""}
                  </p>
                </div>
                {(totalMoved || paymentMoved) && (
                  <p className="text-mute mt-1 text-xs tabular-nums">
                    {totalMoved &&
                      `Total ${money(Number(r.totalBefore), currency)} → ${money(Number(r.totalAfter), currency)}`}
                    {totalMoved && paymentMoved ? " · " : ""}
                    {paymentMoved &&
                      `${paymentStatusLabel(r.paymentStatusBefore!)} → ${paymentStatusLabel(r.paymentStatusAfter!)}`}
                  </p>
                )}
                {r.changes.length > 0 && (
                  <details className="mt-2">
                    <summary className="hud text-faint hover:text-bone cursor-pointer">
                      {r.changes.length} change{r.changes.length === 1 ? "" : "s"}
                    </summary>
                    <dl className="mt-2 space-y-1.5 text-xs">
                      {r.changes.map((c, i) => (
                        <div key={i} className="grid gap-1 sm:grid-cols-[minmax(0,12rem)_1fr]">
                          <dt className="text-faint">{c.label}</dt>
                          <dd className="text-mute break-words">
                            <span className={c.before ? "" : "text-faint"}>{c.before ?? "—"}</span>
                            <span className="text-faint"> → </span>
                            <span className="text-bone">{c.after ?? "—"}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
