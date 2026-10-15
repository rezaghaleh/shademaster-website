/**
 * Client for the ShadeMaster admin API.
 *
 * <b>Token handling.</b> The access token is held in a module variable — in
 * memory only. It is deliberately NOT in localStorage or sessionStorage:
 * anything readable by page scripts is readable by an XSS payload, and this API
 * can issue invoices. The refresh token never reaches JavaScript at all; it
 * lives in an HttpOnly cookie the browser attaches to /api/auth requests.
 *
 * The cost of that choice is that a page reload loses the access token, so
 * `bootstrap()` silently exchanges the refresh cookie for a new one on mount.
 * Every request goes through `request()`, which retries once on a 401 after
 * refreshing — so a token expiring mid-session is invisible to the user.
 */

export const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_BASE ?? "http://localhost:8080"

/** Light or dark, saved on the account so it follows the person between devices. */
export type Theme = "LIGHT" | "DARK"

export type AdminSummary = {
  id: string
  username: string
  displayName: string
  role: "ADMIN" | "SUPER_ADMIN"
  theme: Theme
}

export type ProductType = "ROLLER" | "ZEBRA"

/** Internal project values only; never part of invoice DTOs. Before invoice fees and taxes. */
export type ProjectFinancials = {
  totalCost: string | number
  /** The selling prices × quantities: the quote subtotal. */
  revenue: string | number
  grossProfit: string | number
  /** Profit as a share of the selling price, not of the cost. */
  profitMarginPercent: string | number
}

export type LineItemView = {
  id: string
  width: number
  height: number
  /** Fractional-inch text for display, e.g. "30 1/2". */
  widthDisplay: string
  heightDisplay: string
  quantity: number
  productType: ProductType
  motorized: boolean
  label: string | null
  /** Internal only — never shown to a customer. */
  blindBrand: string | null
  /** Internal only — never shown to a customer. */
  motorBrand: string | null
  /** Full internal text, with measurements and brands. Admin screens only. */
  description: string
  /** What the invoice prints: no measurements, no brands. */
  customerDescription: string
  /** The price charged per shade — the manual price when one is set. */
  unitPrice: string
  /** The automatic price: base cost plus markup. */
  calculatedUnitPrice: string
  unitPriceOverride: string | null
  /** True only for a price typed by hand — never for an automatic markup price. */
  priceOverridden: boolean
  lineTotal: string
  /** The supplier cost entered on the window, when there is one. Internal only. */
  costPerUnit?: string | number | null
  /** What the measurements give for one shade. Internal only. */
  measurementCostPerUnit: string | number
  /** The cost actually used: the supplier cost, else the calculated one. Internal only. */
  baseCostPerUnit: string | number
  /** The window's own markup; absent when it follows the project's. */
  markupOverridePercent?: string | number | null
  effectiveMarkupPercent: string | number
  financials: ProjectFinancials
}

export type ProjectSummary = {
  id: string
  projectName: string
  /** The project's customer. Name, phone and email below are read from that record. */
  customerId: string
  customerName: string
  city: string | null
  phone: string | null
  email: string | null
  itemCount: number
  subtotal: string
  financials: ProjectFinancials
  /** Every invoice linked to the project: normally 0 or 1, more only from before the one-invoice rule. */
  invoiceCount: number
  /** The project's one invoice, once it has been created. */
  primaryInvoice?: InvoiceRef | null
  createdAt: string
  updatedAt: string
}

export type ProjectView = ProjectSummary & {
  defaultMarkupPercent: string | number
  addressLine1: string | null
  addressLine2: string | null
  province: string | null
  postalCode: string | null
  notes: string | null
  items: LineItemView[]
  totals: {
    subtotal: string
    itemCount: number
    shadeCount: number
    overriddenCount: number
    currency: string
  }
  createdBy: string | null
}

/** Where the invoice document stands. Whether it is paid is {@link PaymentStatus}, separately. */
export type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "VOID"

/** Whether the customer has paid. Never changes what the invoice charges. */
export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID"

/** Internal accounting only — never shown on anything the customer receives. */
export type PaymentMethod = "CASH" | "CHEQUE" | "E_TRANSFER" | "OTHER"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "E_TRANSFER", label: "E-Transfer" },
  { value: "OTHER", label: "Other" },
]

export type TaxCode = "GST" | "PST" | "HST" | "CUSTOM"
export type FeeKind = "FEE" | "DISCOUNT"

/** The project's invoice in brief, as shown on project screens. */
export type InvoiceRef = {
  id: string
  invoiceNumber?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  grandTotal: number
  paidTotal: number
  balanceDue: number
  currency: string
}

export type InvoiceSummary = {
  id: string
  projectId?: string | null
  customerId: string
  /** False only for older invoices kept from before each project had one invoice. */
  primary: boolean
  invoiceNumber?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  projectName: string
  customerName: string
  grandTotal: number
  paidTotal: number
  balanceDue: number
  currency: string
  issuedOn?: string | null
  dueOn?: string | null
  createdAt: string
  /** Internal: how the latest standing payment was made. */
  lastPaymentMethod?: PaymentMethod | null
}

