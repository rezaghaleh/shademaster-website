"use client"

import { useState } from "react"
import {
  addPayment,
  ApiError,
  markInvoiceUnpaid,
  money,
  PAYMENT_METHODS,
  updatePayment,
  voidPayment,
  type InvoicePayment,
  type InvoiceView,
  type PaymentMethod,
} from "@/lib/admin-api"
import { centsToAmount, centsToInput, toCents } from "@/lib/invoice-math"
import { PaymentBadge } from "@/components/admin/InvoiceBadges"
import { formatShortDate } from "@/components/admin/CustomerInvoicePreview"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

/** Today as a calendar date in the browser's time zone, for <input type="date">. */
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type Draft = { method: PaymentMethod | ""; detail: string; paidOn: string; amount: string; reference: string; note: string }

/**
 * Payment status and the payments behind it. Internal only: the method, date, reference
 * and note never reach anything the customer receives — their invoice says at most that
 * it is paid and what is left.
 *
 * Every change here saves at once and goes into the invoice's history. Recording a
 * payment never changes what the invoice charges.
 */
export function PaymentPanel({
  invoice,
  onChange,
}: {
  invoice: InvoiceView
  onChange: (updated: InvoiceView) => void
}) {
  const [form, setForm] = useState<{ mode: "add" | "edit"; paymentId?: string; draft: Draft } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fmt = (v: number) => money(v, invoice.currency)
  const payable = invoice.status === "ISSUED" || invoice.status === "SENT"
  const active = invoice.payments.filter((p) => !p.voided)
  const voided = invoice.payments.filter((p) => p.voided)

  function openAdd() {
    setError(null)
    setForm({
      mode: "add",
      draft: {
        method: "",
        detail: "",
        paidOn: today(),
        // normally the whole balance; a partial payment is typed over it
        amount: centsToInput(toCents(invoice.balanceDue) ?? 0),
        reference: "",
        note: "",
      },
    })
  }

  function openEdit(p: InvoicePayment) {
    setError(null)
    setForm({
      mode: "edit",
      paymentId: p.id,
      draft: {
        method: p.method ?? "",
        detail: p.methodDetail ?? "",
        paidOn: p.paidOn,
        amount: centsToInput(toCents(p.amount) ?? 0),
        reference: p.reference ?? "",
        note: p.note ?? "",
      },
    })
  }

  async function run(action: () => Promise<InvoiceView>) {
    setBusy(true)
    setError(null)
    try {
      onChange(await action())
      setForm(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (!form) return
    const { draft } = form
    const cents = toCents(draft.amount)
    if (!draft.method) return setError("Choose how it was paid.")
    if (!draft.paidOn) return setError("Choose the payment date.")
    if (cents === null || cents < 0) return setError("Enter the amount paid, e.g. 2450.00")
    const body = {
      version: invoice.version,
      method: draft.method,
      methodDetail: draft.method === "OTHER" ? draft.detail.trim() || null : null,
      paidOn: draft.paidOn,
      amount: centsToAmount(cents),
      reference: draft.reference.trim() || null,
      note: draft.note.trim() || null,
    }
    run(() =>
      form.mode === "add" ? addPayment(invoice.id, body) : updatePayment(invoice.id, form.paymentId!, body)
    )
  }

  function markUnpaid() {
    // one confirmation: this is a real accounting change, but nothing is lost
    if (
      !window.confirm(
        "Mark this invoice unpaid?\n\nIts recorded payments will be voided — kept in the invoice's history, not deleted."
      )
    )
      return
    run(() => markInvoiceUnpaid(invoice.id, invoice.version))
  }

  function voidOne(p: InvoicePayment) {
    if (!window.confirm(`Void the ${fmt(p.amount)} payment of ${formatShortDate(p.paidOn)}? It stays in the history.`)) return
    run(() => voidPayment(invoice.id, p.id, invoice.version, "Voided from the payment list"))
  }

  return (
    <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="payment-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="payment-title" className="hud text-sky-brand">
          Payment status
        </h2>
        <span className="hud text-faint">Internal · never on the customer invoice</span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {payable ? (
            <PaymentBadge status={invoice.paymentStatus} />
          ) : (
            <span className="text-mute text-sm">
              {invoice.status === "DRAFT"
                ? "Issue the invoice before recording a payment."
                : "This invoice is void. Restore it to record payments."}
            </span>
          )}
        </div>
        {payable && (
          <dl className="grid grid-cols-[auto_auto] gap-x-5 gap-y-0.5 text-sm tabular-nums">
            <dt className="text-faint">Paid</dt>
            <dd className="text-bone text-right">{fmt(invoice.paidTotal)}</dd>
            <dt className="text-faint">Balance due</dt>
            <dd className="text-bone text-right font-semibold">{fmt(invoice.balanceDue)}</dd>
            {invoice.overpaid > 0 && (
              <>
                <dt className="text-pending">Overpaid</dt>
                <dd className="text-pending text-right">{fmt(invoice.overpaid)}</dd>
              </>
            )}
          </dl>
        )}
      </div>

      {active.length > 0 && (
        <ul className="mt-5 space-y-2">
          {active.map((p) => (
            <li key={p.id} className="border-line bg-ink/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="text-bone text-sm font-medium">
                  {fmt(p.amount)} · {p.methodLabel} · {formatShortDate(p.paidOn)}
                </p>
                {(p.reference || p.note) && (
                  <p className="text-mute mt-1 text-xs">{[p.reference, p.note].filter(Boolean).join(" — ")}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(p)}
                  className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                  aria-label={`Edit the ${fmt(p.amount)} payment`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => voidOne(p)}
                  className="hud border-line-strong text-mute hover:text-danger rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                  aria-label={`Void the ${fmt(p.amount)} payment`}
                >
                  Void
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="border-sky-brand/40 mt-5 rounded-xl border p-5">
          <p className="hud text-bone">{form.mode === "add" ? "Record a payment" : "Correct the payment"}</p>

          <fieldset className="mt-4">
            <legend className="hud text-faint">Payment method</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => {
                const on = form.draft.method === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm({ ...form, draft: { ...form.draft, method: m.value } })}
                    className={`hud rounded-lg border px-3 py-2.5 transition-colors ${
                      on ? "border-sky-brand bg-sky-brand/15 text-bone" : "border-line-strong text-mute hover:text-bone"
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {form.draft.method === "OTHER" && (
            <label className="mt-4 block space-y-2">
              <span className="hud text-faint block">How was it paid? (optional)</span>
              <input
                className={inputClass}
                placeholder="e.g. card terminal, bank draft"
                maxLength={100}
                value={form.draft.detail}
                onChange={(e) => setForm({ ...form, draft: { ...form.draft, detail: e.target.value } })}
              />
            </label>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="hud text-faint block">Payment date</span>
              <input
                type="date"
                className={inputClass}
                value={form.draft.paidOn}
                onChange={(e) => setForm({ ...form, draft: { ...form.draft, paidOn: e.target.value } })}
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Amount paid</span>
              <input
                inputMode="decimal"
                className={`${inputClass} tabular-nums`}
                value={form.draft.amount}
                onChange={(e) => setForm({ ...form, draft: { ...form.draft, amount: e.target.value } })}
              />
            </label>
          </div>
          {form.mode === "add" && (
            <p className="text-faint mt-2 text-xs">
              Normally the whole balance of {fmt(invoice.balanceDue)}. Enter less to record a partial payment.
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="hud text-faint block">Reference (optional)</span>
              <input
                className={inputClass}
                placeholder="Cheque #1043"
                value={form.draft.reference}
                onChange={(e) => setForm({ ...form, draft: { ...form.draft, reference: e.target.value } })}
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Note (optional)</span>
              <input
                className={inputClass}
                placeholder="E-transfer received Oct 14"
                value={form.draft.note}
                onChange={(e) => setForm({ ...form, draft: { ...form.draft, note: e.target.value } })}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Saving…" : form.mode === "add" ? "Save payment" : "Save correction"}
            </button>
            <button type="button" disabled={busy} onClick={() => setForm(null)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}

      {payable && !form && (
        <div className="mt-5 flex flex-wrap gap-3">
          {invoice.balanceDue > 0 && (
            <button type="button" disabled={busy} onClick={openAdd} className="btn btn-primary disabled:opacity-50">
              {active.length === 0 ? "Mark as paid" : "Record payment"}
            </button>
          )}
          {active.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={markUnpaid}
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-4 py-2.5 transition-colors disabled:opacity-40"
            >
              Mark unpaid
            </button>
          )}
        </div>
      )}

      {voided.length > 0 && (
        <details className="mt-5">
          <summary className="hud text-faint hover:text-bone cursor-pointer">
            {voided.length} voided payment{voided.length === 1 ? "" : "s"} (kept as history)
          </summary>
          <ul className="mt-3 space-y-2">
            {voided.map((p) => (
              <li key={p.id} className="border-line rounded-lg border px-4 py-3 text-sm">
                <p className="text-mute line-through">
                  {fmt(p.amount)} · {p.methodLabel} · {formatShortDate(p.paidOn)}
                  {p.reference ? ` · ${p.reference}` : ""}
                </p>
                <p className="text-faint mt-1 text-xs">
                  Voided {p.voidedAt ? new Date(p.voidedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : ""}
                  {p.voidedBy ? ` by ${p.voidedBy}` : ""}
                  {p.voidReason ? ` — ${p.voidReason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
