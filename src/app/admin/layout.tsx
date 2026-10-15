"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BellRing, Menu, X } from "lucide-react"
import {
  bootstrap,
  getCurrentUser,
  getReceivablesSummary,
  logout,
  subscribeToAuth,
  subscribeToInvoiceChanges,
  type AdminSummary,
} from "@/lib/admin-api"
import { AdminLogin } from "@/components/admin/AdminLogin"
import { ThemeToggle, useAccountTheme } from "@/components/admin/ThemeToggle"

/**
 * Auth gate for everything under /admin.
 *
 * <p>This is a client-side gate over an API that enforces authorization itself —
 * it decides what to render, not what is allowed. Every endpoint behind it
 * requires a bearer token regardless of what this component shows, so hiding a
 * screen here is a convenience, never the security boundary.
 *
 * <p>Because the access token lives in memory, a reload starts signed-out and
 * has to ask the refresh cookie whether there is still a session. Until that
 * answer arrives we show nothing rather than flashing the login form at someone
 * who is already signed in.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<AdminSummary | null>(null)

  // Applied here rather than in the nav so the sign-in screen is themed too, and so
  // the choice is painted before anyone is signed in.
  const { theme, choose, saving: savingTheme } = useAccountTheme()

  const sync = useCallback(() => setUser(getCurrentUser()), [])

  // The phone menu: shut by going somewhere, or by Escape, which hands focus back to
  // the button that opened it.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuOpen])

  useEffect(() => {
    const unsubscribe = subscribeToAuth(sync)
    bootstrap()
      .catch(() => false)
      .finally(() => {
        sync()
        setChecking(false)
      })
    return unsubscribe
  }, [sync])

  if (checking) {
    return (
      <main className="grid min-h-[100dvh] place-items-center">
        <p className="hud text-faint">Checking your session…</p>
      </main>
    )
  }

  if (!user) {
    return <AdminLogin onSignedIn={sync} />
  }

  const nav = [
    { href: "/admin", label: "Home" },
    { href: "/admin/projects", label: "Projects" },
    { href: "/admin/new", label: "New project" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/measurement", label: "Measurement" },
    { href: "/admin/invoices", label: "Invoices" },
    // the year-end accounting report, read from the invoices; not an invoice itself
    { href: "/admin/reports/sales-tax", label: "Sales & Tax" },
    // the bell covers this on a wider screen; the phone menu has the room to spell it out
    { href: "/admin/reminders", label: "Payment reminders", phoneOnly: true },
  ]

  async function signOut() {
    await logout()
    sync()
  }

  return (
    <main id="main" tabIndex={-1}>
      <div className="no-print border-line bg-ink-raised/40 border-b">
        {/* One row on a wide screen. Narrower, the links drop to a row of their own under
            the actions; on a phone they fold behind Menu rather than stacking three deep. */}
        <div className="shell flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <p className="hud text-sky-brand">Admin</p>

          <nav
            id="admin-nav"
            aria-label="Admin"
            className={`${menuOpen ? "grid" : "hidden"} order-last w-full grid-cols-2 gap-1 md:flex md:flex-wrap md:items-center xl:order-none xl:w-auto`}
          >
            {nav.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`hud whitespace-nowrap rounded-lg px-3 py-3 transition-colors md:px-2.5 md:py-2 ${
                    item.phoneOnly ? "md:hidden" : ""
                  } ${active ? "text-bone bg-sky-brand/15" : "text-faint hover:text-bone"}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <RemindersBell pathname={pathname} />
            <ThemeToggle theme={theme} onChoose={choose} saving={savingTheme} />
            {/* the role is on the Admin page; here it only costs the room the links need */}
            <span
              className="text-mute hidden max-w-[9rem] truncate text-sm md:inline"
              title={`${user.displayName} · ${user.role}`}
            >
              {user.displayName}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="hud border-line-strong text-mute hover:text-bone hidden h-11 rounded-lg border px-3 transition-colors md:block"
            >
              Sign out
            </button>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="admin-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="hud border-line-strong text-mute hover:text-bone flex h-11 items-center gap-2 rounded-lg border px-3 transition-colors md:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Menu aria-hidden="true" className="h-4 w-4" />
              )}
              Menu
            </button>
          </div>

          {menuOpen && (
            <div className="border-line order-last flex w-full items-center justify-between gap-3 border-t pt-3 md:hidden">
              <span className="text-mute min-w-0 truncate text-sm">
                {user.displayName}
                <span className="hud text-faint ml-2">{user.role}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="hud border-line-strong text-mute hover:text-bone h-11 shrink-0 rounded-lg border px-3 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {children}
    </main>
  )
}

/**
 * Payment reminders, as a bell with the number of unpaid invoices.
 *
 * The count is asked of the server — never kept here — whenever the page changes and
 * whenever a payment is recorded, so it always matches the reminders page.
 */
function RemindersBell({ pathname }: { pathname: string }) {
  const [count, setCount] = useState<number | null>(null)

  const load = useCallback(() => {
    getReceivablesSummary()
      .then((s) => setCount(s.unpaidInvoices))
      .catch(() => setCount(null))
  }, [])

  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => subscribeToInvoiceChanges(load), [load])

  const active = pathname.startsWith("/admin/reminders")
  const label =
    count === null
      ? "Payment reminders"
      : count === 0
        ? "Payment reminders: nothing unpaid"
        : `Payment reminders: ${count} unpaid ${count === 1 ? "invoice" : "invoices"}`

  return (
    <Link
      href="/admin/reminders"
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`relative grid h-11 w-11 place-items-center rounded-lg border transition-colors ${
        active ? "border-sky-brand bg-sky-brand/15 text-bone" : "border-line-strong text-mute hover:text-bone"
      }`}
    >
      <BellRing aria-hidden="true" className="h-5 w-5" />
      {count !== null && count > 0 && (
        <span className="bg-danger text-onaccent absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.7rem] font-bold tabular-nums">
          {count}
        </span>
      )}
    </Link>
  )
}