export type InvoiceLine = {
  id: string
  /** Internal, with measurements and brands. Never on the customer invoice. */
  description: string
  /** What the customer sees. */
  customerDescription: string
  label?: string | null
  blindBrand?: string | null
  motorBrand?: string | null
  width: number
  height: number
  widthDisplay: string
  heightDisplay: string
  quantity: number
  productType: ProductType
  motorized: boolean
  unitPrice: number
  calculatedUnitPrice?: number | null
  priceOverridden: boolean
  lineTotal: number
}

export type InvoiceFee = { id: string; kind: FeeKind; label: string; amount: number; taxable: boolean }

export type InvoiceTax = {
  id: string
  code: TaxCode
  label: string
  ratePercent: number
  display: string
  amount: number
  amountOverridden: boolean
  calculatedAmount: number
}

export type InvoicePayment = {
  id: string
  method?: PaymentMethod | null
  /** For OTHER: how it was paid, in a few words. */
  methodDetail?: string | null
  /** "E-Transfer", or "Other — card terminal". */
  methodLabel: string
  paidOn: string
  amount: number
  reference?: string | null
  note?: string | null
  createdAt: string
  createdBy?: string | null
  updatedAt: string
  voided: boolean
  voidedAt?: string | null
  voidedBy?: string | null
  voidReason?: string | null
}

/** The full invoice for admin screens, internal fields included. */
export type InvoiceView = {
  id: string
  projectId?: string | null
  customerId: string
  projectExists: boolean
  primary: boolean
  invoiceNumber?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  version: number
  projectName: string
  customerName: string
  customerAddress?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  items: InvoiceLine[]
  fees: InvoiceFee[]
  taxes: InvoiceTax[]
  payments: InvoicePayment[]
  subtotal: number
  feesTotal: number
  taxableAmount: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  balanceDue: number
  overpaid: number
  currency: string
  issuedOn?: string | null
  dueOn?: string | null
  /** Printed on the customer invoice. */
  notes?: string | null
  /** Never printed. */
  internalNotes?: string | null
  sentAt?: string | null
  sentTo?: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  revisionCount: number
  /** The business the invoice is from, as printed at the top of the customer invoice. */
  issuer: InvoiceIssuer
}

export type InvoiceIssuer = {
  name: string
  tagline?: string | null
  phone?: string | null
  email?: string | null
  addressLine?: string | null
  website?: string | null
  taxNumber?: string | null
}

export type InvoiceChange ={ field: string; label: string; before?: string | null; after?: string | null }

export type InvoiceRevision = {
  id: string
  revisionNumber: number
  kind:
    | "EDITED"
    | "LINES_REFRESHED"
    | "ISSUED"
    | "SENT"
    | "VOIDED"
    | "RESTORED"
    | "PAYMENT_RECORDED"
    | "PAYMENT_EDITED"
    | "PAYMENT_VOIDED"
    | "MARKED_UNPAID"
  summary: string
  changedAt: string
  changedBy?: string | null
  changedByName?: string | null
  totalBefore?: number | null
  totalAfter?: number | null
  paymentStatusBefore?: PaymentStatus | null
  paymentStatusAfter?: PaymentStatus | null
  changes: InvoiceChange[]
}

export type Page<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/** Thrown for any non-2xx response, carrying the API's message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
    /** Set on conflicts the client can act on, e.g. CONFIRM_FINANCIAL_CHANGE. */
    public readonly code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let accessToken: string | null = null
let currentUser: AdminSummary | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeToAuth(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getCurrentUser(): AdminSummary | null {
  return currentUser
}

export function isSignedIn(): boolean {
  return accessToken !== null
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function toError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && "message" in body) {
    const b = body as { message?: string; fields?: Record<string, string>; code?: string }
    return new ApiError(status, b.message ?? `Request failed (${status})`, b.fields, b.code)
  }
  return new ApiError(status, `Request failed (${status})`)
}

/** Exchanges the HttpOnly refresh cookie for a fresh access token. */
async function refresh(): Promise<boolean> {
  const res = await fetch(`${ADMIN_API_BASE}/api/auth/refresh`, {
    method: "POST",
    // required for the browser to send (and accept) the refresh cookie
    credentials: "include",
  })
  if (!res.ok) {
    accessToken = null
    currentUser = null
    notify()
    return false
  }
  const body = (await parse(res)) as { accessToken: string; user: AdminSummary }
  accessToken = body.accessToken
  currentUser = body.user
  notify()
  return true
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retryOn401 = true
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)

  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })

  // A 401 mid-session usually just means the 15-minute access token expired.
  // Refresh once and replay, so it never surfaces to the user.
  if (res.status === 401 && retryOn401) {
    if (await refresh()) return request<T>(path, init, false)
  }

  if (!res.ok) throw toError(res.status, await parse(res))
  return (await parse(res)) as T
}

