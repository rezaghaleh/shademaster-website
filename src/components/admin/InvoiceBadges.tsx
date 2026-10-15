import type { InvoiceStatus, PaymentStatus } from "@/lib/admin-api"

/**
 * The two separate facts about an invoice, as two separate badges: where the document
 * stands (draft, issued, sent, void) and whether it has been paid.
 */

const DOC_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: "border-line-strong text-mute",
  ISSUED: "border-sky-brand/50 text-sky-brand",
  SENT: "border-sky-brand/50 text-sky-brand",
  VOID: "border-danger/50 text-danger",
}

const DOC_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SENT: "Sent",
  VOID: "Void",
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  PAID: "border-good/60 bg-good/10 text-good",
  PARTIALLY_PAID: "border-pending/60 text-pending",
  UNPAID: "border-line-strong text-mute",
}

const PAY_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  UNPAID: "Unpaid",
}

export function docStatusLabel(status: InvoiceStatus) {
  return DOC_LABEL[status]
}

export function paymentStatusLabel(status: PaymentStatus) {
  return PAY_LABEL[status]
}

/** How long a balance has been waiting, for the reminder lists. */
export function unpaidAge(days: number) {
  if (days <= 0) return "Issued today"
  return `${days} ${days === 1 ? "day" : "days"} unpaid`
}

export function DocStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`hud inline-flex items-center rounded-full border px-2.5 py-1 ${DOC_STYLE[status]}`}>
      {DOC_LABEL[status]}
    </span>
  )
}

/** A customer's standing across their invoices; "No invoices" before the first is issued. */
export function CustomerStatusBadge({ status }: { status: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "NONE" }) {
  if (status === "NONE") {
    return <span className="hud border-line-strong text-faint inline-flex rounded-full border px-2.5 py-1">No invoices</span>
  }
  return (
    <span className={`hud inline-flex items-center rounded-full border px-2.5 py-1 font-bold ${PAY_STYLE[status]}`}>
      {PAY_LABEL[status]}
    </span>
  )
}

/** Not shown for drafts and void invoices — neither is asking to be paid. */
export function PaymentBadge({ status, docStatus }: { status: PaymentStatus; docStatus?: InvoiceStatus }) {
  if (docStatus === "DRAFT" || docStatus === "VOID") return null
  return (
    <span className={`hud inline-flex items-center rounded-full border px-2.5 py-1 font-bold ${PAY_STYLE[status]}`}>
      {PAY_LABEL[status]}
    </span>
  )
}
