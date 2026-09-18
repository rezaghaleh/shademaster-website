"use client"

import { useState } from "react"
import { ApiError, login } from "@/lib/admin-api"

/**
 * Sign-in for the admin area.
 *
 * <p>There is no "create an account" link, and no password reset, because the
 * API has no public signup — accounts are provisioned by a SUPER_ADMIN or by
 * the seed migration.
 */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const inputClass =
    "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
      onSignedIn()
    } catch (err) {
      // The API deliberately gives one message for both a wrong password and an
      // unknown user, so there is nothing more specific to show here.
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reach the admin API. Is the backend running?"
      )
      setBusy(false)
    }
  }

  return (
    <main id="main" tabIndex={-1}>
      <div className="shell grid min-h-[70dvh] place-items-center py-16">
        <div className="w-full max-w-md">
          <p className="hud text-faint">ShadeMaster</p>
          <h1 className="display text-bone mt-4 text-[clamp(34px,4.8vw,58px)]">
            Admin sign in
          </h1>
          <p className="text-mute mt-4 text-sm leading-[1.65]">
            Internal tool. Accounts are created by an administrator — there is no
            self-signup.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="hud text-faint block" htmlFor="admin-username">
                Username
              </label>
              <input
                id="admin-username"
                className={inputClass}
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="hud text-faint block" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className="btn btn-primary w-full disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