// --------------------------------------------------------------------- auth

export async function login(username: string, password: string): Promise<AdminSummary> {
  const res = await fetch(`${ADMIN_API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw toError(res.status, await parse(res))

  const body = (await parse(res)) as { accessToken: string; user: AdminSummary }
  accessToken = body.accessToken
  currentUser = body.user
  notify()
  return body.user
}

/**
 * Records the interface this account prefers.
 *
 * <p>The response is the updated account, which is kept as the current user so every
 * subscriber sees the new theme without a refetch. Saved server-side on purpose: a
 * localStorage-only choice would leave the same person with three different interfaces
 * on three devices.
 */
export async function setTheme(theme: Theme): Promise<AdminSummary> {
  const user = await request<AdminSummary>("/api/auth/me/theme", {
    method: "PUT",
    body: JSON.stringify({ theme }),
  })
  currentUser = user
  notify()
  return user
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${ADMIN_API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
  } finally {
    accessToken = null
    currentUser = null
    notify()
  }
}

/**
 * Restores a session after a page reload. Returns false when there is no valid
 * refresh cookie, which is the signal to show the login screen.
 */
export async function bootstrap(): Promise<boolean> {
  if (accessToken) return true
  return refresh()
}

// ----------------------------------------------------------------- projects

export type ProjectSearch = {
  query?: string
  from?: string
  to?: string
  page?: number
  size?: number
  sort?: string
  direction?: "asc" | "desc"
}

export function listProjects(params: ProjectSearch = {}): Promise<Page<ProjectSummary>> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
  }
  const qs = q.toString()
  return request<Page<ProjectSummary>>(`/api/projects${qs ? `?${qs}` : ""}`)
}

export function getProject(id: string): Promise<ProjectView> {
  return request<ProjectView>(`/api/projects/${id}`)
}

export type LineItemInput = {
  /** Decimal inches. The UI enters fractions and converts before sending. */
  width: number
  height: number
  quantity: number
  productType: ProductType
  motorized: boolean
  label?: string | null
  /** Internal only — never reaches the customer invoice. */
  blindBrand?: string | null
  /** Internal only — never reaches the customer invoice. */
  motorBrand?: string | null
  /**
   * Manually agreed price per shade for this line. Null uses the automatic price,
   * cost plus markup. Scoped to this quote only; it never changes the pricing rates.
   */
  unitPriceOverride?: number | null
  /** The supplier's cost for the whole shade, motor included. Null uses the cost calculated from the measurements. */
  costPerUnit?: number | null
  /** Null inherits the project's current markup. Zero is a valid custom markup. */
  markupOverridePercent?: number | null
}

export type ProjectInput = {
  projectName: string
  defaultMarkupPercent?: number | null
  /** An existing customer… */
  customerId?: string | null
  /** …or a new one, created with the project. Ignored when customerId is set. */
  customerName?: string | null
  phone?: string | null
  email?: string | null
  /** The site address: where the shades are for. */
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  notes?: string | null
  items: LineItemInput[]
  /** Confirms a new customer may share an existing customer's name. */
  createNewCustomer?: boolean
}

export function createProject(input: ProjectInput): Promise<ProjectView> {
  return request<ProjectView>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export type PricingRates = { rollerRate: number; zebraRate: number; motorSurcharge: number }

export function getPricingRates(): Promise<PricingRates> {
  return request<PricingRates>("/api/pricing/rates")
}

export function updateProject(id: string, input: ProjectInput): Promise<ProjectView> {
  return request<ProjectView>(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

/** Permanent. `force` is required when issued invoices reference the project. */
export function deleteProject(id: string, force = false): Promise<void> {
  return request<void>(`/api/projects/${id}${force ? "?force=true" : ""}`, {
    method: "DELETE",
  })
}

// ----------------------------------------------------------------- invoices

/** Passes a result through and tells every subscribed screen that balances may have moved. */
function changed<T>(result: Promise<T>): Promise<T> {
  return result.then((value) => {
    notifyInvoicesChanged()
    return value
  })
}

/** Codes the API attaches to a 409 the client should react to. */
export const CONFIRM_FINANCIAL_CHANGE = "CONFIRM_FINANCIAL_CHANGE"
export const STALE_VERSION = "STALE_VERSION"

export function listProjectInvoices(projectId: string): Promise<InvoiceSummary[]> {
  return request<InvoiceSummary[]>(`/api/projects/${projectId}/invoices`)
}

/**
 * Creates the project's invoice, or returns the one it already has — a second click
 * lands on the same invoice, never a duplicate.
 */
export function createInvoice(projectId: string): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/projects/${projectId}/invoices`, {
    method: "POST",
    body: JSON.stringify({}),
  }))
}

export type InvoiceSearch = {
  query?: string
  status?: InvoiceStatus
  paymentStatus?: PaymentStatus
  page?: number
  size?: number
}

