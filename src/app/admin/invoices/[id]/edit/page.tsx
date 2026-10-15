"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ApiError,
  CONFIRM_FINANCIAL_CHANGE,
  STALE_VERSION,
  getInvoice,
  getProject,
  money,
  refreshInvoiceLines,
  updateInvoice,
  type FeeKind,
  type InvoiceUpdate,
  type InvoiceView,
  type TaxCode,
} from "@/lib/admin-api"
import { centsToAmount, centsToInput, computeTotals, toCents, toRateMilli } from "@/lib/invoice-math"
import { DocStatusBadge, PaymentBadge } from "@/components/admin/InvoiceBadges"
import { PaymentPanel } from "@/components/admin/PaymentPanel"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"
const smallButton =
  "hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors disabled:pointer-events-none disabled:opacity-40"

/** The quick-add tax lines. Only a starting rate: every rate stays editable on the invoice. */
const TAX_PRESETS: { code: TaxCode; label: string; rate: string }[] = [
  { code: "GST", label: "GST", rate: "5" },
  { code: "PST", label: "PST", rate: "7" },
  { code: "HST", label: "HST", rate: "13" },
]

type LineForm = {
  id: string
  description: string
  customerDescription: string
  quantity: string
  unitPrice: string
  calculatedUnitPrice: number | null
}
type AdjustmentForm = { key: string; kind: FeeKind; label: string; amount: string; taxable: boolean }
type TaxForm = { key: string; code: TaxCode; label: string; rate: string; overrideOn: boolean; amount: string }
type Form = {
  projectName: string
  customerName: string
  customerAddress: string
  customerPhone: string
  customerEmail: string
  lines: LineForm[]
  fees: AdjustmentForm[]
  discounts: AdjustmentForm[]
  taxes: TaxForm[]
  issuedOn: string
  dueOn: string
  notes: string
  internalNotes: string
}

let keySeq = 0
const nextKey = () => `k${++keySeq}`

const cents = (v: number | null | undefined) => toCents(v ?? 0) ?? 0

function fromInvoice(inv: InvoiceView): Form {
  const adjustment = (kind: FeeKind) =>
    inv.fees
      .filter((f) => f.kind === kind)
      .map((f) => ({ key: nextKey(), kind, label: f.label, amount: centsToInput(Math.abs(cents(f.amount))), taxable: f.taxable }))
  return {
    projectName: inv.projectName,
    customerName: inv.customerName,
    customerAddress: inv.customerAddress ?? "",
    customerPhone: inv.customerPhone ?? "",
    customerEmail: inv.customerEmail ?? "",
    lines: inv.items.map((l) => ({
      id: l.id,
      description: l.description,
      customerDescription: l.customerDescription,
      quantity: String(l.quantity),
      unitPrice: centsToInput(cents(l.unitPrice)),
      calculatedUnitPrice: l.calculatedUnitPrice ?? null,
    })),
    fees: adjustment("FEE"),
    discounts: adjustment("DISCOUNT"),
    taxes: inv.taxes.map((t) => ({
      key: nextKey(),
      code: t.code,
      label: t.label,
      rate: String(Number(t.ratePercent)),
      overrideOn: t.amountOverridden,
      amount: centsToInput(cents(t.amount)),
    })),
    issuedOn: inv.issuedOn ?? "",
    dueOn: inv.dueOn ?? "",
    notes: inv.notes ?? "",
    internalNotes: inv.internalNotes ?? "",
  }
}

/** Everything the figures depend on, so an edit that cannot move them is not called financial. */
function figures(f: Form) {
  return JSON.stringify({
    lines: f.lines.map((l) => [l.id, Number(l.quantity), toCents(l.unitPrice)]),
    adjustments: [...f.fees, ...f.discounts].map((a) => [a.kind, a.label.trim(), toCents(a.amount), a.taxable]),
    taxes: f.taxes.map((t) => [t.code, t.label.trim(), toRateMilli(t.rate), t.overrideOn ? toCents(t.amount) : null]),
  })
}

