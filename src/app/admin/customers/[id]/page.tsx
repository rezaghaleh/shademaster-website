"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Mail, MapPin, Phone } from "lucide-react"
import {
  ApiError,
  CUSTOMER_EXISTS,
  customerOptions,
  deleteCustomer,
  getCustomer,
  mergeCustomer,
  money,
  subscribeToInvoiceChanges,
  updateCustomer,
  type CustomerDetail,
  type CustomerInvoiceRow,
  type CustomerOption,
} from "@/lib/admin-api"
import { CustomerStatusBadge, DocStatusBadge, PaymentBadge } from "@/components/admin/InvoiceBadges"
import { formatShortDate } from "@/components/admin/CustomerInvoicePreview"
import { MarkPaidModal, type PayableInvoice } from "@/components/admin/MarkPaidModal"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

const TABS = [
  ["overview", "Overview"],
  ["projects", "Projects"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["measurements", "Measurements"],
  ["notes", "Notes"],
] as const
type Tab = (typeof TABS)[number][0]

/**
 * One customer, and everything that belongs to them — gathered from where it lives.
 *
 * Projects, invoices, payments and measurement sheets are the real records, linked here,
 * never copies. Totals and the outstanding balance are worked out from the invoices on
 * every load, and reload when a payment is recorded anywhere in the admin.
 */
export default function CustomerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "" })
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [paying, setPaying] = useState<PayableInvoice | null>(null)

  const load = useCallback(async () => {
    try {
      const c = await getCustomer(id)
      setCustomer(c)
      setNotes(c.notes ?? "")
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this customer")
    }
  }, [id])

  useEffect(() => {
    load()
    return subscribeToInvoiceChanges(load)
  }, [load])

  // a tab can be linked to: /admin/customers/{id}#payments — also from this same page,
  // which changes only the hash and does not load the page again
  useEffect(() => {
    const fromHash = () => {
      const key = window.location.hash.slice(1)
      if (TABS.some(([k]) => k === key)) setTab(key as Tab)
    }
    fromHash()
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [])

  function chooseTab(next: Tab) {
    setTab(next)
    history.replaceState(null, "", `#${next}`)
  }

  // arrow keys move between the tabs, as they do in any tab list
  function onTabKey(e: React.KeyboardEvent) {
    const at = TABS.findIndex(([key]) => key === tab)
    const to =
      e.key === "ArrowRight" ? (at + 1) % TABS.length
      : e.key === "ArrowLeft" ? (at - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : null
    if (to === null) return
    e.preventDefault()
    const key = TABS[to][0]
    chooseTab(key)
    document.getElementById(`tab-${key}`)?.focus()
  }

  async function save(patch: Partial<{ name: string; phone: string; email: string; notes: string }>, confirmSameName = false) {
    if (!customer) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateCustomer(customer.id, {
        name: (patch.name ?? customer.name).trim(),
        phone: (patch.phone ?? customer.phone ?? "").trim() || null,
        email: (patch.email ?? customer.email ?? "").trim() || null,
        notes: (patch.notes ?? customer.notes ?? "").trim() || null,
        confirmSameName,
      })
      setCustomer(updated)
      setNotes(updated.notes ?? "")
      setEditing(false)
      setNotice("Saved. Every project of this customer shows the change.")
    } catch (err) {
      if (err instanceof ApiError && err.code === CUSTOMER_EXISTS && !confirmSameName) {
        if (window.confirm(`${err.message}\n\nOK keeps this name anyway.`)) {
          setSaving(false)
          return save(patch, true)
        }
      } else {
        setError(err instanceof ApiError ? err.message : "Could not save")
      }
    } finally {
      setSaving(false)
    }
  }

  function payable(inv: CustomerInvoiceRow): PayableInvoice {
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      version: inv.version,
      customerName: customer?.name ?? "",
      projectName: inv.projectName,
      balanceDue: inv.balanceDue,
      currency: inv.currency,
    }
  }

  if (!customer) {
    return (
      <div className="shell py-14">
        {error ? (
          <>
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
            <Link href="/admin/customers" className="btn btn-ghost mt-6">
              All customers
            </Link>
          </>
        ) : (
          <p className="hud text-faint">Loading…</p>
        )}
      </div>
    )
  }

  const c = customer
  const s = c.summary
  const owing = c.invoices.filter((i) => (i.status === "ISSUED" || i.status === "SENT") && i.balanceDue > 0)

  return (
    <div className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="hud text-faint">
        <Link href="/admin/customers" className="hover:text-bone transition-colors">
          Customers
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mute">{c.name}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-bone text-[clamp(28px,4vw,48px)]">{c.name}</h1>
            <CustomerStatusBadge status={s.paymentStatus} />
          </div>
          <ul className="text-mute mt-3 space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Phone aria-hidden="true" className="text-faint h-4 w-4" />
              {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-bone">{c.phone}</a> : <span className="text-faint">No phone</span>}
            </li>
            <li className="flex items-center gap-2">
              <Mail aria-hidden="true" className="text-faint h-4 w-4" />
              {c.email ? (
                <a href={`mailto:${c.email}`} className="hover:text-bone break-all">
                  {c.email}
                </a>
              ) : (
                <span className="text-faint">No email</span>
              )}
            </li>
            {c.address && (
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="text-faint h-4 w-4" />
                <span>
                  {c.address} <span className="text-faint">(latest project)</span>
                </span>
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "" })
              setEditing((e) => !e)
            }}
            className="btn btn-ghost"
          >
            {editing ? "Cancel" : "Edit details"}
          </button>
          <Link href={`/admin/new?customerId=${c.id}`} className="btn btn-primary">
            New project
          </Link>
        </div>
      </header>

      {editing && (
        <section className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6" aria-label="Edit customer details">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="hud text-faint block">Name</span>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="hud text-faint block">Phone</span>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="hud text-faint block">Email</span>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <p className="text-faint mt-3 text-xs leading-[1.6]">
            Every project of this customer shows these details. Issued invoices keep the details they were sent
            with — use &ldquo;Copy details from the project&rdquo; on an invoice to update it.
          </p>
          <button
            type="button"
            disabled={saving || !form.name.trim()}
            onClick={() => save(form)}
            className="btn btn-primary mt-5 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </section>
      )}

      {notice && (
        <p role="status" className="text-good mt-6 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}

      <section aria-label="Summary" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Projects" value={String(s.projectCount)} />
        <Card label="Total invoiced" value={money(s.totalInvoiced)} />
        <Card label="Total paid" value={money(s.totalPaid)} />
        <Card label="Outstanding" value={money(s.outstanding)} tone={s.outstanding > 0 ? "pending" : undefined} />
      </section>

      {/* ---------------------------------------------------------------- tabs */}
      <div
        role="tablist"
        aria-label="Customer"
        onKeyDown={onTabKey}
        className="border-line mt-8 flex gap-1 overflow-x-auto border-b"
      >
        {TABS.map(([key, label]) => {
          const count =
            key === "projects" ? c.projects.length
            : key === "invoices" ? c.invoices.length
            : key === "payments" ? c.payments.filter((p) => !p.voided).length
            : key === "measurements" ? c.measurements.length
            : null
          return (
            <button
              key={key}
              id={`tab-${key}`}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => chooseTab(key)}
              className={`hud -mb-px shrink-0 border-b-2 px-4 py-3 transition-colors ${
                tab === key ? "border-sky-brand text-bone" : "text-faint hover:text-bone border-transparent"
              }`}
            >
              {label}
              {count !== null && <span className="text-faint ml-1.5">{count}</span>}
            </button>
          )
        })}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="owing-title">
              <h2 id="owing-title" className="hud text-sky-brand">
                Outstanding invoices
              </h2>
              {owing.length === 0 ? (
                <p className="text-mute mt-4 text-sm">
                  {s.invoiceCount === 0 ? "No invoices issued yet." : "Nothing outstanding — every invoice is paid."}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {owing.map((inv) => (
                    <li key={inv.id} className="border-line bg-ink/60 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <Link href={`/admin/invoices/${inv.id}`} className="text-bone hover:text-sky-brand font-medium">
                          Invoice {inv.invoiceNumber}
                        </Link>
                        <p className="text-faint text-xs">
                          {inv.projectName} · issued {formatShortDate(inv.issuedOn)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-bone font-semibold tabular-nums">{money(inv.balanceDue, inv.currency)}</p>
                          <p className="text-faint text-xs tabular-nums">of {money(inv.grandTotal, inv.currency)}</p>
                        </div>
                        <button type="button" onClick={() => setPaying(payable(inv))} className="btn btn-primary !py-2 !text-[0.85rem]">
                          Mark as paid
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="pay-summary-title">
              <h2 id="pay-summary-title" className="hud text-sky-brand">
                Payment summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm tabular-nums">
                <Row label="Total invoiced" value={money(s.totalInvoiced)} />
                <Row label="Total paid" value={money(s.totalPaid)} />
                <div className="border-line flex items-baseline justify-between border-t pt-3">
                  <dt className="text-bone font-semibold">Outstanding</dt>
                  <dd className={`text-lg font-semibold ${s.outstanding > 0 ? "text-pending" : "text-bone"}`}>
                    {money(s.outstanding)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <CustomerStatusBadge status={s.paymentStatus} />
              </div>
              <p className="text-faint mt-4 text-xs leading-[1.6]">
                From {s.invoiceCount} issued {s.invoiceCount === 1 ? "invoice" : "invoices"}. Drafts and void
                invoices are not counted.
              </p>
            </section>

            <ManageCustomer customer={c} onMerged={(target) => router.push(`/admin/customers/${target}`)} />
          </div>
        )}

        {tab === "projects" && (
          c.projects.length === 0 ? (
            <Empty text="No projects for this customer yet." />
          ) : (
            <ul className="space-y-3">
              {c.projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="border-line bg-ink-raised/50 hover:border-sky-brand/40 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-bone font-medium">{p.projectName}</p>
                      <p className="text-faint text-xs">
                        {[p.address, `${p.windows} ${p.windows === 1 ? "window" : "windows"}`, `created ${formatShortDate(p.createdAt)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {p.invoice ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-mute text-sm">{p.invoice.invoiceNumber ?? "Draft invoice"}</span>
                        <span className="text-bone font-semibold tabular-nums">{money(p.invoice.grandTotal)}</span>
                        <PaymentBadge status={p.invoice.paymentStatus} docStatus={p.invoice.status} />
                        {p.invoice.status === "DRAFT" && <DocStatusBadge status="DRAFT" />}
                      </div>
                    ) : (
                      <span className="hud text-faint">No invoice yet</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "invoices" && (
          c.invoices.length === 0 ? (
            <Empty text="No invoices for this customer yet." />
          ) : (
            <div className="border-line overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <thead>
                  <tr className="border-line-strong bg-ink-raised/60 border-b text-left">
                    <th className="hud text-faint px-4 py-3 font-semibold">Invoice</th>
                    <th className="hud text-faint px-4 py-3 font-semibold">Project</th>
                    <th className="hud text-faint px-4 py-3 font-semibold">Issued</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Total</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Balance</th>
                    <th className="hud text-faint px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {c.invoices.map((inv) => (
                    <tr key={inv.id} className="border-line border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/invoices/${inv.id}`} className="text-bone hover:text-sky-brand font-medium">
                          {inv.invoiceNumber ?? "Draft"}
                        </Link>
                        {!inv.primary && <span className="hud text-faint ml-2">older</span>}
                      </td>
                      <td className="text-mute px-4 py-3">{inv.projectName}</td>
                      <td className="text-mute px-4 py-3">{formatShortDate(inv.issuedOn)}</td>
                      <td className="text-mute px-4 py-3 text-right tabular-nums">{money(inv.grandTotal, inv.currency)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${inv.balanceDue > 0 && inv.status !== "DRAFT" && inv.status !== "VOID" ? "text-pending font-semibold" : "text-mute"}`}>
                        {money(inv.status === "DRAFT" || inv.status === "VOID" ? 0 : inv.balanceDue, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          <DocStatusBadge status={inv.status} />
                          <PaymentBadge status={inv.paymentStatus} docStatus={inv.status} />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(inv.status === "ISSUED" || inv.status === "SENT") && inv.balanceDue > 0 && (
                          <button type="button" onClick={() => setPaying(payable(inv))} className="btn btn-ghost !py-1.5 !text-[0.8rem]">
                            Mark as paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "payments" && (
          c.payments.length === 0 ? (
            <Empty text="No payments recorded yet." />
          ) : (
            <ul className="space-y-3">
              {c.payments.map((p) => (
                <li
                  key={p.id}
                  className={`border-line flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${p.voided ? "opacity-70" : "bg-ink-raised/50"}`}
                >
                  <div className="min-w-0">
                    <p className="text-bone font-medium tabular-nums">{formatShortDate(p.paidOn)}</p>
                    <p className="text-faint text-xs">
                      <Link href={`/admin/invoices/${p.invoiceId}`} className="hover:text-bone">
                        Invoice {p.invoiceNumber ?? "draft"}
                      </Link>{" "}
                      · {p.projectName}
                    </p>
                    {(p.reference || p.note) && (
                      <p className="text-mute mt-1 text-xs">{[p.reference, p.note].filter(Boolean).join(" — ")}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-mute text-sm">{p.methodLabel}</span>
                    <span className={`font-semibold tabular-nums ${p.voided ? "text-faint line-through" : "text-bone"}`}>
                      {money(p.amount)}
                    </span>
                    {p.voided ? (
                      <span className="hud border-line-strong text-faint rounded-full border px-2.5 py-1">Voided</span>
                    ) : (
                      <span className="hud border-good/60 text-good rounded-full border px-2.5 py-1 font-bold">Received</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "measurements" && (
          c.measurements.length === 0 ? (
            <Empty text="No measurement sheets linked to this customer. Link one from its sheet’s header." />
          ) : (
            <ul className="space-y-3">
              {c.measurements.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/measurement/${m.id}`}
                    className="border-line bg-ink-raised/50 hover:border-sky-brand/40 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-bone font-medium">
                        {[m.projectName, m.buildingLevel].filter(Boolean).join(" — ") || "Untitled sheet"}
                      </p>
                      <p className="text-faint text-xs">
                        {[m.contractor, m.sheetDate ? formatShortDate(m.sheetDate) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-mute text-sm tabular-nums">
                      {m.sheetCount} {m.sheetCount === 1 ? "sheet" : "sheets"} · {m.openings}{" "}
                      {m.openings === 1 ? "opening" : "openings"}
                      {m.pending > 0 && <span className="text-pending"> · {m.pending} pending</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "notes" && (
          <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-label="Notes">
            <textarea
              rows={8}
              aria-label="Customer notes"
              className={`${inputClass} h-auto py-3`}
              placeholder="Internal notes about this customer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              type="button"
              disabled={saving || notes === (c.notes ?? "")}
              onClick={() => save({ notes })}
              className="btn btn-primary mt-4 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          </section>
        )}
      </div>

      <MarkPaidModal
        target={paying}
        onClose={() => setPaying(null)}
        onPaid={(updated) => {
          setPaying(null)
          setNotice(
            updated.paymentStatus === "PAID"
              ? `Invoice ${updated.invoiceNumber} is paid.`
              : `Payment recorded; ${money(updated.balanceDue, updated.currency)} still due on invoice ${updated.invoiceNumber}.`
          )
          load()
        }}
      />
    </div>
  )
}

/** Merging a duplicate into another customer, or deleting a customer with nothing attached. */
function ManageCustomer({ customer, onMerged }: { customer: CustomerDetail; onMerged: (targetId: string) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const empty = customer.projects.length === 0 && customer.invoices.length === 0

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions([])
      return
    }
    const t = setTimeout(() => {
      customerOptions(query.trim())
        .then((found) => setOptions(found.filter((o) => o.id !== customer.id)))
        .catch(() => setOptions([]))
    }, 200)
    return () => clearTimeout(t)
  }, [open, query, customer.id])

  async function merge(target: CustomerOption) {
    if (
      !window.confirm(
        `Move ${customer.name}'s ${customer.projects.length} project(s), ${customer.invoices.length} invoice(s) and ` +
          `${customer.measurements.length} measurement sheet(s) to ${target.name}, then remove ${customer.name}?\n\n` +
          `Their contact details and notes are kept in ${target.name}'s notes. This cannot be undone.`
      )
    )
      return
    setBusy(true)
    try {
      await mergeCustomer(customer.id, target.id)
      onMerged(target.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not merge")
      setBusy(false)
    }
  }

  return (
    <section className="border-line rounded-2xl border p-6 lg:col-span-2" aria-labelledby="manage-title">
      <h2 id="manage-title" className="hud text-faint">
        Duplicate or unused customer
      </h2>
      <p className="text-mute mt-2 text-sm leading-[1.6]">
        If this is the same person as another customer, merge them: everything moves across and nothing is lost.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-ghost !py-2 !text-[0.85rem]">
          {open ? "Cancel" : "Merge into another customer…"}
        </button>
        <button
          type="button"
          disabled={!empty || busy}
          title={empty ? undefined : "Only a customer with no projects or invoices can be deleted"}
          onClick={async () => {
            if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return
            try {
              await deleteCustomer(customer.id)
              router.push("/admin/customers")
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not delete")
            }
          }}
          className="hud border-danger/40 text-danger hover:bg-danger/10 rounded-lg border px-4 py-2 transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          Delete customer
        </button>
      </div>
      {open && (
        <div className="mt-4 max-w-md">
          <label className="block space-y-2">
            <span className="hud text-faint block">Merge into</span>
            <input
              className={inputClass}
              placeholder="Search the customer to keep"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ul className="mt-2 space-y-1">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => merge(o)}
                  className="border-line hover:border-sky-brand/50 w-full rounded-lg border px-4 py-2.5 text-left transition-colors"
                >
                  <span className="text-bone block text-sm font-medium">{o.name}</span>
                  <span className="text-faint block text-xs">
                    {[o.phone, o.email].filter(Boolean).join(" · ") || "No contact details"} · {o.projectCount} projects
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
    </section>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "pending" }) {
  return (
    <div className="border-line bg-ink-raised/50 rounded-2xl border p-5">
      <p className="hud text-faint">{label}</p>
      <p
        className={`mt-3 text-[clamp(1.15rem,2.2vw,1.55rem)] font-semibold tabular-nums ${
          tone === "pending" ? "text-pending" : "text-bone"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-mute">{label}</dt>
      <dd className="text-bone">{value}</dd>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="border-line text-mute rounded-2xl border px-6 py-10 text-center text-sm">{text}</p>
}