export function listInvoices(params: InvoiceSearch = {}): Promise<Page<InvoiceSummary>> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
  }
  const qs = q.toString()
  return request<Page<InvoiceSummary>>(`/api/invoices${qs ? `?${qs}` : ""}`)
}

export function getInvoice(id: string): Promise<InvoiceView> {
  return request<InvoiceView>(`/api/invoices/${id}`)
}

export function getInvoiceRevisions(id: string): Promise<InvoiceRevision[]> {
  return request<InvoiceRevision[]>(`/api/invoices/${id}/revisions`)
}

export type FeeInput = { kind: FeeKind; label: string; amount: number; taxable: boolean }
export type TaxInput = { code: TaxCode; label?: string; ratePercent: number; amount?: number | null }

export type InvoiceUpdate = {
  version: number
  projectName: string
  customerName: string
  customerAddress?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  items: { id: string; customerDescription: string; quantity: number; unitPrice: number }[]
  fees: FeeInput[]
  taxes: TaxInput[]
  issuedOn?: string | null
  dueOn?: string | null
  notes?: string | null
  internalNotes?: string | null
  confirmFinancialChange?: boolean
}

export function updateInvoice(id: string, body: InvoiceUpdate): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(body) }))
}

export function refreshInvoiceLines(
  id: string,
  version: number,
  confirmFinancialChange = false
): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${id}/refresh-lines`, {
    method: "POST",
    body: JSON.stringify({ version, confirmFinancialChange }),
  }))
}

/** Assigns the invoice number. The invoice stays editable afterwards. */
export function issueInvoice(id: string): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${id}/issue`, { method: "POST" }))
}

export function voidInvoice(id: string, version: number, reason?: string): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${id}/void`, {
    method: "POST",
    body: JSON.stringify({ version, reason }),
  }))
}

export function restoreInvoice(id: string, version: number): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({ version }),
  }))
}

/** Drafts only; an issued invoice is voided instead, so its number stays accounted for. */
export function deleteDraftInvoice(id: string): Promise<void> {
  return changed(request<void>(`/api/invoices/${id}`, { method: "DELETE" }))
}

export function emailInvoice(
  id: string,
  body: { to?: string; subject?: string; message?: string } = {}
): Promise<InvoiceView> {
  return request<InvoiceView>(`/api/invoices/${id}/email`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type PaymentInput = {
  version: number
  method: PaymentMethod
  /** For OTHER: how it was paid, in a few words. Internal only. */
  methodDetail?: string | null
  paidOn: string
  amount: number
  reference?: string | null
  note?: string | null
}

export function addPayment(invoiceId: string, body: PaymentInput): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  }))
}

export function updatePayment(invoiceId: string, paymentId: string, body: PaymentInput): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }))
}

export function voidPayment(
  invoiceId: string,
  paymentId: string,
  version: number,
  reason?: string
): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${invoiceId}/payments/${paymentId}/void`, {
    method: "POST",
    body: JSON.stringify({ version, reason }),
  }))
}

/** Paid back to unpaid. The payments are voided and kept as history, never deleted. */
export function markInvoiceUnpaid(invoiceId: string, version: number, reason?: string): Promise<InvoiceView> {
  return changed(request<InvoiceView>(`/api/invoices/${invoiceId}/mark-unpaid`, {
    method: "POST",
    body: JSON.stringify({ version, reason }),
  }))
}

/**
 * Downloads the PDF.
 *
 * <p>Fetched with the bearer token rather than linked to directly — a plain
 * <a href> would not carry the Authorization header and would 401.
 */
export async function downloadInvoicePdf(id: string, fileName: string): Promise<void> {
  const res = await fetch(`${ADMIN_API_BASE}/api/invoices/${id}/pdf`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: "include",
  })
  if (!res.ok) throw toError(res.status, await parse(res))

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --------------------------------------------------- measurement sheet sets

export type MeasurementMethod = "TAPE" | "LASER"
export type ContSide = "L" | "R"
export type CutFabric = "QUARTER_L" | "QUARTER_R" | "QUARTER_LR" | "CUSTOM"
export type MotorControl = "WAND" | "REMOTE"
/** ND is the tick the shop has always read; CUSTOM carries a measured size. */
export type Fascia = "ND" | "CUSTOM"

/** The cut options with the text as printed on the paper sheet. */
export const CUT_FABRIC_OPTIONS: { value: CutFabric; label: string }[] = [
  { value: "QUARTER_L", label: "1/4 L" },
  { value: "QUARTER_R", label: "1/4 R" },
  { value: "QUARTER_LR", label: "1/4 L-R" },
  { value: "CUSTOM", label: "Custom" },
]

/**
 * How many openings fit on one sheet.
 *
 * Mirrors MeasurementSheet.MAX_ROWS on the server, which is where the rule actually
 * lives — the API refuses a nineteenth row with a 409 whatever the form does. This copy
 * is only so the form can stop you before you type one, and show how many spots are left.
 */
export const MAX_OPENINGS_PER_SHEET = 18

