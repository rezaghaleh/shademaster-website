"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ProjectForm } from "@/components/admin/ProjectForm"
import { InvoicePanel } from "@/components/admin/InvoicePanel"
import {
  ApiError,
  deleteProject,
  getProject,
  money,
  updateProject,
  type ProjectView,
} from "@/lib/admin-api"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [project, setProject] = useState<ProjectView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      setProject(await getProject(id))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this project")
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function remove() {
    const hasInvoices = (project?.invoiceCount ?? 0) > 0
    const warning = hasInvoices
      ? `Delete "${project?.projectName}" permanently?\n\nIt has ${project?.invoiceCount} invoice(s). They will be kept — each holds its own copy of the customer and line items — but they will no longer link back to a project.`
      : `Delete "${project?.projectName}" permanently? This cannot be undone.`
    if (!window.confirm(warning)) return

    try {
      // The API refuses without force when issued invoices exist; the dialog
      // above is the confirmation that justifies passing it.
      await deleteProject(id, true)
      router.push("/admin")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this project")
    }
  }

  if (error && !project) {
    return (
      <div className="shell py-14">
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <Link href="/admin" className="btn btn-ghost mt-6">
          Back to projects
        </Link>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="shell py-14">
        <p className="hud text-faint">Loading…</p>
      </div>
    )
  }

  return (
    <div className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="hud text-faint">
        <Link href="/admin" className="hover:text-bone transition-colors">
          Projects
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mute">{project.projectName}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="display text-bone text-[clamp(30px,4vw,52px)]">
            {project.projectName}
          </h1>
          <p className="text-mute mt-3">
            {project.customerName}
            {project.city && <span className="text-faint"> · {project.city}</span>}
          </p>
          <p className="text-faint mt-1 text-sm">
            {[project.phone, project.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="btn btn-ghost"
          >
            {editing ? "Cancel edit" : "Edit"}
          </button>
          <button
            type="button"
            onClick={remove}
            className="hud rounded-lg border border-red-400/40 px-4 py-2.5 text-red-400 transition-colors hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>
      </header>

      {saved && (
        <p role="status" className="text-sky-brand mt-6 text-sm">
          Saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-8">
          <ProjectForm
            submitLabel="Save changes"
            initial={{
              projectName: project.projectName,
              customerName: project.customerName,
              addressLine1: project.addressLine1 ?? "",
              addressLine2: project.addressLine2 ?? "",
              city: project.city ?? "",
              province: project.province ?? "",
              postalCode: project.postalCode ?? "",
              phone: project.phone ?? "",
              email: project.email ?? "",
              notes: project.notes ?? "",
              items: project.items.map((i) => ({
                width: i.width,
                height: i.height,
                quantity: i.quantity,
                productType: i.productType,
                motorized: i.motorized,
                label: i.label ?? "",
                blindBrand: i.blindBrand ?? "",
                motorBrand: i.motorBrand ?? "",
                // Keep an existing manual price when re-opening for edit;
                // a line without one stays on the calculated price.
                unitPriceOverride:
                  i.unitPriceOverride == null ? null : Number(i.unitPriceOverride),
              })),
            }}
            onSubmit={async (values) => {
              setProject(await updateProject(id, values))
              setEditing(false)
              setSaved(true)
              setTimeout(() => setSaved(false), 2500)
            }}
          />
        </div>
      ) : (
        <>
          <section
            className="border-line bg-ink-raised/50 mt-8 rounded-2xl border p-6"
            aria-labelledby="quote-title"
          >
            <h2 id="quote-title" className="hud text-sky-brand">
              Quote
            </h2>

            {project.items.length === 0 ? (
              <p className="text-faint mt-5 text-sm">
                No windows on this project yet. Use Edit to add some.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {project.items.map((item) => (
                  <li
                    key={item.id}
                    className="border-line flex flex-wrap items-baseline justify-between gap-3 border-b pb-3 last:border-0"
                  >
                    <span className="text-bone text-sm">
                      {/* the internal line: measurements and brands are fine here,
                          this screen is admin-only. The invoice uses
                          customerDescription instead. */}
                      {item.description}
                      {item.priceOverridden && (
                        <span className="hud text-sky-brand ml-2">manual price</span>
                      )}
                    </span>
                    <span className="text-mute text-sm tabular-nums">
                      {item.priceOverridden && (
                        <span className="text-faint mr-2 line-through">
                          {money(item.calculatedUnitPrice)}
                        </span>
                      )}
                      {item.quantity} × {money(item.unitPrice)}
                      <span className="text-bone ml-4 font-semibold">
                        {money(item.lineTotal)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-line mt-5 flex items-center justify-between border-t pt-5">
              <span className="hud text-faint">
                Subtotal · {project.totals.shadeCount} shade
                {project.totals.shadeCount === 1 ? "" : "s"}
              </span>
              <span className="display text-bone text-[clamp(24px,3vw,36px)] tabular-nums">
                {money(project.totals.subtotal, project.totals.currency)}
              </span>
            </div>

            <p className="text-faint mt-4 text-xs leading-[1.6]">
              Calculated with the same formula as the public pre-quote calculator.
              Tax is not included here — it is applied when an invoice is created.
            </p>
          </section>

          <InvoicePanel
            projectId={project.id}
            canInvoice={project.items.length > 0}
            onChanged={load}
          />
        </>
      )}
    </div>
  )
}
