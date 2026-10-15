"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProjectForm, type ProjectFormValues } from "@/components/admin/ProjectForm"
import { ApiError, createProject, getCustomer } from "@/lib/admin-api"

export default function NewProjectPage() {
  const router = useRouter()
  // Opened from a customer's page (?customerId=…): the form starts with them chosen.
  const [initial, setInitial] = useState<ProjectFormValues | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const customerId = new URLSearchParams(window.location.search).get("customerId")
    if (!customerId) {
      setInitial(null)
      return
    }
    getCustomer(customerId)
      .then((c) =>
        setInitial({
          projectName: "",
          customerId: c.id,
          customerName: c.name,
          phone: c.phone ?? "",
          email: c.email ?? "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          province: "",
          postalCode: "",
          notes: "",
          items: [],
        })
      )
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load that customer")
        setInitial(null)
      })
  }, [])

  return (
    <div className="shell py-10 md:py-14">
      <header>
        <p className="hud text-faint">New</p>
        <h1 className="display text-bone mt-3 text-[clamp(30px,4vw,52px)]">
          Create a project
        </h1>
        <p className="text-mute mt-4 max-w-2xl text-sm leading-[1.65]">
          Saved projects are permanent — nothing expires or is cleaned up
          automatically. A project stays until someone deletes it explicitly.
        </p>
      </header>

      {error && (
        <p role="alert" className="text-danger mt-6 text-sm">
          {error}
        </p>
      )}

      <div className="mt-8">
        {initial === undefined ? (
          <p className="hud text-faint">Loading…</p>
        ) : (
          <ProjectForm
            initial={initial ?? undefined}
            submitLabel="Create project"
            onSubmit={async (values) => {
              const created = await createProject(values)
              router.push(`/admin/projects/${created.id}`)
            }}
          />
        )}
      </div>
    </div>
  )
}