/**
 * What prints in the title position at the top of the measurement sheet.
 *
 * HT_BLINDS is the default and what the form has always said; NONE leaves the position
 * out; CUSTOM prints whatever was typed.
 */
export type SheetTitleMode = "HT_BLINDS" | "NONE" | "CUSTOM"

export const SHEET_TITLE_OPTIONS: { value: SheetTitleMode; label: string }[] = [
  { value: "HT_BLINDS", label: "HT Blinds" },
  { value: "NONE", label: "None" },
  { value: "CUSTOM", label: "Custom" },
]

/** Matches the server's limit: long enough for a company name, short enough to fit. */
export const MAX_SHEET_TITLE_LENGTH = 60

/** The fascia options, in the order they appear on the form. */
export const FASCIA_OPTIONS: { value: Fascia; label: string }[] = [
  { value: "ND", label: "ND" },
  { value: "CUSTOM", label: "Custom" },
]

/**
 * One opening.
 *
 * <p>Fields the API leaves null are absent from the JSON entirely — it serialises with
 * non_null inclusion — so every optional field is typed as possibly undefined.
 */
export type MeasurementRowView = {
  id: string
  unit?: string
  serialNo: number
  /**
   * Inches as a decimal, the same convention as a line item: "30 1/2" is 30.5.
   * Absent on a pending opening, which has not been measured yet.
   */
  width?: number
  height?: number
  /** The same measurement as fractional inches, for display. Absent when pending. */
  widthDisplay?: string
  heightDisplay?: string
  /**
   * An opening that could not be measured on the day. It keeps its line and S.NO and
   * prints PENDING across the size columns until someone goes back.
   */
  pending: boolean
  cont?: ContSide
  omFw: boolean
  endCap: boolean
  cutFabric?: CutFabric
  cutFabricLabel?: string
  cutFabricCustom?: string
  chainLength?: number
  fascia?: Fascia
  /** The custom size in decimal inches, only with fascia "CUSTOM". */
  fasciaCustom?: number
  /** The same size as fractional inches, e.g. "10 1/2". */
  fasciaCustomDisplay?: string
  /** The FASCIA SIZE column as the shop reads it: "ND", a size, or absent. */
  fasciaSize?: string
  motorControl?: MotorControl
  notes?: string
  sortOrder: number
}

/**
 * One sheet of a set: a page of openings and nothing else.
 *
 * <p>The contractor, project, building and level, date, installer and method live on the
 * set — written once for the level, so the pages cannot disagree with one another.
 */
export type MeasurementSheetView = {
  id: string
  setId: string
  /** Which page this is, counting from 1. */
  sheetIndex: number
  /** The SHEET# box as printed: "2 of 3". Derived by the API from the set. */
  sheetNumber: string
  rows: MeasurementRowView[]
  createdAt: string
  updatedAt: string
}

