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

export type AdminSummary = {
  id: string
  username: string
  displayName: string
  role: "ADMIN" | "SUPER_ADMIN"
}

export type ProductType = "ROLLER" | "ZEBRA"

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
  /** The price charged per shade — the override when one is set. */
  unitPrice: string
  /** What the formula produced, for comparison. */
  calculatedUnitPrice: string
  unitPriceOverride: string | null
  priceOverridden: boolean
  lineTotal: string
}

export type ProjectSummary = {
  id: string
  projectName: string
  customerName: string
  city: string | null
  phone: string | null
  email: string | null
  itemCount: number
  subtotal: string
  invoiceCount: number
  createdAt: string
  updatedAt: string
}

export type ProjectView = ProjectSummary & {
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

export type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "VOID"

export type InvoiceSummary = {
  id: string
  projectId: string | null
  invoiceNumber: string | null
  status: InvoiceStatus
  projectName: string
  customerName: string
  grandTotal: string
  currency: string
  issuedOn: string | null
  dueOn: string | null
  createdAt: string
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
    public readonly fields?: Record<string, string>
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
    const b = body as { message?: string; fields?: Record<string, string> }
    return new ApiError(status, b.message ?? `Request failed (${status})`, b.fields)
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
   * Manually agreed price per shade for this line. Null uses the calculated
   * price. Scoped to this quote only; it never changes the pricing rates.
   */
  unitPriceOverride?: number | null
}

export type ProjectInput = {
  projectName: string
  customerName: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  items: LineItemInput[]
}

export function createProject(input: ProjectInput): Promise<ProjectView> {
  return request<ProjectView>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  })
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

export type FeeInput = { label: string; amount: number; taxable?: boolean }

export type CreateInvoiceInput = {
  taxRatePercent?: number
  taxLabel?: string
  dueOn?: string
  notes?: string
  fees?: FeeInput[]
}

export function listProjectInvoices(projectId: string): Promise<InvoiceSummary[]> {
  return request<InvoiceSummary[]>(`/api/projects/${projectId}/invoices`)
}

export function createInvoice(
  projectId: string,
  input: CreateInvoiceInput = {}
): Promise<InvoiceSummary> {
  return request<InvoiceSummary>(`/api/projects/${projectId}/invoices`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function issueInvoice(id: string): Promise<InvoiceSummary> {
  return request<InvoiceSummary>(`/api/invoices/${id}/issue`, { method: "POST" })
}

export function emailInvoice(
  id: string,
  body: { to?: string; subject?: string; message?: string } = {}
): Promise<InvoiceSummary> {
  return request<InvoiceSummary>(`/api/invoices/${id}/email`, {
    method: "POST",
    body: JSON.stringify(body),
  })
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

export const money = (value: string | number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value))
