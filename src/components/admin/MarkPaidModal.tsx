"use client"

import { useEffect, useRef, useState } from "react"
import {
  addPayment,
  ApiError,
  money,
  PAYMENT_METHODS,
  STALE_VERSION,
  type InvoiceView,
  type PaymentMethod,
} from "@/lib/admin-api"
import { centsToAmount, centsToInput, toCents } from "@/lib/invoice-math"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

/** The invoice a payment is being recorded against. */
export type PayableInvoice = {
  invoiceId: string
  invoiceNumber?: string | null
  version: number
  customerName: string
  projectName?: string | null
  balanceDue: number
  currency: string
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * "Mark as paid", asking how the money came in before anything is recorded.
 *
 * It records an ordinary payment on the invoice — the same one the invoice page records —
 * so the invoice, its project, the customer, the reminders and the reports all change
 * together. The method is required and stays internal; it never reaches the customer's
 * invoice.
 */
export function MarkPaidModal({
  target,
  onClose,
  onPaid,
}: {
  target: PayableInvoice | null
  onClose: () => void
  onPaid: (updated: InvoiceView) => void
}) {
  const [method, setMethod] = useState<PaymentMethod | "">("")
  const [detail, setDetail] = useState("")
  const [paidOn, setPaidOn] = useState(today())
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const firstMethod = useRef<HTMLButtonElement>(null)

  // a fresh form for each invoice
  useEffect(() => {
    if (!target) return
    setMethod("")
    setDetail("")
    setPaidOn(today())
    setAmount(centsToInput(toCents(target.balanceDue) ?? 0))
    setReference("")
    setError(null)
    setBusy(false)
    setTimeout(() => firstMethod.current?.focus(), 0)
  }, [target])

  if (!target) return null

  const fmt = (v: number) => money(v, target.currency)
  const cents = toCents(amount)
  const balanceCents = toCents(target.balanceDue) ?? 0

  async function confirm() {
    if (!target) return
    if (!method) return setError("Choose how the customer paid.")
    if (!paidOn) return setError("Choose the payment date.")
    if (cents === null || cents <= 0) return setError("Enter the amount paid, e.g. 500.00")
    setBusy(true)
    setError(null)
    try {
      const updated = await addPayment(target.invoiceId, {
        version: target.version,
        method,
        methodDetail: method === "OTHER" ? detail.trim() || null : null,
        paidOn,
        amount: centsToAmount(cents),
        reference: reference.trim() || null,
      })
      onPaid(updated)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === STALE_VERSION
            ? "This invoice changed somewhere else a moment ago. Close this, and the list will show its latest balance."
            : err.message
          : "Could not record the payment"
      )
      setBusy(false)
    }
  }

  // keeps keyboard focus inside the dialog, and Escape closes it
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !busy) {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== "Tab" || !dialog.current) return
    const focusable = dialog.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href]'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-paid-title"
        onKeyDown={onKeyDown}
        className="border-line-strong bg-ink-raised max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl"
      >
        <h2 id="mark-paid-title" className="display text-bone text-2xl">
          Mark invoice as paid
        </h2>
        <p className="hud text-mute mt-1">Internal · never on the customer invoice</p>

        <dl className="border-line mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-xl border p-4 text-sm">
          <dt className="text-mute">Customer</dt>
          <dd className="text-bone">{target.customerName}</dd>
          <dt className="text-mute">Invoice</dt>
          <dd className="text-bone">{target.invoiceNumber ?? "Draft"}</dd>
          {target.projectName && (
            <>
              <dt className="text-mute">Project</dt>
              <dd className="text-bone">{target.projectName}</dd>
            </>
          )}
          <dt className="text-mute">Outstanding</dt>
          <dd className="text-bone font-semibold tabular-nums">{fmt(target.balanceDue)}</dd>
        </dl>

        <fieldset className="mt-5">
          <legend className="hud text-mute">
            Payment method <span className="text-danger">*</span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m, i) => {
              const on = method === m.value
              return (
                <button
                  key={m.value}
                  ref={i === 0 ? firstMethod : undefined}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMethod(m.value)}
                  className={`hud rounded-lg border px-3 py-3 transition-colors ${
                    on ? "border-sky-brand bg-sky-brand/15 text-bone" : "border-line-strong text-mute hover:text-bone"
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {method === "OTHER" && (
          <label className="mt-4 block space-y-2">
            <span className="hud text-mute block">How was it paid? (optional)</span>
            <input
              className={inputClass}
              placeholder="e.g. card terminal, bank draft"
              maxLength={100}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </label>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="hud text-mute block">Payment date</span>
            <input type="date" className={inputClass} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="hud text-mute block">Amount</span>
            <input
              inputMode="decimal"
              className={`${inputClass} tabular-nums`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </div>
        {cents !== null && cents > 0 && cents < balanceCents && (
          <p className="text-mute mt-2 text-xs">
            Less than the balance: this is recorded as a partial payment, leaving{" "}
            {money(centsToAmount(balanceCents - cents), target.currency)} due.
          </p>
        )}
        {cents !== null && cents > balanceCents && (
          <p className="text-pending mt-2 text-xs">More than the balance of {fmt(target.balanceDue)}.</p>
        )}

        <label className="mt-4 block space-y-2">
          <span className="hud text-mute block">Reference / note (optional)</span>
          <input
            className={inputClass}
            placeholder="Cheque #1043 · E-transfer received Oct 14"
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="text-danger mt-4 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? "Recording…" : "Confirm payment"}
          </button>
        </div>
      </div>
    </div>
  )
}
