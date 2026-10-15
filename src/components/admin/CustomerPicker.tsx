"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { customerOptions, type CustomerOption } from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

export type CustomerChoice = {
  /** An existing customer, when one has been chosen. */
  customerId: string | null
  name: string
  phone: string
  email: string
}

/**
 * Chooses the customer a project belongs to: an existing one, found by name, phone or
 * email — or a new one, created with the project.
 *
 * Choosing is the point. Typing a returning customer's name instead of choosing them is
 * how duplicate customers start, so matches are offered as soon as the name is typed.
 */
export function CustomerPicker({
  value,
  onChange,
  error,
}: {
  value: CustomerChoice
  onChange: (next: CustomerChoice) => void
  error?: string
}) {
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)

  // matches for what has been typed, a moment after typing stops
  useEffect(() => {
    if (value.customerId) return
    const q = value.name.trim()
    if (q.length < 2) {
      setOptions([])
      return
    }
    let live = true
    const t = setTimeout(() => {
      customerOptions(q)
        .then((found) => {
          if (!live) return
          setOptions(found)
          setActive(0)
        })
        .catch(() => live && setOptions([]))
    }, 200)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [value.name, value.customerId])

  // a click elsewhere closes the list
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  function choose(option: CustomerOption) {
    onChange({ customerId: option.id, name: option.name, phone: option.phone ?? "", email: option.email ?? "" })
    setOpen(false)
  }

  if (value.customerId) {
    return (
      <div className="border-sky-brand/40 bg-ink/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div className="min-w-0">
          <p className="text-bone font-medium">{value.name}</p>
          <p className="text-mute mt-0.5 break-words text-sm">
            {[value.phone, value.email].filter(Boolean).join(" · ") || "No phone or email on file"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/customers/${value.customerId}`}
            target="_blank"
            className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors"
          >
            Customer details
          </Link>
          <button
            type="button"
            onClick={() => onChange({ customerId: null, name: "", phone: "", email: "" })}
            className="hud border-line-strong text-mute hover:text-bone rounded-lg border px-3 py-2 transition-colors"
          >
            Change customer
          </button>
        </div>
      </div>
    )
  }

  const showList = open && options.length > 0

  return (
    <div ref={box} className="relative">
      <label className="block space-y-2" htmlFor="customer-search">
        <span className="hud text-faint block">
          Customer <span className="text-danger">*</span>
        </span>
        <input
          id="customer-search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          className={inputClass}
          placeholder="Search by name, phone or email — or type a new customer's name"
          value={value.name}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange({ ...value, name: e.target.value })
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!showList) return
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, options.length - 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === "Enter") {
              e.preventDefault()
              choose(options[active])
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
        />
      </label>
      {error && <p className="text-danger mt-1 text-xs">{error}</p>}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="border-line-strong bg-ink-raised absolute z-30 mt-1 w-full overflow-hidden rounded-xl border shadow-2xl"
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(o)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-4 py-3 ${i === active ? "bg-sky-brand/15" : ""}`}
            >
              <p className="text-bone text-sm font-medium">{o.name}</p>
              <p className="text-mute text-xs">
                {[o.phone, o.email].filter(Boolean).join(" · ") || "No contact details"} · {o.projectCount}{" "}
                {o.projectCount === 1 ? "project" : "projects"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {value.name.trim().length > 0 && (
        <div className="border-line mt-4 rounded-xl border border-dashed p-4">
          <p className="text-mute text-xs leading-[1.6]">
            {options.length > 0
              ? "Choose an existing customer above, or keep typing to create a new one with this project."
              : "A new customer will be created with this project."}
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2" htmlFor="new-customer-phone">
              <span className="hud text-faint block">New customer&rsquo;s phone</span>
              <input
                id="new-customer-phone"
                className={inputClass}
                value={value.phone}
                onChange={(e) => onChange({ ...value, phone: e.target.value })}
              />
            </label>
            <label className="block space-y-2" htmlFor="new-customer-email">
              <span className="hud text-faint block">New customer&rsquo;s email</span>
              <input
                id="new-customer-email"
                type="email"
                className={inputClass}
                value={value.email}
                onChange={(e) => onChange({ ...value, email: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
