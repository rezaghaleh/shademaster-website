"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  bootstrap,
  getCurrentUser,
  logout,
  subscribeToAuth,
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
    { href: "/admin", label: "Projects" },
    { href: "/admin/new", label: "New project" },
    { href: "/admin/measurement", label: "Measurement" },
  ]

  return (
    <main id="main" tabIndex={-1}>
      <div className="no-print border-line bg-ink-raised/40 border-b">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-6">
            <p className="hud text-sky-brand">Admin</p>
            <nav aria-label="Admin" className="flex items-center gap-1">
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
                    className={`hud rounded-lg px-3 py-2 transition-colors ${
                      active ? "text-bone bg-sky-brand/15" : "text-faint hover:text-bone"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} onChoose={choose} saving={savingTheme} />
            <span className="text-mute text-sm">
              {user.displayName}
              <span className="hud text-faint ml-2">{user.role}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout()
                sync()
              }}
              className="hud border-line-strong text-mute hover:text-bone h-11 rounded-lg border px-3 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {children}
    </main>
  )
}
