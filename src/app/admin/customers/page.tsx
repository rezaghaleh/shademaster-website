"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ApiError,
  createCustomer,
  CUSTOMER_EXISTS,
  listCustomers,
  money,
  subscribeToInvoiceChanges,
  type CustomerPaymentStatus,
  type CustomerRow,
  type CustomerSearch,
  type Page,
} from "@/lib/admin-api"
import { CustomerStatusBadge } from "@/components/admin/InvoiceBadges"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

/**
 * Every customer, with what they have been invoiced, paid and still owe.
 *
 * The figures are worked out by the server from each customer's invoices on every load —
 * the same invoices the projects and the payment reminders show — so they cannot drift.
 */
export default function CustomersPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<CustomerPaymentStatus | "">("")
  const [sort, setSort] = useState<NonNullable<CustomerSearch["sort"]>>("name")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<CustomerRow> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: "", phone: "", email: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listCustomers({ query: query.trim() || undefined, status: status || undefined, sort, page, size: 25 }))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customers")
    } finally {
      setLoading(false)
    }
  }, [query, status, sort, page])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => subscribeToInvoiceChanges(load), [load])

  useEffect(() => {
    setPage(0)
  }, [query, status, sort])

  async function create(confirmSameName = false) {
    if (!draft.name.trim()) {
      setError("Enter the customer's name.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createCustomer({
        name: draft.name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        confirmSameName,
      })
      router.push(`/admin/customers/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.code === CUSTOMER_EXISTS && !confirmSameName) {
        if (window.confirm(`${err.message}\n\nOK creates a new customer with the same name.`)) {
          return create(true)
        }
      } else {
        setError(err instanceof ApiError ? err.message : "Could not create the customer")
      }
      setSaving(false)
    }
  }

  const filtered = query || status

  return (
    <div className="shell py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="hud text-faint">Projects, invoices and balances</p>
          <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">Customers</h1>
        </div>
        <button type="button" onClick={() => setAdding((a) => !a)} className="btn btn-primary">
          {adding ? "Cancel" : "New customer"}
        </button>
      </header>

      {adding && (
        <section className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6" aria-label="New customer">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="hud text-faint block">Name</span>
              <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="hud text-faint block">Phone</span>
              <input className={inputClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="hud text-faint block">Email</span>
              <input
                type="email"
                className={inputClass}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => create()}
            className="btn btn-primary mt-5 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create customer"}
          </button>
        </section>
      )}

      <section
        className="border-line bg-ink-raised/50 mt-6 grid gap-4 rounded-2xl border p-5 md:grid-cols-[2fr_1fr_1fr]"
        aria-label="Search and filter"
      >
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="customer-q">
            Search
          </label>
          <input
            id="customer-q"
            className={inputClass}
            placeholder="Name, phone or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="customer-status">
            Payment
          </label>
          <select
            id="customer-status"
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerPaymentStatus | "")}
          >
            <option value="">All customers</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="NONE">No invoices yet</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="customer-sort">
            Sort
          </label>
          <select
            id="customer-sort"
            className={inputClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<CustomerSearch["sort"]>)}
          >
            <option value="name">Name, A to Z</option>
            <option value="outstanding">Highest outstanding</option>
            <option value="sales">Highest total sales</option>
          </select>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}

      <section className="mt-6" aria-label="Customers" aria-busy={loading}>
        {data && data.content.length === 0 && !loading ? (
          <p className="text-faint text-sm">
            {filtered ? "No customers match those filters." : "No customers yet. They are created with their first project."}
          </p>
        ) : (
          <>
            {/* a table where there is room for one */}
            <div className="border-line hidden overflow-x-auto rounded-2xl border md:block">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead>
                  <tr className="border-line-strong bg-ink-raised/60 border-b text-left">
                    <th className="hud text-faint px-4 py-3 font-semibold">Customer</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Projects</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Total invoiced</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Paid</th>
                    <th className="hud text-faint px-4 py-3 text-right font-semibold">Outstanding</th>
                    <th className="hud text-faint px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.content.map((c) => (
                    <tr
                      key={c.id}
                      className="border-line hover:bg-ink-raised/60 cursor-pointer border-b last:border-0"
                      onClick={() => router.push(`/admin/customers/${c.id}`)}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/admin/customers/${c.id}`} className="text-bone hover:text-sky-brand font-medium">
                          {c.name}
                        </Link>
                        <p className="text-faint mt-0.5 text-xs">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="text-mute px-4 py-3 text-right tabular-nums">{c.projectCount}</td>
                      <td className="text-mute px-4 py-3 text-right tabular-nums">{money(c.totalInvoiced)}</td>
                      <td className="text-mute px-4 py-3 text-right tabular-nums">{money(c.totalPaid)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          c.outstanding > 0 ? "text-pending" : "text-bone"
                        }`}
                      >
                        {money(c.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        <CustomerStatusBadge status={c.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* cards on a phone */}
            <ul className="space-y-3 md:hidden">
              {data?.content.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="border-line bg-ink-raised/50 block rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-bone font-medium">{c.name}</p>
                        <p className="text-faint mt-0.5 break-words text-xs">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <CustomerStatusBadge status={c.paymentStatus} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <dt className="text-faint">Projects</dt>
                      <dd className="text-mute text-right tabular-nums">{c.projectCount}</dd>
                      <dt className="text-faint">Total invoiced</dt>
                      <dd className="text-mute text-right tabular-nums">{money(c.totalInvoiced)}</dd>
                      <dt className="text-faint">Paid</dt>
                      <dd className="text-mute text-right tabular-nums">{money(c.totalPaid)}</dd>
                      <dt className="text-faint">Outstanding</dt>
                      <dd className={`text-right font-semibold tabular-nums ${c.outstanding > 0 ? "text-pending" : "text-bone"}`}>
                        {money(c.outstanding)}
                      </dd>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {data && data.totalPages > 1 && (
          <nav className="border-line mt-6 flex items-center justify-between border-t pt-5" aria-label="Pagination">
            <button
              type="button"
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 disabled:opacity-40"
              disabled={data.first}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
            >
              Previous
            </button>
            <span className="hud text-faint">
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} customers
            </span>
            <button
              type="button"
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 disabled:opacity-40"
              disabled={data.last}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
