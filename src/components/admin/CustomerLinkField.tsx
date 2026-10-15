"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { customerOptions, type CustomerOption } from "@/lib/admin-api"

const inputClass =
  "border-line-strong bg-ink text-bone placeholder:text-faint focus-visible:border-sky-brand h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors"

/**
 * An optional link to an existing customer — for a measurement sheet, which is often
 * filled in on site before the job is anyone's project. Chooses only from existing
 * customers; it never creates one.
 */
export function CustomerLinkField({
  value,
  onChange,
}: {
  value: { id: string; name: string } | null
  onChange: (next: { id: string; name: string } | null) => void
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<CustomerOption[]>([])
  const [open, setOpen] = useState(false)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setOptions([])
      return
    }
    const t = setTimeout(() => {
      customerOptions(query.trim()).then(setOptions).catch(() => setOptions([]))
    }, 200)
    return () => clearTimeout(t)
  }, [query, value])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  if (value) {
    return (
      <div className="space-y-2">
        <span className="hud text-faint block">Customer</span>
        <div className="border-line-strong flex h-11 items-center justify-between gap-2 rounded-lg border px-3">
          <Link href={`/admin/customers/${value.id}`} className="text-bone hover:text-sky-brand truncate text-sm">
            {value.name}
          </Link>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="hud text-faint hover:text-bone shrink-0"
            aria-label={`Unlink ${value.name}`}
          >
            Unlink
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={box} className="relative space-y-2">
      <label className="hud text-faint block" htmlFor={`${listId}-input`}>
        Customer (optional)
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className={inputClass}
        placeholder="Link to an existing customer"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="border-line-strong bg-ink-raised absolute z-30 mt-1 w-full overflow-hidden rounded-xl border shadow-2xl"
        >
          {options.map((o) => (
            <li
              key={o.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange({ id: o.id, name: o.name })
                setQuery("")
                setOpen(false)
              }}
              className="hover:bg-sky-brand/15 cursor-pointer px-4 py-2.5"
            >
              <span className="text-bone block text-sm">{o.name}</span>
              <span className="text-mute block text-xs">{[o.phone, o.email].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
