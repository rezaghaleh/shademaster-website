"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ApiError,
  createInvoice,
  downloadInvoicePdf,
  emailInvoice,
  issueInvoice,
  listProjectInvoices,
  money,
  type FeeInput,
  type InvoiceSummary,
} from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

const STATUS_STYLE: Record<InvoiceSummary["status"], string> = {
  DRAFT: "border-line-strong text-faint",
  ISSUED: "border-sky-brand/50 text-sky-brand",
  SENT: "border-sky-brand/50 text-sky-brand",
  PAID: "border-emerald-400/50 text-emerald-400",
  VOID: "border-red-400/40 text-red-400",
}

/** Invoice list and generation for one project. */
export function InvoicePanel({
  projectId,
  canInvoice,
  onChanged,
}: {
  projectId: string
  canInvoice: boolean
  onChanged: () => void
}) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [taxRate, setTaxRate] = useState("")
  const [taxLabel, setTaxLabel] = useState("")
  const [notes, setNotes] = useState("")
  const [fees, setFees] = useState<FeeInput[]>([])

  const load = useCallback(async () => {
    try {
      setInvoices(await listProjectInvoices(projectId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load invoices")
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    setError(null)
    try {
      await fn()
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6"
      aria-labelledby="invoices-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="invoices-title" className="hud text-sky-brand">
          Invoices
        </h2>
        <button
          type="button"
          disabled={!canInvoice}
          onClick={() => setCreating((c) => !c)}
          className="btn btn-ghost !py-2 !text-[0.85rem] disabled:pointer-events-none disabled:opacity-40"
          title={canInvoice ? undefined : "Add at least one window first"}
        >
          {creating ? "Cancel" : "New invoice"}
        </button>
      </div>

      {creating && (
        <div className="border-line mt-6 rounded-xl border p-5">
          <p className="hud text-faint">Invoice details</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="hud text-faint block">Tax rate %</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                max="100"
                step="0.001"
                placeholder="e.g. 12"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="hud text-faint block">Tax label</span>
              <input
                className={inputClass}
                placeholder="GST + PST"
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
              />
            </label>
          </div>

          <p className="text-faint mt-3 text-xs leading-[1.6]">
            Leave the rate blank to use the configured default. Whatever is used
            is frozen onto the invoice, so changing the default later never alters
            an invoice already created.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="hud text-faint">Additional fees</span>
              <button
                type="button"
                className="hud text-sky-brand"
                onClick={() => setFees([...fees, { label: "", amount: 0, taxable: true }])}
              >
                + Add fee
              </button>
            </div>

            {fees.length > 0 && (
              <ul className="mt-3 space-y-2">
                {fees.map((fee, i) => (
                  <li key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_auto_auto] md:items-center">
                    <input
                      className={inputClass}
                      placeholder="Installation"
                      value={fee.label}
                      onChange={(e) =>
                        setFees(fees.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))
                      }
                    />
                    <input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fee.amount || ""}
                      onChange={(e) =>
                        setFees(
                          fees.map((f, j) => (j === i ? { ...f, amount: Number(e.target.value) } : f))
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-pressed={fee.taxable !== false}
                      onClick={() =>
                        setFees(fees.map((f, j) => (j === i ? { ...f, taxable: !(f.taxable !== false) } : f)))
                      }
                      className={`hud rounded-lg border px-3 py-2.5 transition-colors ${
                        fee.taxable !== false
                          ? "border-sky-brand bg-sky-brand/15 text-bone"
                          : "border-line-strong text-mute"
                      }`}
                    >
                      {fee.taxable !== false ? "Taxable" : "Not taxed"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove fee ${i + 1}`}
                      onClick={() => setFees(fees.filter((_, j) => j !== i))}
                      className="border-line-strong text-faint hover:text-red-400 grid h-9 w-9 place-items-center rounded-full border"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-faint mt-2 text-xs">
              A negative amount acts as a discount line.
            </p>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="hud text-faint block">Notes on the invoice</span>
            <textarea
              rows={2}
              className={`${inputClass} h-auto py-2.5`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <button
            type="button"
            disabled={busy !== null}
            className="btn btn-primary mt-5 disabled:pointer-events-none disabled:opacity-50"
            onClick={() =>
              run("create", async () => {
                await createInvoice(projectId, {
                  taxRatePercent: taxRate === "" ? undefined : Number(taxRate),
                  taxLabel: taxLabel.trim() || undefined,
                  notes: notes.trim() || undefined,
                  fees: fees.filter((f) => f.label.trim() !== ""),
                })
                setCreating(false)
                setFees([])
                setNotes("")
              })
            }
          >
            {busy === "create" ? "Creating…" : "Create draft invoice"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-5 text-sm text-red-400">
          {error}
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="text-faint mt-6 text-sm">No invoices for this project yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="border-line bg-ink/60 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div>
                <p className="text-bone font-medium">
                  {inv.invoiceNumber ?? "Draft"}
                  <span
                    className={`hud ml-3 rounded-full border px-2 py-1 ${STATUS_STYLE[inv.status]}`}
                  >
                    {inv.status}
                  </span>
                </p>
                <p className="text-faint mt-1 text-xs">
                  {inv.issuedOn ? `Issued ${inv.issuedOn}` : "Not issued"}
                  {inv.dueOn && ` · due ${inv.dueOn}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-bone font-semibold tabular-nums">
                  {money(inv.grandTotal, inv.currency)}
                </span>

                {inv.status === "DRAFT" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(`issue-${inv.id}`, () => issueInvoice(inv.id))}
                    className="hud border-sky-brand/50 text-sky-brand hover:bg-sky-brand/10 rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                  >
                    {busy === `issue-${inv.id}` ? "Issuing…" : "Issue"}
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`pdf-${inv.id}`, () =>
                      downloadInvoicePdf(inv.id, `${inv.invoiceNumber ?? "draft"}.pdf`)
                    )
                  }
                  className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                >
                  PDF
                </button>

                {inv.status !== "DRAFT" && inv.status !== "VOID" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!window.confirm("Email this invoice to the customer?")) return
                      run(`email-${inv.id}`, () => emailInvoice(inv.id))
                    }}
                    className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                  >
                    {busy === `email-${inv.id}` ? "Sending…" : "Email"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