/** One level's measuring, as a list shows it. */
export type MeasurementSetSummary = {
  id: string
  /** The customer the sheet is for, when it has been linked. */
  customerId?: string
  customerName?: string
  contractor?: string
  /** The PROJECT NAME box as written on the sheet — free text, not a link. */
  projectName?: string
  buildingLevel?: string
  sheetDate?: string
  measurementMethod?: MeasurementMethod
  installer?: string
  /** How many pages the level took. */
  sheetCount: number
  /** Every opening across all of them. */
  rowCount: number
  /** Openings across the set still waiting to be measured. */
  pendingCount: number
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export type MeasurementSetView = Omit<
  MeasurementSetSummary,
  "sheetCount" | "rowCount"
> & {
  notes?: string
  titleMode: SheetTitleMode
  /** The typed title; present only with titleMode "CUSTOM". */
  titleCustom?: string
  /**
   * Exactly what prints at the top of each sheet, absent for none. Worked out by the
   * server, so the print view and the downloaded PDF can never apply the rule differently.
   */
  sheetTitle?: string
  sheets: MeasurementSheetView[]
}

/** The header for a whole set: one call changes what every sheet in it prints. */
export type MeasurementSetInput = {
  /** Links the sheet to a customer; leave out to keep the link as it is. */
  customerId?: string | null
  /** True removes the link. */
  clearCustomer?: boolean
  contractor?: string | null
  projectName?: string | null
  buildingLevel?: string | null
  sheetDate?: string | null
  measurementMethod?: MeasurementMethod | null
  installer?: string | null
  notes?: string | null
  /** Leave out to keep the current title; a new set starts on HT_BLINDS. */
  titleMode?: SheetTitleMode | null
  /** Required with titleMode "CUSTOM", ignored otherwise. */
  titleCustom?: string | null
}

/**
 * A row, always sent whole.
 *
 * @param id supplied by the client so a retried create updates the row it already made
 *           rather than adding a second copy of the same window — which matters when the
 *           form is being used on a phone inside a concrete building.
 */
export type MeasurementRowInput = {
  id?: string
  unit?: string | null
  /** As written on the sheet. Null on a new row means "suggest the next one". */
  serialNo?: number | null
  /** Required unless pending; discarded by the server when pending. */
  width?: number | null
  height?: number | null
  /** True for an opening that could not be measured on the day. */
  pending?: boolean
  cont?: ContSide | null
  omFw: boolean
  endCap: boolean
  cutFabric?: CutFabric | null
  cutFabricCustom?: string | null
  chainLength?: number | null
  fascia?: Fascia | null
  /** Required with fascia "CUSTOM", ignored otherwise — the same rule as the cut. */
  fasciaCustom?: number | null
  motorControl?: MotorControl | null
  notes?: string | null
}

/** Every set, newest first. Sets are independent of projects. */
export function listMeasurementSets(): Promise<MeasurementSetSummary[]> {
  return request<MeasurementSetSummary[]>("/api/measurement-sets")
}

/** A set with every sheet in it, rows included. */
export function getMeasurementSet(id: string): Promise<MeasurementSetView> {
  return request<MeasurementSetView>(`/api/measurement-sets/${id}`)
}

/** Creates the set and its first sheet in one call. */
export function createMeasurementSet(
  input: MeasurementSetInput = {}
): Promise<MeasurementSetView> {
  return request<MeasurementSetView>("/api/measurement-sets", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/** Header fields only — the sheets and their rows are left untouched. */
export function updateMeasurementSet(
  id: string,
  input: MeasurementSetInput
): Promise<MeasurementSetView> {
  return request<MeasurementSetView>(`/api/measurement-sets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

/** Permanent. Sets never expire on their own; this is the only thing that removes one. */
export function deleteMeasurementSet(id: string): Promise<void> {
  return request<void>(`/api/measurement-sets/${id}`, { method: "DELETE" })
}

/** Adds the next sheet: same header, empty rows, next number. */
export function addSheetToSet(setId: string): Promise<MeasurementSheetView> {
  return request<MeasurementSheetView>(`/api/measurement-sets/${setId}/sheets`, {
    method: "POST",
  })
}

/** Removes one sheet and renumbers the rest. Refused for the last sheet in a set. */
export function deleteSheetFromSet(setId: string, sheetId: string): Promise<void> {
  return request<void>(`/api/measurement-sets/${setId}/sheets/${sheetId}`, {
    method: "DELETE",
  })
}

/** One sheet on its own, for a client that holds a sheet id and nothing else. */
export function getMeasurementSheet(id: string): Promise<MeasurementSheetView> {
  return request<MeasurementSheetView>(`/api/measurement-sheets/${id}`)
}

export function addMeasurementRow(
  sheetId: string,
  input: MeasurementRowInput
): Promise<MeasurementRowView> {
  return request<MeasurementRowView>(`/api/measurement-sheets/${sheetId}/rows`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/**
 * Replaces one row whole.
 *
 * <p>The whole row goes every time rather than a patch of what changed: a partial update
 * cannot tell an omitted field from one deliberately cleared, and clearing a value is an
 * ordinary edit here. Sending everything also makes an autosave retry safe to repeat.
 */
export function updateMeasurementRow(
  sheetId: string,
  rowId: string,
  input: MeasurementRowInput
): Promise<MeasurementRowView> {
  return request<MeasurementRowView>(`/api/measurement-sheets/${sheetId}/rows/${rowId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function deleteMeasurementRow(sheetId: string, rowId: string): Promise<void> {
  return request<void>(`/api/measurement-sheets/${sheetId}/rows/${rowId}`, {
    method: "DELETE",
  })
}

/**
 * Downloads the whole set as one PDF and saves it to the device.
 *
 * <p>One file with a page per sheet, because the set is what gets handed over: three
 * sheets of a level are three pages of the same job.
 *
 * <p>Fetched rather than linked, because the endpoint needs the bearer token and a plain
 * anchor cannot carry one. The blob is handed to a temporary link so the browser writes a
 * real file — which is what makes this work on a phone or tablet, where "print to PDF" is
 * not always offered.
 */
export async function downloadMeasurementSetPdf(
  setId: string,
  fallbackName = "measurement-sheet.pdf"
): Promise<void> {
  const res = await fetch(`${ADMIN_API_BASE}/api/measurement-sets/${setId}/pdf`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    credentials: "include",
  })

  if (res.status === 401 && (await refresh())) {
    return downloadMeasurementSetPdf(setId, fallbackName)
  }
  if (!res.ok) throw toError(res.status, await parse(res))

  // the server names the file; fall back only if the header is missing
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const name = match ? decodeURIComponent(match[1]) : fallbackName

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // revoked on the next tick: revoking immediately can cancel the download in Safari
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ------------------------------------------------- sales and tax report

/**
 * An internal sales and tax report for a period — never an invoice, never sent anywhere.
 *
 * Every amount is added up on the server from totals stored on invoices when they were
 * issued, in exact decimals. This page only formats and sorts them; it never adds money
 * itself, so there is no floating-point arithmetic between the database and the screen.
 */
export type SalesTaxReport = {
  companyName: string
  /** ISO dates, inclusive at both ends. */
  from: string
  to: string
  currency: string
  /** The invoice statuses that count as a sale — issued and sent, paid or not. */
  statusesIncluded: string[]
  summary: {
    customerCount: number
    invoiceCount: number
    salesBeforeTax: number
    taxCollected: number
    totalSales: number
    totalPaid: number
    outstanding: number
  }
  /** Every customer in the period, A to Z. */
  customers: SalesTaxCustomer[]
  /** The tax actually charged: one line per tax and rate as written on the invoices. */
  taxes: SalesTaxLine[]
  /** Received against these invoices, by method. Internal only. */
  payments: SalesTaxPayments
  generatedAt: string
}

export type SalesTaxCustomer = {
  /** The customer record — two customers can share a name. Null only for invoices with no customer. */
  customerId: string | null
  customer: string
  invoiceCount: number
  salesBeforeTax: number
  /** Each tax charged to this customer, as written — never an averaged rate. */
  taxRates: string[]
  taxCharged: number
  totalSales: number
  paid: number
  outstanding: number
  invoices: SalesTaxInvoice[]
}

export type SalesTaxInvoice = {
  id: string
  invoiceNumber?: string
  issuedOn: string
  status: InvoiceStatus
  projectName?: string
  salesBeforeTax: number
  taxes: { display: string; label: string; ratePercent: number; amount: number }[]
  /** "GST 5% + PST 7%", or "No tax". */
  taxDisplay: string
  taxCharged: number
  total: number
  paymentStatus: PaymentStatus
  paid: number
  outstanding: number
}

export type SalesTaxLine = {
  display: string
  label?: string
  ratePercent: number
  /** Invoices charging this tax; one with GST and PST counts under each. */
  invoiceCount: number
  /** What it was charged on — for "No tax", the untaxed sales. */
  taxableAmount: number
  taxCollected: number
}

export type SalesTaxPayments = {
  /** Cash, Cheque, E-Transfer and Other always; "Method not recorded" when older payments lack one. */
  methods: { method: string; label: string; paymentCount: number; amount: number }[]
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  overpaid: number
  paidCount: number
  partiallyPaidCount: number
  unpaidCount: number
}

/** The report for a period; both dates ISO ("2025-01-01") and inclusive. */
export function getSalesTaxReport(from: string, to: string): Promise<SalesTaxReport> {
  const query = new URLSearchParams({ from, to })
  return request<SalesTaxReport>(`/api/reports/sales-tax?${query}`)
}

/**
 * Downloads the complete report as a PDF — every customer and every invoice, whatever the
 * page on screen is searched or sorted to.
 *
 * Fetched rather than linked, because the endpoint needs the bearer token and a plain
 * anchor cannot carry one.
 */
export async function downloadSalesTaxReportPdf(from: string, to: string): Promise<void> {
  const query = new URLSearchParams({ from, to })
  const res = await fetch(`${ADMIN_API_BASE}/api/reports/sales-tax/pdf?${query}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    credentials: "include",
  })

  if (res.status === 401 && (await refresh())) {
    return downloadSalesTaxReportPdf(from, to)
  }
  if (!res.ok) throw toError(res.status, await parse(res))

  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const name = match ? decodeURIComponent(match[1]) : `Sales-Tax-Report-${from}-to-${to}.pdf`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // revoked on the next tick: revoking immediately can cancel the download in Safari
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------- customers

/**
 * Where a customer stands, worked out from their issued and sent invoices on every
 * request — nothing about it is stored. NONE: no invoice yet.
 */
export type CustomerPaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "NONE"

export type CustomerRow = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  projectCount: number
  invoiceCount: number
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  paymentStatus: CustomerPaymentStatus
}

export type CustomerOption = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  projectCount: number
}

export type CustomerInvoiceRow = {
  id: string
  invoiceNumber?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  primary: boolean
  projectId?: string | null
  projectName: string
  grandTotal: number
  paidTotal: number
  balanceDue: number
  issuedOn?: string | null
  dueOn?: string | null
  version: number
  currency: string
}

export type CustomerDetail = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  /** The address of their most recent project — addresses belong to projects. */
  address?: string | null
  summary: {
    projectCount: number
    invoiceCount: number
    totalInvoiced: number
    totalPaid: number
    outstanding: number
    paymentStatus: CustomerPaymentStatus
  }
  projects: {
    id: string
    projectName: string
    address?: string | null
    windows: number
    createdAt: string
    invoice?: {
      id: string
      invoiceNumber?: string | null
      status: InvoiceStatus
      paymentStatus: PaymentStatus
      grandTotal: number
      paidTotal: number
      balanceDue: number
    } | null
  }[]
  invoices: CustomerInvoiceRow[]
  /** Internal: the method is shown here. */
  payments: {
    id: string
    invoiceId: string
    invoiceNumber?: string | null
    projectName: string
    paidOn: string
    amount: number
    method?: PaymentMethod | null
    methodLabel: string
    reference?: string | null
    note?: string | null
    voided: boolean
  }[]
  measurements: {
    id: string
    contractor?: string | null
    projectName?: string | null
    buildingLevel?: string | null
    sheetDate?: string | null
    sheetCount: number
    openings: number
    pending: number
    updatedAt: string
  }[]
  createdAt: string
  updatedAt: string
  createdBy?: string | null
}

export type CustomerInput = {
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  /** Confirms a customer may share another customer's name. */
  confirmSameName?: boolean
}

/** The 409 code for "a customer with that name already exists". */
export const CUSTOMER_EXISTS = "CUSTOMER_EXISTS"

export type CustomerSearch = {
  query?: string
  status?: CustomerPaymentStatus
  sort?: "name" | "outstanding" | "sales"
  page?: number
  size?: number
}

export function listCustomers(params: CustomerSearch = {}): Promise<Page<CustomerRow>> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
  }
  const qs = q.toString()
  return request<Page<CustomerRow>>(`/api/customers${qs ? `?${qs}` : ""}`)
}

export function customerOptions(query: string): Promise<CustomerOption[]> {
  return request<CustomerOption[]>(`/api/customers/options?${new URLSearchParams({ query })}`)
}

export function getCustomer(id: string): Promise<CustomerDetail> {
  return request<CustomerDetail>(`/api/customers/${id}`)
}

export function createCustomer(input: CustomerInput): Promise<CustomerDetail> {
  return request<CustomerDetail>("/api/customers", { method: "POST", body: JSON.stringify(input) })
}

export function updateCustomer(id: string, input: CustomerInput): Promise<CustomerDetail> {
  return request<CustomerDetail>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(input) })
}

/** Only a customer with no projects or invoices. */
export function deleteCustomer(id: string): Promise<void> {
  return request<void>(`/api/customers/${id}`, { method: "DELETE" })
}

/** Moves everything of one customer into another, then removes the first. */
export function mergeCustomer(id: string, targetId: string): Promise<CustomerDetail> {
  return request<CustomerDetail>(`/api/customers/${id}/merge`, {
    method: "POST",
    body: JSON.stringify({ targetId }),
  })
}

// ------------------------------------------------------- payment reminders

/** One invoice with a balance — a view of the invoice, never a separate record. */
export type ReceivableInvoice = {
  invoiceId: string
  invoiceNumber?: string | null
  version: number
  customerId: string
  customerName: string
  projectId?: string | null
  projectName: string
  grandTotal: number
  paidTotal: number
  balanceDue: number
  paymentStatus: PaymentStatus
  issuedOn?: string | null
  dueOn?: string | null
  daysOutstanding: number
  daysOverdue: number
  overdue: boolean
  currency: string
}

export type ReceivableCustomer = {
  customerId: string
  customerName: string
  invoiceCount: number
  overdueCount: number
  outstanding: number
  daysOutstanding: number
  overdue: boolean
  firstInvoiceId: string
  firstInvoiceNumber?: string | null
  firstProjectName: string
}

export type ReceivablesSummary = {
  unpaidInvoices: number
  totalOutstanding: number
  customersWithBalance: number
  overdueInvoices: number
  currency: string
}

export type Receivables = {
  summary: ReceivablesSummary
  invoices: ReceivableInvoice[]
  customers: ReceivableCustomer[]
  asOf: string
}

export function getReceivables(): Promise<Receivables> {
  return request<Receivables>("/api/receivables")
}

export function getReceivablesSummary(): Promise<ReceivablesSummary> {
  return request<ReceivablesSummary>("/api/receivables/summary")
}

export type Dashboard = {
  projectCount: number
  customerCount: number
  outstanding: number
  invoicedThisYear: number
  year: number
  receivables: ReceivablesSummary
  /** The most urgent few customers with balances. */
  reminders: ReceivableCustomer[]
}

export function getDashboard(): Promise<Dashboard> {
  return request<Dashboard>("/api/dashboard")
}

// --------------------------------------------------------- admin accounts

export type AdminAccount = {
  id: string
  username: string
  displayName: string
  role: "ADMIN" | "SUPER_ADMIN"
  enabled: boolean
  createdAt: string
  lastLoginAt?: string | null
}

/** Super admins only. */
export function listAdminAccounts(): Promise<AdminAccount[]> {
  return request<AdminAccount[]>("/api/admin/users")
}

// ------------------------------------------------- keeping screens in step

const invoiceListeners = new Set<() => void>()

/**
 * Something about an invoice or payment changed. Every screen that shows balances —
 * the payment-reminder badge, the home page — reloads from the server, so they all show
 * the same figures without anything being copied between them.
 */
export function notifyInvoicesChanged() {
  invoiceListeners.forEach((fn) => fn())
}

export function subscribeToInvoiceChanges(fn: () => void): () => void {
  invoiceListeners.add(fn)
  return () => invoiceListeners.delete(fn)
}

export const money = (value: string | number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value))
