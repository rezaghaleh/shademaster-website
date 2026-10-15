import { money, type InvoiceView } from "@/lib/admin-api"

/**
 * The invoice as the customer sees it — the same document as the PDF, on screen.
 *
 * It reads only customer-facing fields: the customer descriptions of the lines (never the
 * internal ones with measurements and brands), the fees, discounts and taxes, and whether
 * it is paid. The payment method, references, internal notes and history are elsewhere
 * on the admin page and are not part of this component, so printing it prints none of
 * them.
 *
 * Always black on white, like the paper it stands for, whatever the admin theme.
 */
export function CustomerInvoicePreview({ invoice }: { invoice: InvoiceView }) {
  const fmt = (v: number) => money(v, invoice.currency)
  const issuer = invoice.issuer
  const contact = [issuer.addressLine, issuer.phone, issuer.email, issuer.website].filter(Boolean)
  const voided = invoice.status === "VOID"
  const state = voided ? "UNPAID" : invoice.paymentStatus

  return (
    <article className="invoice-paper rounded-xl bg-white p-6 text-[#1A2233] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] sm:p-10">
      {/* masthead: logo above the company name, as on the PDF */}
      <header className="border-b-2 border-[#061D3F] pb-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- the printed invoice, not optimised */}
        <img src="/shademaster-logo.png" alt="" className="mx-auto mb-2 w-24 [filter:brightness(1.07)]" />
        <p className="text-xl font-bold tracking-tight text-[#061D3F]">{issuer.name}</p>
        {issuer.tagline && (
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.1em] text-[#0369A1]">{issuer.tagline}</p>
        )}
        {contact.length > 0 && <p className="mt-2 text-xs text-[#4A5568]">{contact.join("  ·  ")}</p>}
        {issuer.taxNumber && <p className="mt-1 text-xs text-[#5B6577]">GST/BN {issuer.taxNumber}</p>}
      </header>

      {!invoice.invoiceNumber && (
        <p className="mt-5 border border-[#E8B778] bg-[#FFF4E5] px-3 py-2 text-xs font-bold text-[#7A4A12]">
          DRAFT — this invoice has not been issued and has no invoice number yet.
        </p>
      )}
      {voided && (
        <p className="mt-5 border border-[#E3A1A1] bg-[#FDECEC] px-3 py-2 text-xs font-bold text-[#8A1F1F]">
          VOID — this invoice has been cancelled.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-3xl font-bold uppercase tracking-tight text-[#061D3F]">Invoice</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-[#0369A1]">
            {invoice.invoiceNumber ?? "DRAFT — not yet issued"}
            {state === "PAID" && (
              <span className="border-[1.5px] border-[#15803D] px-2 py-0.5 text-xs text-[#15803D]">PAID</span>
            )}
            {state === "PARTIALLY_PAID" && (
              <span className="border-[1.5px] border-[#B45309] px-2 py-0.5 text-xs text-[#B45309]">PARTIALLY PAID</span>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
          <dt className="text-[#5B6577]">Issued</dt>
          <dd className="text-right">{formatLongDate(invoice.issuedOn)}</dd>
          <dt className="text-[#5B6577]">Due</dt>
          <dd className="text-right">{formatLongDate(invoice.dueOn)}</dd>
          <dt className="text-[#5B6577]">Project</dt>
          <dd className="text-right">{invoice.projectName}</dd>
          <dt className="text-[#5B6577]">Currency</dt>
          <dd className="text-right">{invoice.currency}</dd>
        </dl>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#5B6577]">Billed to</p>
          <p className="mt-1 font-bold text-[#061D3F]">{invoice.customerName}</p>
          {invoice.customerAddress && <p className="text-sm text-[#4A5568]">{invoice.customerAddress}</p>}
          {invoice.customerPhone && <p className="text-sm text-[#4A5568]">{invoice.customerPhone}</p>}
          {invoice.customerEmail && <p className="text-sm text-[#4A5568]">{invoice.customerEmail}</p>}
        </div>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#5B6577]">From</p>
          <p className="mt-1 font-bold text-[#061D3F]">{issuer.name}</p>
          {issuer.addressLine && <p className="text-sm text-[#4A5568]">{issuer.addressLine}</p>}
          {issuer.phone && <p className="text-sm text-[#4A5568]">{issuer.phone}</p>}
          {issuer.email && <p className="text-sm text-[#4A5568]">{issuer.email}</p>}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#061D3F] text-left text-[0.65rem] uppercase tracking-[0.12em] text-[#F8F8F8]">
              <th className="px-3 py-2 font-bold">Description</th>
              <th className="w-[8%] px-3 py-2 text-right font-bold">Qty</th>
              <th className="w-[18%] px-3 py-2 text-right font-bold">Unit</th>
              <th className="w-[20%] px-3 py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((line, i) => (
              <tr key={line.id} className={i % 2 === 1 ? "bg-[#FAFBFD]" : ""}>
                {/* the customer description only — never the internal one */}
                <td className="border-b border-[#DDE3EC] px-3 py-2.5 font-bold text-[#061D3F]">
                  {line.customerDescription}
                </td>
                <td className="border-b border-[#DDE3EC] px-3 py-2.5 text-right tabular-nums">{line.quantity}</td>
                <td className="border-b border-[#DDE3EC] px-3 py-2.5 text-right tabular-nums">{fmt(line.unitPrice)}</td>
                <td className="border-b border-[#DDE3EC] px-3 py-2.5 text-right tabular-nums">{fmt(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_minmax(0,22rem)]">
        <div>
          {invoice.notes && (
            <div className="border-l-[3px] border-[#0EA5E9] bg-[#F8F8F8] px-4 py-3 text-sm text-[#4A5568]">
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#5B6577]">Notes</p>
              <p className="whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Subtotal" value={fmt(invoice.subtotal)} />
            {invoice.fees.map((f) => (
              <Row
                key={f.id}
                label={`${f.label}${f.taxable ? "" : " (not taxed)"}`}
                value={fmt(f.amount)}
              />
            ))}
            {invoice.taxes.length === 0 ? (
              <Row label="Tax" value={fmt(0)} rule />
            ) : (
              invoice.taxes.map((t, i) => (
                <Row key={t.id} label={`${t.label} (${trimRate(t.ratePercent)}%)`} value={fmt(t.amount)} rule={i === 0} />
              ))
            )}
            {state === "UNPAID" ? (
              <Row label={voided ? "Total" : "Amount due"} value={fmt(invoice.grandTotal)} grand />
            ) : (
              <>
                <Row label="Total" value={fmt(invoice.grandTotal)} rule />
                <Row label="Paid" value={fmt(-invoice.paidTotal)} />
                <Row label="Balance due" value={fmt(invoice.balanceDue)} grand />
              </>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-8 border-t border-[#DDE3EC] pt-3 text-xs text-[#5B6577]">
        <p>
          {issuer.name}
          {issuer.tagline ? ` — ${issuer.tagline}` : ""}
        </p>
        <p>Thank you for your business.</p>
      </footer>
    </article>
  )
}

function Row({ label, value, rule, grand }: { label: string; value: string; rule?: boolean; grand?: boolean }) {
  return (
    <tr className={grand ? "border-t-2 border-[#061D3F]" : rule ? "border-t border-[#DDE3EC]" : ""}>
      <td className={`px-2 py-1.5 text-right ${grand ? "text-base font-bold text-[#061D3F]" : "text-[#4A5568]"}`}>
        {label}
      </td>
      <td className={`w-[42%] px-2 py-1.5 text-right font-bold tabular-nums ${grand ? "text-base text-[#061D3F]" : ""}`}>
        {value}
      </td>
    </tr>
  )
}

function trimRate(rate: number) {
  return String(Number(rate))
}

/** A date-only ISO string, read as a calendar date — never shifted by the time zone. */
export function formatLongDate(iso?: string | null) {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
}

export function formatShortDate(iso?: string | null) {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
}
