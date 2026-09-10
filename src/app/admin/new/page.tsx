"use client"

import { useRouter } from "next/navigation"
import { ProjectForm } from "@/components/admin/ProjectForm"
import { createProject } from "@/lib/admin-api"

export default function NewProjectPage() {
  const router = useRouter()

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

      <div className="mt-8">
        <ProjectForm
          submitLabel="Create project"
          onSubmit={async (values) => {
            const created = await createProject(values)
            router.push(`/admin/projects/${created.id}`)
          }}
        />
      </div>
    </div>
  )
}
