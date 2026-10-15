"use client"

import { useEffect, useMemo, useState } from "react"
import { ApiError, CUSTOMER_EXISTS, getPricingRates, money, type LineItemInput, type ProjectInput } from "@/lib/admin-api"
import { centsToInput, toCents } from "@/lib/invoice-math"
import { DEFAULT_MARKUP_PERCENT, DEFAULT_RATES, projectPricing } from "@/lib/project-math"
import { ProjectFinancialSummary } from "@/components/admin/ProjectFinancialSummary"
import { InchInput } from "@/components/InchInput"
import { CustomerPicker } from "@/components/admin/CustomerPicker"

/**
 * Create/edit form for a project.
 *
 * Every window is priced live by the same chain the backend uses (see project-math):
 * the measurements give the cost, a supplier cost can replace it, the markup goes on top,
 * and a price typed by hand wins over all of it. Every figure on the form comes from one
 * snapshot, so changing any input — the project markup included — moves every price,
 * line total, the subtotal and the profit together. The backend recomputes it all on save.
 */

/** A markup as typed: 50, 50.125 — never 50.000. */
function formatPercent(value: number | string | null | undefined): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(Number(n.toFixed(3))) : "0"
}

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

export type ProjectFormValues = ProjectInput

const EMPTY: ProjectFormValues = {
  projectName: "",
  defaultMarkupPercent: DEFAULT_MARKUP_PERCENT,
  customerId: null,
  customerName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  phone: "",
  email: "",
  notes: "",
  items: [],
}

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ProjectFormValues
  submitLabel: string
  onSubmit: (values: ProjectFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<ProjectFormValues>({ ...EMPTY, ...initial })
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [rates, setRates] = useState(DEFAULT_RATES)

  useEffect(() => {
    let active = true
    getPricingRates().then((r) => { if (active) setRates(r) })
      .catch(() => { if (active) setError("Could not load current pricing rates. Reload to try again.") })
    return () => { active = false }
  }, [])

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const markup = values.defaultMarkupPercent ?? DEFAULT_MARKUP_PERCENT
  // Markup is an explicit dependency even when the line-item inputs have not changed.
  // Render prices and totals from the same snapshot; never save automatic prices as overrides.
  const pricing = useMemo(() => projectPricing(values.items, markup, rates), [values.items, markup, rates])
  const financials = pricing.financials
  const subtotal = pricing.subtotalCents / 100

  const overriddenCount = pricing.lines.filter((line) => line.overridden).length

  function addItem() {
    const next: LineItemInput = {
      width: 0,
      height: 0,
      quantity: 1,
      productType: "ROLLER",
      motorized: false,
      label: "",
      blindBrand: "",
      motorBrand: "",
      unitPriceOverride: null,
    }
    setValues((v) => ({ ...v, items: [...v.items, next] }))
  }

  function updateItem(index: number, patch: Partial<LineItemInput>) {
    setValues((v) => ({ ...v, items: v.items.map((item, i) => i === index ? { ...item, ...patch } : item) }))
  }

  function removeItem(index: number) {
    setValues((v) => ({ ...v, items: v.items.filter((_, i) => i !== index) }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    const send = (createNewCustomer: boolean) => onSubmit({
        ...values,
        // an existing customer is referred to by id; its details are not resent
        customerId: values.customerId || null,
        customerName: values.customerId ? null : values.customerName?.trim() || null,
        phone: values.customerId ? null : values.phone?.trim() || null,
        email: values.customerId ? null : values.email?.trim() || null,
        createNewCustomer,
        items: values.items.map((i) => ({
          ...i,
          label: i.label?.trim() ? i.label.trim() : null,
          blindBrand: i.blindBrand?.trim() ? i.blindBrand.trim() : null,
          // A manual motor brand on a manual shade would be meaningless.
          motorBrand:
            i.motorized && i.motorBrand?.trim() ? i.motorBrand.trim() : null,
          // NaN (a half-typed number) must not be sent as an override.
          unitPriceOverride:
            i.unitPriceOverride == null || Number.isNaN(i.unitPriceOverride)
              ? null
              : i.unitPriceOverride,
        })),
      })
    try {
      try {
        await send(false)
      } catch (err) {
        // A customer with this name exists: offer them, or confirm it is someone else.
        if (err instanceof ApiError && err.code === CUSTOMER_EXISTS) {
          if (!window.confirm(`${err.message}\n\nOK creates a new customer with the same name. Cancel goes back so you can choose the existing one.`)) {
            setBusy(false)
            return
          }
          await send(true)
        } else {
          throw err
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fields ?? {})
      } else {
        setError("Could not save. Is the admin API running?")
      }
      setBusy(false)
    }
  }

  const fieldError = (name: string) => fieldErrors[name]

  return (
    <form onSubmit={submit} className="space-y-6">
      <section
        className="border-line bg-ink-raised/50 rounded-2xl border p-6"
        aria-labelledby="customer-title"
      >
        <h2 id="customer-title" className="hud text-sky-brand">
          01 — Customer
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            id="projectName"
            label="Project name"
            required
            value={values.projectName}
            onChange={(v) => set("projectName", v)}
            error={fieldError("projectName")}
          />
          <div className="md:col-span-2">
            <CustomerPicker
              value={{
                customerId: values.customerId ?? null,
                name: values.customerName ?? "",
                phone: values.phone ?? "",
                email: values.email ?? "",
              }}
              onChange={(c) =>
                setValues((v) => ({ ...v, customerId: c.customerId, customerName: c.name, phone: c.phone, email: c.email }))
              }
              error={fieldError("customerName") ?? fieldError("email")}
            />
          </div>
          <p className="hud text-faint md:col-span-2">Site address</p>
          <Field
            id="addressLine1"
            label="Address"
            value={values.addressLine1 ?? ""}
            onChange={(v) => set("addressLine1", v)}
          />
          <Field
            id="addressLine2"
            label="Address line 2"
            value={values.addressLine2 ?? ""}
            onChange={(v) => set("addressLine2", v)}
          />
          <Field
            id="city"
            label="City"
            value={values.city ?? ""}
            onChange={(v) => set("city", v)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="province"
              label="Province"
              value={values.province ?? ""}
              onChange={(v) => set("province", v)}
            />
            <Field
              id="postalCode"
              label="Postal code"
              value={values.postalCode ?? ""}
              onChange={(v) => set("postalCode", v)}
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="hud text-faint block" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className={`${inputClass} h-auto py-2.5`}
            value={values.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </section>

      <section
        className="border-line bg-ink-raised/50 rounded-2xl border p-6"
        aria-labelledby="windows-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="windows-title" className="hud text-sky-brand">
            02 — Windows
          </h2>
          <button type="button" onClick={addItem} className="btn btn-ghost !py-2 !text-[0.85rem]">
            Add a window
          </button>
        </div>

        <div className="mt-5 max-w-sm space-y-2">
          <label className="hud text-faint block" htmlFor="defaultMarkupPercent">Project markup %</label>
          <input id="defaultMarkupPercent" type="number" min="0" max="99999.999" step="0.001" required
            className={inputClass} value={Number.isFinite(markup) ? markup : ""}
            onChange={(e) => set("defaultMarkupPercent", e.target.value === "" ? NaN : Number(e.target.value))} />
          <p className="text-xs text-faint">
            Added to every window&rsquo;s cost, unless the window has its own markup. Internal — never on the invoice.
          </p>
          {fieldError("defaultMarkupPercent") && <p role="alert" className="text-xs text-danger">{fieldError("defaultMarkupPercent")}</p>}
        </div>

        {values.items.length === 0 ? (
          <p className="text-faint mt-6 text-sm">
            No windows yet. Add at least one before invoicing.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {values.items.map((item, index) => {
              const line = pricing.lines[index]
              const overridden = line.overridden
              const supplied = line.supplierCost !== null

              return (
                <li
                  key={index}
                  className="border-line bg-ink/60 rounded-xl border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="hud text-faint pt-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Remove window ${index + 1}`}
                      className="border-line-strong text-faint hover:border-danger/50 hover:text-danger grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {/* Measurements and basics.
                      Every track has a minmax() floor rather than a bare fr, so a
                      column can never be squeezed below the width its controls
                      actually need — a bare 1fr takes its minimum from content and
                      lets its neighbours crush it. Quantity is a fixed track: it
                      holds three digits at most, so there is nothing to gain by
                      letting it grow, and pinning it keeps it flush right.
                      gap-x-6 between columns against gap-3 inside a measurement is
                      what makes each width/height read as one control, not two. */}
                  <div className="mt-3 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-[minmax(8rem,1fr)_minmax(13.5rem,1.25fr)_minmax(13.5rem,1.25fr)_6.5rem]">
                    <MiniField
                      label="Label"
                      value={item.label ?? ""}
                      onChange={(v) => updateItem(index, { label: v })}
                      placeholder="Living room"
                    />
                    <InchInput
                      compact
                      idPrefix={`item-${index}-width`}
                      label="Width"
                      value={item.width === 0 ? "" : item.width}
                      onChange={(v) => updateItem(index, { width: v === "" ? 0 : v })}
                    />
                    <InchInput
                      compact
                      idPrefix={`item-${index}-height`}
                      label="Height"
                      value={item.height === 0 ? "" : item.height}
                      onChange={(v) => updateItem(index, { height: v === "" ? 0 : v })}
                    />
                    <MiniField
                      label="Qty"
                      type="number"
                      value={String(item.quantity || "")}
                      onChange={(v) => updateItem(index, { quantity: Number(v) })}
                    />
                  </div>

                  {/* type, control, and the internal-only brands */}
                  <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-[minmax(8rem,1fr)_minmax(9rem,0.8fr)_minmax(12rem,1.1fr)_minmax(12rem,1.1fr)]">
                    <div className="space-y-2">
                      <span className="hud text-faint block">Type</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(["ROLLER", "ZEBRA"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={item.productType === t}
                            onClick={() => updateItem(index, { productType: t })}
                            className={`hud h-11 rounded-lg border px-2 capitalize transition-colors ${
                              item.productType === t
                                ? "border-sky-brand bg-sky-brand/15 text-bone"
                                : "border-line-strong text-mute hover:text-bone"
                            }`}
                          >
                            {t.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="hud text-faint block">Control</span>
                      <button
                        type="button"
                        aria-pressed={item.motorized}
                        onClick={() => updateItem(index, { motorized: !item.motorized })}
                        className={`hud h-11 w-full rounded-lg border px-2 transition-colors ${
                          item.motorized
                            ? "border-sky-brand bg-sky-brand/15 text-bone"
                            : "border-line-strong text-mute hover:text-bone"
                        }`}
                      >
                        {item.motorized ? "Motorized" : "Manual"}
                      </button>
                    </div>

                    <MiniField
                      label="Blind brand"
                      value={item.blindBrand ?? ""}
                      onChange={(v) => updateItem(index, { blindBrand: v })}
                      placeholder="internal only"
                    />
                    <MiniField
                      label="Motor brand"
                      value={item.motorBrand ?? ""}
                      onChange={(v) => updateItem(index, { motorBrand: v })}
                      placeholder="internal only"
                      disabled={!item.motorized}
                    />
                  </div>

                  {/* What the window costs you: the measurements give it, a supplier
                      cost can replace it, and the markup goes on top. Internal only. */}
                  <div className="border-line mt-6 grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <span className="hud text-faint block">Calculated cost / shade</span>
                      <p
                        className={`flex h-11 items-center text-sm tabular-nums ${
                          supplied ? "text-faint line-through" : "text-bone"
                        }`}
                      >
                        {money(line.measurementCost / 100)}
                      </p>
                      <p className="text-xs text-faint">
                        {supplied ? "Replaced by the supplier cost" : "From the measurements"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="hud text-faint block" htmlFor={`item-${index}-cost`}>
                        Supplier cost / shade · internal
                      </label>
                      <input id={`item-${index}-cost`} className={inputClass} type="number" min="0" max="9999999999.99" step="0.01"
                        placeholder={`Blank uses ${money(line.measurementCost / 100)}`} value={item.costPerUnit ?? ""}
                        onChange={(e) => updateItem(index, { costPerUnit: e.target.value === "" ? null : Number(e.target.value) })} />
                      <p className="text-xs text-faint">Optional. The whole shade, motor included.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="hud text-faint block" htmlFor={`item-${index}-markup`}>Markup %</label>
                      <div className="flex items-center gap-2">
                        <input id={`item-${index}-markup`} className={`${inputClass} min-w-0`} type="number" min="0" max="99999.999" step="0.001"
                          placeholder={`Project ${formatPercent(markup)}%`} value={item.markupOverridePercent ?? ""}
                          onChange={(e) => updateItem(index, { markupOverridePercent: e.target.value === "" ? null : Number(e.target.value) })} />
                        {!line.inheritsMarkup && (
                          <button type="button" onClick={() => updateItem(index, { markupOverridePercent: null })}
                            className="hud border-line-strong text-faint hover:text-bone h-11 shrink-0 rounded-lg border px-3 transition-colors">
                            Use project markup
                          </button>
                        )}
                      </div>
                      <p className={`text-xs ${line.inheritsMarkup ? "text-faint" : "text-sky-brand"}`}>
                        {line.inheritsMarkup
                          ? "Follows the project markup"
                          : `Custom ${formatPercent(line.markup)}% for this window`}
                      </p>
                    </div>
                  </div>

                  {/* What the customer pays. An automatic price is never saved as a manual one. */}
                  <div className="border-line mt-6 grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-[minmax(15rem,1fr)_minmax(8rem,auto)] sm:items-start">
                    <div className="space-y-2">
                      <label className="hud text-sky-brand block" htmlFor={`item-${index}-price`}>
                        Price / shade
                      </label>
                      <div className="flex max-w-sm items-center gap-2">
                        <PriceInput
                          id={`item-${index}-price`}
                          automaticCents={line.automatic}
                          manual={item.unitPriceOverride}
                          onChange={(value) => updateItem(index, { unitPriceOverride: value })}
                        />
                        {overridden && (
                          <button
                            type="button"
                            title="Back to cost plus markup"
                            onClick={() => updateItem(index, { unitPriceOverride: null })}
                            className="hud border-line-strong text-faint hover:text-bone h-11 shrink-0 rounded-lg border px-2.5 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className={`text-xs tabular-nums ${overridden ? "text-sky-brand" : "text-faint"}`}>
                        {overridden
                          ? `Manual override · cost plus markup would be ${money(line.automatic / 100)}`
                          : `Automatic · ${money(line.baseCost / 100)} cost + ${formatPercent(line.markup)}% markup`}
                      </p>
                    </div>

                    <div className="space-y-2 sm:text-right">
                      <span className="hud text-faint block">Line total</span>
                      <output aria-label={`Window ${index + 1} total`} className="text-bone flex h-11 items-center text-sm font-semibold tabular-nums sm:justify-end">
                        {money(line.revenue / 100)}
                      </output>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-faint tabular-nums">
                    Internal · Total cost {money(line.totalCost / 100)} · Line profit{" "}
                    <span className={line.profit < 0 ? "text-danger" : "text-sky-brand"}>{money(line.profit / 100)}</span>
                    {" "}· Margin {line.margin.toFixed(2)}%
                  </p>
                  {["width", "height", "quantity", "costPerUnit", "markupOverridePercent", "unitPriceOverride"].map((field) =>
                    fieldError(`items[${index}].${field}`) ? <p key={field} role="alert" className="mt-2 text-xs text-danger">Window {index + 1}: {fieldError(`items[${index}].${field}`)}</p> : null
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-line mt-6 flex items-center justify-between border-t pt-5">
          <div>
            <span className="hud text-faint">Quote subtotal</span>
            {overriddenCount > 0 && (
              <p className="hud text-sky-brand mt-1.5 text-[0.6rem]">
                {overriddenCount} line{overriddenCount === 1 ? "" : "s"} manually priced
              </p>
            )}
          </div>
          <output aria-label="Project subtotal" className="display text-bone text-[clamp(22px,2.6vw,32px)] tabular-nums">
            {money(subtotal)}
          </output>
        </div>

        <p className="text-faint mt-4 text-xs leading-[1.6]">
          Costs, markups and profit, the blind and motor brands, and the measurements are
          kept for your records and are <strong>not</strong> printed on the customer invoice,
          which shows only each window&rsquo;s price. A manual price applies to this quote
          only — it never changes the underlying rates.
        </p>
      </section>

      <ProjectFinancialSummary financials={financials} markup={markup} />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <label className="hud text-faint block" htmlFor={id}>
        {label}
        {required && <span className="text-sky-brand"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        className={inputClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The price per shade. Shows the automatic price until one is typed: typing makes it a
 * manual price, and an emptied box returns the window to the automatic price.
 *
 * While the box has focus it keeps exactly what is being typed — "4", "40.", or nothing —
 * so a half-typed price never snaps back to the automatic one between keystrokes.
 */
function PriceInput({
  id,
  automaticCents,
  manual,
  onChange,
}: {
  id: string
  automaticCents: number
  manual: number | null | undefined
  onChange: (value: number | null) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const manualCents = toCents(manual)
  const shown = draft ?? centsToInput(manualCents ?? automaticCents)

  return (
    <input
      id={id}
      className={`${inputClass} tabular-nums`}
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onFocus={() => setDraft(shown)}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        if (text.trim() === "") {
          onChange(null)
          return
        }
        const cents = toCents(text)
        if (cents !== null && cents >= 0) onChange(cents / 100)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

function MiniField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <label className="space-y-2">
      <span className="hud text-faint block">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "1" : undefined}
        className={`${inputClass} disabled:opacity-40`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
