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
  /** Inches as a decimal, the same convention as a line item: "30 1/2" is 30.5. */
  width: number
  height: number
  /** The same measurement as fractional inches, for display. */
  widthDisplay: string
  heightDisplay: string
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
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export type MeasurementSetView = Omit<
  MeasurementSetSummary,
  "sheetCount" | "rowCount"
> & {
  notes?: string
  sheets: MeasurementSheetView[]
}

/** The header for a whole set: one call changes what every sheet in it prints. */
export type MeasurementSetInput = {
  contractor?: string | null
  projectName?: string | null
  buildingLevel?: string | null
  sheetDate?: string | null
  measurementMethod?: MeasurementMethod | null
  installer?: string | null
  notes?: string | null
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
  width: number
  height: number
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

export const money = (value: string | number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value))
