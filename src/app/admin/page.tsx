"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BellRing, CircleCheck } from "lucide-react"
import {
  ApiError,
  getCurrentUser,
  getDashboard,
  money,
  subscribeToInvoiceChanges,
  type Dashboard,
} from "@/lib/admin-api"
import { ADMIN_SECTIONS } from "@/components/admin/AdminSections"
import { unpaidAge } from "@/components/admin/InvoiceBadges"

/**
 * Home: the way into every part of the admin, and what needs attention today.
 *
 * Every figure here is read from the server as it stands — counts from the projects and
 * customers, money from the invoices and payments — and reloads whenever a payment is
 * recorded anywhere in the admin.
 */
export default function AdminHome() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const user = getCurrentUser()

  const load = useCallback(() => {
    getDashboard()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the dashboard"))
  }, [])

  useEffect(() => {
    load()
    return subscribeToInvoiceChanges(load)
  }, [load])

  const unpaid = data?.receivables.unpaidInvoices ?? 0

  return (
    <div className="shell py-10 md:py-14">
      <header>
        <p className="hud text-faint">ShadeMaster admin</p>
        <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">Home</h1>
        {user && <p className="text-mute mt-3 text-sm">Signed in as {user.displayName}.</p>}
      </header>

      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------ figures */}
      <section aria-label="At a glance" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Projects" value={data ? String(data.projectCount) : "—"} href="/admin/projects" />
        <Stat label="Customers" value={data ? String(data.customerCount) : "—"} href="/admin/customers" />
        <Stat
          label="Outstanding"
          value={data ? money(data.outstanding) : "—"}
          href="/admin/reminders"
          tone={data && data.outstanding > 0 ? "pending" : undefined}
        />
        <Stat
          label={data ? `Sales in ${data.year}` : "Sales this year"}
          value={data ? money(data.invoicedThisYear) : "—"}
          href="/admin/reports/sales-tax"
        />
      </section>

      <div className="mt-8 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* ------------------------------------------------------- the areas */}
        {/* two across on a phone, without the descriptions, so every area fits on the
            first screen or two instead of eight tall cards in a column */}
        <nav aria-label="Admin sections" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {ADMIN_SECTIONS.map(({ href, title, description, Icon, reminders }) => (
            <Link
              key={href}
              href={href}
              className="border-line bg-ink-raised/50 hover:border-sky-brand/50 hover:bg-ink-raised group relative flex min-h-[9.5rem] flex-col rounded-2xl border p-4 transition-colors sm:min-h-[11rem] sm:p-6"
            >
              <span className="bg-sky-brand/10 text-sky-brand grid h-12 w-12 place-items-center rounded-xl sm:h-14 sm:w-14">
                <Icon aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
              </span>
              {reminders && unpaid > 0 && (
                <span
                  className="bg-danger text-onaccent absolute right-3 top-3 grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-bold tabular-nums sm:right-5 sm:top-5"
                  aria-label={`${unpaid} unpaid ${unpaid === 1 ? "invoice" : "invoices"}`}
                >
                  {unpaid}
                </span>
              )}
              <span className="text-bone mt-4 font-semibold leading-tight sm:mt-5 sm:text-lg">{title}</span>
              <span className="text-mute mt-1 hidden text-sm leading-[1.55] sm:block">{description}</span>
              <ArrowRight
                aria-hidden="true"
                className="text-faint group-hover:text-sky-brand mt-auto h-5 w-5 self-end pt-1 transition-colors"
              />
            </Link>
          ))}
        </nav>

        {/* ---------------------------------------------- payment reminders */}
        <section
          aria-labelledby="home-reminders-title"
          className="border-line bg-ink-raised/50 rounded-2xl border p-6 xl:sticky xl:top-6"
        >
          <div className="flex items-center gap-3">
            <BellRing aria-hidden="true" className="text-sky-brand h-5 w-5" />
            <h2 id="home-reminders-title" className="hud text-sky-brand">
              Payment reminders
            </h2>
          </div>

          {!data ? (
            <p className="hud text-faint mt-5">Loading…</p>
          ) : data.reminders.length === 0 ? (
            <div className="mt-6 flex items-start gap-3">
              <CircleCheck aria-hidden="true" className="text-good mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-bone font-medium">No unpaid payments</p>
                <p className="text-mute mt-1 text-sm">All customer invoices are currently paid.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-mute mt-4 text-sm">
                {data.receivables.customersWithBalance}{" "}
                {data.receivables.customersWithBalance === 1 ? "customer has" : "customers have"} an outstanding
                balance
                {data.receivables.overdueInvoices > 0 && (
                  <>
                    {" · "}
                    <span className="text-danger">{data.receivables.overdueInvoices} overdue</span>
                  </>
                )}
              </p>
              <ul className="mt-4 space-y-2">
                {data.reminders.map((r) => (
                  <li key={r.customerId}>
                    <Link
                      href={`/admin/customers/${r.customerId}`}
                      className="border-line bg-ink/60 hover:border-sky-brand/40 block rounded-xl border p-4 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-bone truncate font-medium">{r.customerName}</span>
                        <span className="text-bone shrink-0 font-semibold tabular-nums">{money(r.outstanding)}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-mute truncate">
                          {r.invoiceCount === 1
                            ? `Invoice ${r.firstInvoiceNumber ?? ""}`
                            : `${r.invoiceCount} invoices`}
                        </span>
                        <span className={r.overdue ? "text-danger shrink-0" : "text-faint shrink-0"}>
                          {r.overdue ? "Overdue" : unpaidAge(r.daysOutstanding)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.receivables.customersWithBalance > data.reminders.length && (
                <p className="text-faint mt-3 text-xs">
                  and {data.receivables.customersWithBalance - data.reminders.length} more
                </p>
              )}
            </>
          )}

          <Link href="/admin/reminders" className="btn btn-ghost mt-5 w-full justify-center">
            View all payment reminders
          </Link>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, href, tone }: { label: string; value: string; href: string; tone?: "pending" }) {
  return (
    <Link
      href={href}
      className="border-line bg-ink-raised/50 hover:border-sky-brand/40 rounded-2xl border p-5 transition-colors"
    >
      <p className="hud text-faint">{label}</p>
      <p
        className={`mt-3 text-[clamp(1.15rem,2.2vw,1.55rem)] font-semibold tabular-nums ${
          tone === "pending" ? "text-pending" : "text-bone"
        }`}
      >
        {value}
      </p>
    </Link>
  )
}