/** A one-line postal address, the way the server builds it from a project. */
function formatAddress(p: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
}) {
  let out = ""
  const add = (value: string | null | undefined, separator: string) => {
    if (value && value.trim()) {
      if (out) out += separator
      out += value.trim()
    }
  }
  add(p.addressLine1, ", ")
  add(p.addressLine2, ", ")
  add(p.city, ", ")
  add(p.province, " ")
  add(p.postalCode, " ")
  return out
}

/**
 * Editing an invoice — draft, issued, sent, paid or not. The invoice number never
 * changes; once issued, each save keeps the previous version in the invoice's history.
 *
 * The totals on the right are worked out as you type, in whole cents with the server's
 * rounding, so they show what saving will store.
 */
export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceView | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [initial, setInitial] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copying, setCopying] = useState(false)
  const leaving = useRef(false)

  const load = useCallback(async () => {
    try {
      const inv = await getInvoice(id)
      const f = fromInvoice(inv)
      setInvoice(inv)
      setForm(f)
      setInitial(JSON.stringify(f))
      setStale(false)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this invoice")
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const dirty = form !== null && JSON.stringify(form) !== initial

  // a reload or closed tab does not silently throw away an edit
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !leaving.current) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const totals = useMemo(() => {
    if (!form) return null
    return computeTotals(
      form.lines.map((l) => ({ quantity: Number.parseInt(l.quantity, 10) || 0, unitCents: toCents(l.unitPrice) ?? 0 })),
      [...form.fees, ...form.discounts].map((a) => ({ kind: a.kind, amountCents: toCents(a.amount) ?? 0, taxable: a.taxable })),
      form.taxes.map((t) => ({
        rateMilli: toRateMilli(t.rate) ?? 0,
        overrideCents: t.overrideOn ? toCents(t.amount) ?? 0 : null,
      }))
    )
  }, [form])

  if (!invoice || !form || !totals) {
    return (
      <div className="shell py-14">
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : (
          <p className="hud text-faint">Loading…</p>
        )}
      </div>
    )
  }

  const inv = invoice
  const f = form
  const fmt = (c: number) => money(centsToAmount(c), inv.currency)
  const hasPayments = inv.payments.some((p) => !p.voided)
  const paidWarning =
    inv.paymentStatus === "PAID"
      ? "This invoice has already been marked as paid. Changing prices, taxes, discounts, or totals will change its financial records. Continue?"
      : "This invoice already has a payment recorded. Changing prices, taxes, discounts, or totals will change its financial records. Continue?"

  const set = (patch: Partial<Form>) => setForm({ ...f, ...patch })
  const setLine = (i: number, patch: Partial<LineForm>) =>
    set({ lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const setAdjustment = (list: "fees" | "discounts", i: number, patch: Partial<AdjustmentForm>) =>
    set({ [list]: f[list].map((a, j) => (j === i ? { ...a, ...patch } : a)) } as Partial<Form>)
  const setTax = (i: number, patch: Partial<TaxForm>) =>
    set({ taxes: f.taxes.map((t, j) => (j === i ? { ...t, ...patch } : t)) })

  function problems(): string[] {
    const out: string[] = []
    if (!f.customerName.trim()) out.push("The customer name is required.")
    if (!f.projectName.trim()) out.push("The project name is required.")
    if (f.lines.length === 0) out.push("An invoice needs at least one line.")
    f.lines.forEach((l, i) => {
      if (!l.customerDescription.trim()) out.push(`Line ${i + 1} needs a description.`)
      if (!/^\d+$/.test(l.quantity.trim()) || Number(l.quantity) < 1) out.push(`Line ${i + 1}: quantity must be a whole number of at least 1.`)
      const c = toCents(l.unitPrice)
      if (c === null || c < 0) out.push(`Line ${i + 1}: enter the price as an amount, e.g. 425.00.`)
    })
    ;[...f.fees, ...f.discounts].forEach((a) => {
      const what = a.kind === "DISCOUNT" ? "discount" : "charge"
      if (!a.label.trim()) out.push(`Every ${what} needs a name.`)
      const c = toCents(a.amount)
      if (c === null || c < 0) out.push(`The ${what} "${a.label || "unnamed"}" needs an amount, e.g. 150.00.`)
    })
    f.taxes.forEach((t) => {
      const rate = toRateMilli(t.rate)
      if (rate === null || rate > 100000) out.push(`${t.label || "A tax"}: the rate must be between 0 and 100, at most 3 decimals.`)
      if (t.code === "CUSTOM" && !t.label.trim()) out.push("A custom tax needs a name.")
      if (t.overrideOn) {
        const c = toCents(t.amount)
        if (c === null || c < 0) out.push(`${t.label || "A tax"}: enter the tax amount, e.g. 105.00.`)
      }
    })
    if (inv.status !== "DRAFT" && !f.issuedOn) out.push("An issued invoice needs its invoice date.")
    return out
  }

  function body(confirmFinancialChange: boolean): InvoiceUpdate {
    return {
      version: inv.version,
      projectName: f.projectName.trim(),
      customerName: f.customerName.trim(),
      customerAddress: f.customerAddress.trim() || null,
      customerPhone: f.customerPhone.trim() || null,
      customerEmail: f.customerEmail.trim() || null,
      items: f.lines.map((l) => ({
        id: l.id,
        customerDescription: l.customerDescription.trim(),
        quantity: Number(l.quantity),
        unitPrice: centsToAmount(toCents(l.unitPrice) ?? 0),
      })),
      fees: [...f.fees, ...f.discounts].map((a) => ({
        kind: a.kind,
        label: a.label.trim(),
        amount: centsToAmount(toCents(a.amount) ?? 0),
        taxable: a.taxable,
      })),
      taxes: f.taxes.map((t) => ({
        code: t.code,
        label: t.label.trim() || undefined,
        ratePercent: (toRateMilli(t.rate) ?? 0) / 1000,
        amount: t.overrideOn ? centsToAmount(toCents(t.amount) ?? 0) : null,
      })),
      issuedOn: inv.status === "DRAFT" ? null : f.issuedOn || null,
      dueOn: f.dueOn || null,
      notes: f.notes.trim() || null,
      internalNotes: f.internalNotes.trim() || null,
      confirmFinancialChange,
    }
  }

  async function save() {
    const found = problems()
    if (found.length) {
      setError(found.join(" "))
      return
    }
    // one confirmation for changing the figures of an invoice that has been paid
    let confirmed = false
    if (hasPayments && figures(f) !== figures(JSON.parse(initial) as Form)) {
      if (!window.confirm(paidWarning)) return
      confirmed = true
    }
    setSaving(true)
    setError(null)
    try {
      await updateInvoice(inv.id, body(confirmed))
      leaving.current = true
      router.push(`/admin/invoices/${inv.id}`)
    } catch (err) {
      let failure: unknown = err
      // the server asks even when this screen did not know a payment had been recorded
      if (err instanceof ApiError && err.code === CONFIRM_FINANCIAL_CHANGE && !confirmed) {
        if (!window.confirm(err.message)) {
          setSaving(false)
          return
        }
        try {
          await updateInvoice(inv.id, body(true))
          leaving.current = true
          router.push(`/admin/invoices/${inv.id}`)
          return
        } catch (retry) {
          failure = retry
        }
      }
      if (failure instanceof ApiError && failure.code === STALE_VERSION) setStale(true)
      const fields = failure instanceof ApiError && failure.fields ? Object.values(failure.fields).join(" ") : ""
      setError(
        failure instanceof ApiError ? [failure.message, fields].filter(Boolean).join(" — ") : "Could not save the invoice"
      )
      setSaving(false)
    }
  }

  async function refreshFromProject() {
    if (dirty && !window.confirm("You have unsaved changes. Updating the lines from the project discards them. Continue?")) return
    if (!window.confirm("Replace the lines with the project's current windows and prices? Fees, discounts and taxes stay as they are.")) return
    let confirmed = false
    if (hasPayments) {
      if (!window.confirm(paidWarning)) return
      confirmed = true
    }
    setRefreshing(true)
    setError(null)
    try {
      const updated = await refreshInvoiceLines(inv.id, inv.version, confirmed)
      const next = fromInvoice(updated)
      setInvoice(updated)
      setForm(next)
      setInitial(JSON.stringify(next))
    } catch (err) {
      if (err instanceof ApiError && err.code === STALE_VERSION) setStale(true)
      setError(err instanceof ApiError ? err.message : "Could not update the lines")
    } finally {
      setRefreshing(false)
    }
  }

  async function copyCustomerFromProject() {
    if (!inv.projectId) return
    setCopying(true)
    try {
      const p = await getProject(inv.projectId)
      set({
        projectName: p.projectName,
        customerName: p.customerName,
        customerAddress: formatAddress(p),
        customerPhone: p.phone ?? "",
        customerEmail: p.email ?? "",
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read the project")
    } finally {
      setCopying(false)
    }
  }

  function addTax(code: TaxCode, label: string, rate: string) {
    set({ taxes: [...f.taxes, { key: nextKey(), code, label, rate, overrideOn: false, amount: "" }] })
  }

  const title = inv.invoiceNumber ? `Edit invoice ${inv.invoiceNumber}` : "Edit draft invoice"
  const cancelHref = `/admin/invoices/${inv.id}`

  return (
    <div className="shell py-10 pb-36 md:py-14 md:pb-36">
      <nav aria-label="Breadcrumb" className="hud text-faint">
        <Link href="/admin/invoices" className="hover:text-bone transition-colors">
          Invoices
        </Link>
        <span className="mx-2">/</span>
        <Link href={cancelHref} className="hover:text-bone transition-colors">
          {inv.invoiceNumber ?? "Draft"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mute">Edit</span>
      </nav>

      <header className="mt-4">
        <h1 className="display text-bone text-[clamp(28px,4vw,48px)]">{title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DocStatusBadge status={inv.status} />
          <PaymentBadge status={inv.paymentStatus} docStatus={inv.status} />
          {inv.status !== "DRAFT" && (
            <span className="text-faint ml-1 text-sm">
              The number stays {inv.invoiceNumber}. Saving keeps the previous version in the history.
            </span>
          )}
        </div>
      </header>

      {inv.status === "VOID" && (
        <p className="border-danger/40 text-danger mt-6 rounded-xl border px-4 py-3 text-sm">
          This invoice is void. Restore it from the invoice page before editing.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {/* -------------------------------------------------------- customer */}
          <Section title="Customer" id="customer">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer name">
                <input className={inputClass} value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} />
              </Field>
              <Field label="Project">
                <input className={inputClass} value={f.projectName} onChange={(e) => set({ projectName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={f.customerEmail}
                  onChange={(e) => set({ customerEmail: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address">
                  <input
                    className={inputClass}
                    value={f.customerAddress}
                    onChange={(e) => set({ customerAddress: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            {inv.projectExists && (
              <button type="button" disabled={copying} onClick={copyCustomerFromProject} className={`${smallButton} mt-4`}>
                {copying ? "Reading…" : "Copy details from the project"}
              </button>
            )}
          </Section>

          {/* ------------------------------------------------- products / shades */}
          <Section
            title="Products / Shades"
            id="lines"
            aside={
              inv.projectExists ? (
                <button type="button" disabled={refreshing} onClick={refreshFromProject} className={smallButton}>
                  {refreshing ? "Updating…" : "Update lines from project"}
                </button>
              ) : undefined
            }
          >
            <p className="text-faint text-xs leading-[1.6]">
              The description is what the customer sees. Measurements and brands stay internal and never print.
              A price changed here applies to this invoice only — never to the product&rsquo;s default price.
            </p>
            <ul className="mt-4 space-y-3">
              {f.lines.map((l, i) => {
                const unit = toCents(l.unitPrice)
                const calc = l.calculatedUnitPrice == null ? null : cents(l.calculatedUnitPrice)
                const overridden = calc !== null && unit !== null && unit !== calc
                const qty = Number.parseInt(l.quantity, 10) || 0
                return (
                  <li key={l.id} className="border-line bg-ink/60 rounded-xl border p-4">
                    <p className="text-faint text-xs">
                      <span className="hud mr-2">Internal</span>
                      {l.description}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_5.5rem_9rem]">
                      <Field label={`Line ${i + 1} description`}>
                        <input
                          className={inputClass}
                          value={l.customerDescription}
                          onChange={(e) => setLine(i, { customerDescription: e.target.value })}
                        />
                      </Field>
                      <Field label="Qty">
                        <input
                          inputMode="numeric"
                          className={`${inputClass} tabular-nums`}
                          value={l.quantity}
                          onChange={(e) => setLine(i, { quantity: e.target.value })}
                        />
                      </Field>
                      <Field label="Unit price">
                        <input
                          inputMode="decimal"
                          className={`${inputClass} tabular-nums`}
                          value={l.unitPrice}
                          onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-faint text-xs tabular-nums">
                        {calc !== null && (
                          <>
                            Calculated price {fmt(calc)}
                            {overridden && (
                              <>
                                {" · "}
                                <span className="text-sky-brand">manual price</span>{" "}
                                <button
                                  type="button"
                                  className="hud text-sky-brand underline-offset-2 hover:underline"
                                  onClick={() => setLine(i, { unitPrice: centsToInput(calc) })}
                                >
                                  Use calculated
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-bone text-sm font-semibold tabular-nums">
                          {fmt((unit ?? 0) * qty)}
                        </span>
                        <button
                          type="button"
                          disabled={f.lines.length === 1}
                          onClick={() => set({ lines: f.lines.filter((_, j) => j !== i) })}
                          className={smallButton}
                          aria-label={`Remove line ${i + 1}`}
                          title={f.lines.length === 1 ? "An invoice needs at least one line" : undefined}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Section>

          {/* ----------------------------------------------------------- pricing */}
          <Section title="Pricing" id="pricing">
            <div className="flex items-baseline justify-between">
              <span className="text-mute text-sm">Line items</span>
              <span className="text-bone text-sm font-semibold tabular-nums">{fmt(totals.subtotal)}</span>
            </div>
            <p className="hud text-faint mt-5">Additional charges</p>
            <AdjustmentList
              items={f.fees}
              onChange={(i, patch) => setAdjustment("fees", i, patch)}
              onRemove={(i) => set({ fees: f.fees.filter((_, j) => j !== i) })}
              placeholder="Installation"
              taxableLabels={["Taxable", "Not taxed"]}
            />
            <button
              type="button"
              onClick={() => set({ fees: [...f.fees, { key: nextKey(), kind: "FEE", label: "", amount: "", taxable: true }] })}
              className={`${smallButton} mt-3`}
            >
              + Add charge
            </button>
          </Section>

          {/* --------------------------------------------------------- discounts */}
          <Section title="Discounts" id="discounts">
            <AdjustmentList
              items={f.discounts}
              onChange={(i, patch) => setAdjustment("discounts", i, patch)}
              onRemove={(i) => set({ discounts: f.discounts.filter((_, j) => j !== i) })}
              placeholder="Loyalty discount"
              taxableLabels={["Before tax", "After tax"]}
            />
            {f.discounts.length === 0 && <p className="text-faint text-sm">No discount.</p>}
            <button
              type="button"
              onClick={() =>
                set({ discounts: [...f.discounts, { key: nextKey(), kind: "DISCOUNT", label: "", amount: "", taxable: true }] })
              }
              className={`${smallButton} mt-3`}
            >
              + Add discount
            </button>
            <p className="text-faint mt-3 text-xs">
              Enter the amount taken off. &ldquo;Before tax&rdquo; lowers the amount the taxes are charged on.
            </p>
          </Section>

          {/* ------------------------------------------------------------- taxes */}
          <Section title="Taxes" id="taxes">
            <p className="text-faint text-xs leading-[1.6]">
              These rates belong to this invoice. Changing a default later never changes it.
            </p>
            {f.taxes.length === 0 ? (
              <p className="text-mute mt-4 text-sm">No tax on this invoice.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {f.taxes.map((t, i) => (
                  <li key={t.key} className="border-line bg-ink/60 rounded-xl border p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                      <Field label={t.code === "CUSTOM" ? "Tax name" : "Tax"}>
                        <input
                          className={inputClass}
                          value={t.label}
                          placeholder={t.code === "CUSTOM" ? "e.g. Municipal levy" : t.code}
                          onChange={(e) => setTax(i, { label: e.target.value })}
                        />
                      </Field>
                      <Field label="Rate %">
                        <input
                          inputMode="decimal"
                          className={`${inputClass} tabular-nums`}
                          value={t.rate}
                          onChange={(e) => setTax(i, { rate: e.target.value })}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => set({ taxes: f.taxes.filter((_, j) => j !== i) })}
                        className={`${smallButton} h-11`}
                        aria-label={`Remove ${t.label || "tax"}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="text-mute flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={t.overrideOn}
                          onChange={(e) =>
                            setTax(i, {
                              overrideOn: e.target.checked,
                              amount: e.target.checked ? centsToInput(totals.taxes[i]?.calculated ?? 0) : t.amount,
                            })
                          }
                        />
                        Enter the tax amount by hand
                      </label>
                      {t.overrideOn ? (
                        <span className="flex items-center gap-2">
                          <input
                            inputMode="decimal"
                            aria-label={`${t.label || "Tax"} amount`}
                            className={`${inputClass} w-32 tabular-nums`}
                            value={t.amount}
                            onChange={(e) => setTax(i, { amount: e.target.value })}
                          />
                          <span className="text-faint text-xs tabular-nums">
                            calculated {fmt(totals.taxes[i]?.calculated ?? 0)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-bone text-sm font-semibold tabular-nums">{fmt(totals.taxes[i]?.amount ?? 0)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {TAX_PRESETS.filter((p) => !f.taxes.some((t) => t.code === p.code)).map((p) => (
                <button key={p.code} type="button" onClick={() => addTax(p.code, p.label, p.rate)} className={smallButton}>
                  + {p.label} {p.rate}%
                </button>
              ))}
              <button type="button" onClick={() => addTax("CUSTOM", "", "")} className={smallButton}>
                + Custom tax
              </button>
              {f.taxes.length > 0 && (
                <button type="button" onClick={() => set({ taxes: [] })} className={smallButton}>
                  No tax
                </button>
              )}
            </div>
          </Section>

          {/* ---------------------------------------------------- invoice status */}
          <Section title="Invoice status" id="status">
            <div className="flex flex-wrap items-center gap-2">
              <DocStatusBadge status={inv.status} />
              <span className="text-faint text-sm">
                {inv.status === "DRAFT"
                  ? "Issue it from the invoice page to give it its number."
                  : "Email, void or restore from the invoice page."}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {inv.status !== "DRAFT" && (
                <Field label="Invoice date">
                  <input type="date" className={inputClass} value={f.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />
                </Field>
              )}
              <Field label="Due date">
                <input type="date" className={inputClass} value={f.dueOn} onChange={(e) => set({ dueOn: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Note printed on the invoice">
                <textarea
                  rows={2}
                  className={`${inputClass} h-auto py-2.5`}
                  value={f.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          {/* --------------------------------------------------- payment status */}
          <div id="payment">
            <PaymentPanel invoice={inv} onChange={setInvoice} />
            <p className="text-faint mt-2 text-xs">
              Payments save as soon as you record them, separately from the Save button below.
            </p>
          </div>

          {/* ---------------------------------------------------- internal notes */}
          <Section title="Internal notes" id="internal" aside={<span className="hud text-faint">Never printed</span>}>
            <textarea
              rows={3}
              aria-label="Internal notes"
              className={`${inputClass} h-auto py-2.5`}
              placeholder="For the business only — never on the customer invoice"
              value={f.internalNotes}
              onChange={(e) => set({ internalNotes: e.target.value })}
            />
          </Section>
        </div>

        {/* ---------------------------------------------------------- totals */}
        <aside className="border-line bg-ink-raised/50 rounded-2xl border p-6 lg:sticky lg:top-6" aria-labelledby="totals-title">
          <h2 id="totals-title" className="hud text-sky-brand">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 text-sm tabular-nums">
            <TotalRow label="Subtotal" value={fmt(totals.subtotal)} />
            {f.fees.map((a) => (
              <TotalRow key={a.key} label={a.label || "Charge"} value={fmt(Math.abs(toCents(a.amount) ?? 0))} />
            ))}
            {f.discounts.map((a) => (
              <TotalRow key={a.key} label={a.label || "Discount"} value={fmt(-Math.abs(toCents(a.amount) ?? 0))} />
            ))}
            {f.taxes.length === 0 ? (
              <TotalRow label="Tax" value={fmt(0)} />
            ) : (
              f.taxes.map((t, i) => (
                <TotalRow
                  key={t.key}
                  label={`${t.label || "Tax"} ${toRateMilli(t.rate) !== null ? `${(toRateMilli(t.rate) ?? 0) / 1000}%` : ""}`}
                  value={fmt(totals.taxes[i]?.amount ?? 0)}
                />
              ))
            )}
            <div className="border-line flex items-baseline justify-between border-t pt-3">
              <dt className="text-bone font-semibold">Total</dt>
              <dd className="text-bone text-xl font-semibold">{fmt(totals.grandTotal)}</dd>
            </div>
            {hasPayments && (
              <>
                <TotalRow label="Paid" value={fmt(-cents(inv.paidTotal))} />
                <TotalRow label="Balance due" value={fmt(Math.max(0, totals.grandTotal - cents(inv.paidTotal)))} />
              </>
            )}
          </dl>
          {totals.taxable !== totals.subtotal && (
            <p className="text-faint mt-3 text-xs tabular-nums">Taxes charged on {fmt(totals.taxable)}.</p>
          )}
        </aside>
      </div>

      {/* --------------------------------------------------------- save bar */}
      <div className="border-line bg-ink/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {error ? (
              <p role="alert" className="text-danger text-sm">
                {error}
                {stale && (
                  <button type="button" onClick={load} className="hud text-sky-brand ml-3 underline-offset-2 hover:underline">
                    Reload
                  </button>
                )}
              </p>
            ) : (
              <p className="text-mute text-sm tabular-nums">
                Total <span className="text-bone font-semibold">{fmt(totals.grandTotal)}</span>
                {dirty ? <span className="text-pending ml-3">Unsaved changes</span> : <span className="text-faint ml-3">No changes</span>}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href={cancelHref}
              onClick={(e) => {
                if (dirty && !window.confirm("Discard your changes?")) e.preventDefault()
                else leaving.current = true
              }}
              className="btn btn-ghost"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty || inv.status === "VOID"}
              className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  id,
  aside,
  children,
}: {
  title: string
  id: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="hud text-sky-brand">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="hud text-faint block">{label}</span>
      {children}
    </label>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-mute truncate">{label}</dt>
      <dd className="text-bone">{value}</dd>
    </div>
  )
}

function AdjustmentList({
  items,
  onChange,
  onRemove,
  placeholder,
  taxableLabels,
}: {
  items: AdjustmentForm[]
  onChange: (i: number, patch: Partial<AdjustmentForm>) => void
  onRemove: (i: number) => void
  placeholder: string
  taxableLabels: [string, string]
}) {
  if (items.length === 0) return null
  return (
    <ul className="mt-3 space-y-2">
      {items.map((a, i) => (
        <li key={a.key} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] sm:items-center">
          <input
            aria-label={`${a.kind === "DISCOUNT" ? "Discount" : "Charge"} ${i + 1} name`}
            className={inputClass}
            placeholder={placeholder}
            value={a.label}
            onChange={(e) => onChange(i, { label: e.target.value })}
          />
          <input
            aria-label={`${a.kind === "DISCOUNT" ? "Discount" : "Charge"} ${i + 1} amount`}
            inputMode="decimal"
            className={`${inputClass} tabular-nums`}
            placeholder="0.00"
            value={a.amount}
            onChange={(e) => onChange(i, { amount: e.target.value })}
          />
          <button
            type="button"
            aria-pressed={a.taxable}
            onClick={() => onChange(i, { taxable: !a.taxable })}
            className={`hud rounded-lg border px-3 py-2.5 transition-colors ${
              a.taxable ? "border-sky-brand bg-sky-brand/15 text-bone" : "border-line-strong text-mute"
            }`}
          >
            {a.taxable ? taxableLabels[0] : taxableLabels[1]}
          </button>
          <button type="button" onClick={() => onRemove(i)} className={smallButton} aria-label={`Remove ${a.label || "line"}`}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}
