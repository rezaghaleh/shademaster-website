import { money, type ProjectFinancials } from "@/lib/admin-api"

/**
 * What the project costs you against what the customer pays, and the profit between.
 *
 * Admin only: never part of an invoice, and hidden when a project page is printed.
 */
export function ProjectFinancialSummary({ financials: f, markup }: {
  financials: ProjectFinancials
  markup: string | number
}) {
  const projectMarkup = Number.isFinite(Number(markup)) ? Number(Number(markup).toFixed(3)) : 0
  return (
    <section className="border-line bg-ink-raised/50 mt-6 rounded-2xl border p-6 print:hidden" aria-label="Internal financials">
      <h2 className="hud text-sky-brand">Internal financials</h2>
      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-5" aria-live="polite">
        <div><dt className="hud text-faint">Total cost</dt><dd className="mt-2 text-bone tabular-nums">{money(f.totalCost)}</dd></div>
        <div><dt className="hud text-faint">Customer price</dt><dd className="mt-2 text-bone tabular-nums">{money(f.revenue)}</dd></div>
        <div><dt className="hud text-sky-brand">Gross profit</dt><dd className={`mt-2 text-xl font-semibold tabular-nums ${Number(f.grossProfit) < 0 ? "text-danger" : "text-sky-brand"}`}>{money(f.grossProfit)}</dd></div>
        <div><dt className="hud text-faint">Profit margin</dt><dd className="mt-2 text-bone tabular-nums">{Number(f.profitMarginPercent).toFixed(2)}%</dd></div>
        <div><dt className="hud text-faint">Project markup</dt><dd className="mt-2 text-bone tabular-nums">{projectMarkup}%</dd></div>
      </dl>
      <p className="mt-4 text-xs text-faint">
        Each window&rsquo;s cost is calculated from its measurements unless a supplier cost is entered.
        Profit is the customer price minus that cost, before invoice fees and taxes. Private — never on the invoice.
      </p>
    </section>
  )
}
