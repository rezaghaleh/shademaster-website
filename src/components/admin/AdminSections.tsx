import {
  BellRing,
  ChartColumnBig,
  FilePlus2,
  FolderOpen,
  ReceiptText,
  Ruler,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

/** The admin's main areas, as the home page shows them. One list, so the cards stay in step. */
export type AdminSection = {
  href: string
  title: string
  description: string
  Icon: LucideIcon
  /** Shows the number of unpaid invoices beside it. */
  reminders?: boolean
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin/projects", title: "Projects", description: "View and manage existing projects", Icon: FolderOpen },
  { href: "/admin/new", title: "New project", description: "Create a new customer project", Icon: FilePlus2 },
  {
    href: "/admin/customers",
    title: "Customers",
    description: "Customer history, projects, invoices and balances",
    Icon: UsersRound,
  },
  { href: "/admin/measurement", title: "Measurement", description: "Create and manage measurement sheets", Icon: Ruler },
  { href: "/admin/invoices", title: "Invoices", description: "Every invoice, its status and its payments", Icon: ReceiptText },
  {
    href: "/admin/reminders",
    title: "Payment reminders",
    description: "Customers with unpaid balances",
    Icon: BellRing,
    reminders: true,
  },
  { href: "/admin/reports/sales-tax", title: "Sales & Tax", description: "Sales and tax reports for any period", Icon: ChartColumnBig },
  { href: "/admin/administration", title: "Admin", description: "Your account and the admin accounts", Icon: ShieldCheck },
]
