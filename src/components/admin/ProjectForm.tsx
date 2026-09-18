"use client"

import { useMemo, useState } from "react"
import { ApiError, money, type LineItemInput, type ProjectInput } from "@/lib/admin-api"
import { calculateLinePrice } from "@/lib/pricing"
import { InchInput } from "@/components/InchInput"

/**
 * Create/edit form for a project.
 *
 * <p>The running total is computed locally with the same
 * {@link calculateLinePrice} the public estimate page uses, so the figure shown
 * while typing is the figure the backend will store. The backend recomputes it
 * from its own mirror of the formula on save; the two are held together by the
 * golden vectors, so they cannot silently disagree.
 */

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

export type ProjectFormValues = ProjectInput

const EMPTY: ProjectFormValues = {
  projectName: "",
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
  const [values, setValues] = useState<ProjectFormValues>(initial ?? EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  /** What the formula says for one shade on this line, ignoring any override. */
  function calculatedUnit(item: LineItemInput): number {
    return calculateLinePrice({
      width: item.width,
      height: item.height,
      quantity: 1,
      productType: item.productType === "ROLLER" ? "roller" : "zebra",
      motorized: item.motorized,
    })
  }

  /** The price actually charged per shade: the manual one where set. */
  function effectiveUnit(item: LineItemInput): number {
    return item.unitPriceOverride == null || Number.isNaN(item.unitPriceOverride)
      ? calculatedUnit(item)
      : item.unitPriceOverride
  }

  function lineTotal(item: LineItemInput): number {
    return effectiveUnit(item) * item.quantity
  }

  // Recomputes on every keystroke, so the subtotal always reflects the prices
  // as edited — including manual overrides.
  const subtotal = useMemo(
    () => values.items.reduce((sum, item) => sum + lineTotal(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.items]
  )

  const overriddenCount = values.items.filter(
    (i) => i.unitPriceOverride != null && !Number.isNaN(i.unitPriceOverride)
  ).length

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
    set("items", [...values.items, next])
  }

  function updateItem(index: number, patch: Partial<LineItemInput>) {
    set(
      "items",
      values.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function removeItem(index: number) {
    set(
      "items",
      values.items.filter((_, i) => i !== index)
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await onSubmit({
        ...values,
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
          <Field
            id="customerName"
            label="Customer name"
            required
            value={values.customerName}
            onChange={(v) => set("customerName", v)}
            error={fieldError("customerName")}
          />
          <Field
            id="phone"
            label="Phone"
            value={values.phone ?? ""}
            onChange={(v) => set("phone", v)}
            error={fieldError("phone")}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={values.email ?? ""}
            onChange={(v) => set("email", v)}
            error={fieldError("email")}
          />
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

        {values.items.length === 0 ? (
          <p className="text-faint mt-6 text-sm">
            No windows yet. Add at least one before invoicing.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {values.items.map((item, index) => {
              const calculated = calculatedUnit(item)
              const effective = effectiveUnit(item)
              const overridden =
                item.unitPriceOverride != null && !Number.isNaN(item.unitPriceOverride)

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

                  {/* pricing, with the manual override */}
                  <div className="border-line mt-6 grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1fr)_minmax(15rem,1.2fr)_minmax(8rem,auto)] lg:items-start">
                    <div className="space-y-2">
                      <span className="hud text-faint block">Calculated / shade</span>
                      <p
                        className={`flex h-11 items-center text-sm tabular-nums ${
                          overridden ? "text-faint line-through" : "text-mute"
                        }`}
                      >
                        {money(calculated)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        className="hud text-sky-brand block"
                        htmlFor={`item-${index}-price`}
                      >
                        Price / shade
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`item-${index}-price`}
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={calculated.toFixed(2)}
                          value={
                            item.unitPriceOverride == null ||
                            Number.isNaN(item.unitPriceOverride)
                              ? ""
                              : String(item.unitPriceOverride)
                          }
                          onChange={(e) =>
                            updateItem(index, {
                              // Clearing the box removes the override and the
                              // line goes back to the calculated price.
                              unitPriceOverride:
                                e.target.value.trim() === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                        {overridden && (
                          <button
                            type="button"
                            title="Reset to the calculated price"
                            onClick={() => updateItem(index, { unitPriceOverride: null })}
                            className="hud border-line-strong text-faint hover:text-bone h-11 shrink-0 rounded-lg border px-2.5 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 lg:text-right">
                      <span className="hud text-faint block">Line total</span>
                      <p className="text-bone flex h-11 items-center text-sm font-semibold tabular-nums lg:justify-end">
                        {money(lineTotal(item))}
                      </p>
                    </div>
                  </div>
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
          <span className="display text-bone text-[clamp(22px,2.6vw,32px)] tabular-nums">
            {money(subtotal)}
          </span>
        </div>

        <p className="text-faint mt-4 text-xs leading-[1.6]">
          Blind and motor brands, and the measurements, are kept for your records
          and are <strong>not</strong> printed on the customer invoice. A manual
          price applies to this quote only — it never changes the underlying rates.
        </p>
      </section>

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
