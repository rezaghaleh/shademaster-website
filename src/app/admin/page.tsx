"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ApiError,
  listProjects,
  money,
  type Page,
  type ProjectSummary,
} from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function AdminProjectsPage() {
  const [query, setQuery] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<ProjectSummary> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(
        await listProjects({
          query: query.trim() || undefined,
          // <input type="date"> gives a plain date; the API filters on an
          // instant, so widen to the whole day in the browser's timezone.
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
          page,
          size: 20,
        })
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load projects")
    } finally {
      setLoading(false)
    }
  }, [query, from, to, page])

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(0)
  }, [query, from, to])

  return (
    <div className="shell py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="hud text-faint">Saved quotes</p>
          <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">
            Projects
          </h1>
        </div>
        <Link href="/admin/new" className="btn btn-primary">
          New project
        </Link>
      </header>

      <section
        className="border-line bg-ink-raised/50 mt-8 grid gap-4 rounded-2xl border p-5 md:grid-cols-[2fr_1fr_1fr]"
        aria-label="Search and filter"
      >
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            className={inputClass}
            placeholder="Customer, project, email or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="from">
            Created from
          </label>
          <input
            id="from"
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="hud text-faint block" htmlFor="to">
            Created to
          </label>
          <input
            id="to"
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {error}
        </p>
      )}

      <section className="mt-8" aria-label="Results" aria-busy={loading}>
        {data && data.content.length === 0 && !loading ? (
          <p className="text-faint text-sm">
            {query || from || to
              ? "No projects match those filters."
              : "No projects yet. Create the first one."}
          </p>
        ) : (
          <ul className="space-y-3">
            {data?.content.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="border-line bg-ink-raised/50 hover:border-sky-brand/40 grid gap-3 rounded-xl border p-4 transition-colors md:grid-cols-[2fr_1.4fr_auto_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-bone font-medium">{p.projectName}</p>
                    <p className="text-mute mt-1 text-sm">{p.customerName}</p>
                  </div>
                  <div className="text-mute text-sm">
                    {p.city && <span>{p.city}</span>}
                    {p.email && <span className="text-faint block text-xs">{p.email}</span>}
                  </div>
                  <span className="hud text-faint">
                    {p.itemCount} {p.itemCount === 1 ? "window" : "windows"}
                  </span>
                  <span className="hud text-faint">
                    {p.invoiceCount > 0
                      ? `${p.invoiceCount} invoice${p.invoiceCount === 1 ? "" : "s"}`
                      : "no invoice"}
                  </span>
                  <div className="md:text-right">
                    <p className="text-bone font-semibold tabular-nums">
                      {money(p.subtotal)}
                    </p>
                    <p className="hud text-faint mt-1">{formatDate(p.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <nav
            className="border-line mt-6 flex items-center justify-between border-t pt-5"
            aria-label="Pagination"
          >
            <button
              type="button"
              className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 disabled:opacity-40"
              disabled={data.first}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
            >
              Previous
            </button>
            <span className="hud text-faint">
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} total
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
