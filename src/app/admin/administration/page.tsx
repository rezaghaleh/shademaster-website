"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { ApiError, getCurrentUser, listAdminAccounts, type AdminAccount } from "@/lib/admin-api"

/**
 * Administration: who you are signed in as, and — for a super admin — the admin accounts.
 *
 * Read-only on purpose. Accounts are created and passwords set on the server, not from a
 * screen a borrowed session could reach.
 */
export default function AdministrationPage() {
  const user = getCurrentUser()
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const superAdmin = user?.role === "SUPER_ADMIN"

  useEffect(() => {
    if (!superAdmin) return
    listAdminAccounts()
      .then(setAccounts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the admin accounts"))
  }, [superAdmin])

  return (
    <div className="shell py-10 md:py-14">
      <header>
        <p className="hud text-faint">System</p>
        <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">Administration</h1>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="account-title">
          <div className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="text-sky-brand h-5 w-5" />
            <h2 id="account-title" className="hud text-sky-brand">
              Your account
            </h2>
          </div>
          {user && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-faint">Name</dt>
              <dd className="text-bone">{user.displayName}</dd>
              <dt className="text-faint">Username</dt>
              <dd className="text-bone">{user.username}</dd>
              <dt className="text-faint">Role</dt>
              <dd className="text-bone">{user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}</dd>
              <dt className="text-faint">Appearance</dt>
              <dd className="text-bone">
                {user.theme === "LIGHT" ? "Light" : "Dark"}{" "}
                <span className="text-faint">— switch it from the top bar; it follows your account to every device.</span>
              </dd>
            </dl>
          )}
        </section>

        <section className="border-line bg-ink-raised/50 rounded-2xl border p-6" aria-labelledby="shortcuts-title">
          <h2 id="shortcuts-title" className="hud text-sky-brand">
            Records
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/admin/customers" className="text-bone hover:text-sky-brand">Customers</Link>
              <span className="text-faint"> — merge duplicates from a customer&rsquo;s page</span>
            </li>
            <li>
              <Link href="/admin/invoices" className="text-bone hover:text-sky-brand">Invoices</Link>
              <span className="text-faint"> — every invoice and its history</span>
            </li>
            <li>
              <Link href="/admin/reports/sales-tax" className="text-bone hover:text-sky-brand">Sales &amp; Tax</Link>
              <span className="text-faint"> — reports for your accountant</span>
            </li>
          </ul>
        </section>

        {superAdmin && (
          <section className="border-line bg-ink-raised/50 rounded-2xl border p-6 lg:col-span-2" aria-labelledby="accounts-title">
            <h2 id="accounts-title" className="hud text-sky-brand">
              Admin accounts
            </h2>
            {error && (
              <p role="alert" className="text-danger mt-4 text-sm">
                {error}
              </p>
            )}
            {accounts && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-line-strong border-b text-left">
                      <th className="hud text-faint px-3 py-2 font-semibold">Name</th>
                      <th className="hud text-faint px-3 py-2 font-semibold">Username</th>
                      <th className="hud text-faint px-3 py-2 font-semibold">Role</th>
                      <th className="hud text-faint px-3 py-2 font-semibold">Status</th>
                      <th className="hud text-faint px-3 py-2 font-semibold">Last sign-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id} className="border-line border-b last:border-0">
                        <td className="text-bone px-3 py-2.5">{a.displayName}</td>
                        <td className="text-mute px-3 py-2.5">{a.username}</td>
                        <td className="text-mute px-3 py-2.5">{a.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}</td>
                        <td className={`px-3 py-2.5 ${a.enabled ? "text-good" : "text-faint"}`}>{a.enabled ? "Active" : "Disabled"}</td>
                        <td className="text-mute px-3 py-2.5">
                          {a.lastLoginAt
                            ? new Date(a.lastLoginAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
