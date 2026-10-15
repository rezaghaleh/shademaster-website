/* Run against a local Next server. All API calls are intercepted; no real customer data is used.
 * Requires Playwright locally, or set PLAYWRIGHT_MODULE to an existing Playwright package path.
 *
 * Walks the pricing chain in the project form: an 89" × 90" roller whose measurements give
 * $288.00 of cost, priced live as the project markup, a manual price, a supplier cost, a
 * window markup and the quantity change — then save, edit, invoice privacy and mobile.
 */
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.SHADEMASTER_UI_TEST_URL || 'http://localhost:3099'
const artifacts = process.env.SHADEMASTER_UI_TEST_ARTIFACTS || path.join(require('node:os').tmpdir(), 'shademaster-ui-check')
fs.mkdirSync(artifacts, { recursive: true })

const user = { id: 'test-user', username: 'test', displayName: 'Test Admin', role: 'SUPER_ADMIN', theme: 'DARK' }
const financials = { totalCost: 288, revenue: 525, grossProfit: 237, profitMarginPercent: 45.14 }
const project = {
  id: 'test-project', projectName: 'Test project', customerId: 'test-customer', customerName: 'Test customer',
  defaultMarkupPercent: 100, financials, itemCount: 1, invoiceCount: 0, primaryInvoice: null,
  createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z',
  totals: { subtotal: 525, shadeCount: 1, itemCount: 1, overriddenCount: 1, currency: 'CAD' },
  items: [{ id: 'test-line', width: 89, height: 90, widthDisplay: '89', heightDisplay: '90', quantity: 1,
    productType: 'ROLLER', motorized: false, measurementCostPerUnit: 288, baseCostPerUnit: 288,
    effectiveMarkupPercent: 100, unitPrice: 525, unitPriceOverride: 525, calculatedUnitPrice: 576,
    priceOverridden: true, lineTotal: 525, financials,
    description: 'Living room — Roller shade 89" x 90", manual', customerDescription: 'Living room — Roller shade, manual' }],
}
const invoice = {
  id: 'test-invoice', projectId: 'test-project', customerId: 'test-customer', projectExists: true, primary: true,
  projectName: 'Test project', customerName: 'Test customer', invoiceNumber: 'SM-TEST', status: 'ISSUED',
  paymentStatus: 'UNPAID', version: 0, fees: [], taxes: [], payments: [], subtotal: 525, feesTotal: 0,
  taxableAmount: 525, taxTotal: 0, grandTotal: 525, paidTotal: 0, balanceDue: 525, overpaid: 0,
  currency: 'CAD', issuedOn: '2026-10-15', revisionCount: 0, internalNotes: 'INTERNAL SECRET PAYMENT',
  issuer: { name: 'ShadeMaster Blinds LTD.' }, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z',
  items: [{ ...project.items[0], description: 'PRIVATE BRAND 89" x 90"', blindBrand: 'PRIVATE BRAND', motorBrand: 'PRIVATE MOTOR',
    unitPrice: 525, calculatedUnitPrice: 525, priceOverridden: false, lineTotal: 525,
    costPerUnit: 987654.32, markupOverridePercent: 77.777 }],
  // Private sentinel fields must never be rendered, even if a future admin DTO includes them.
  defaultMarkupPercent: 77.777, grossProfit: 987654.32,
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
    const errors = []
    const requests = []
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)))
    await context.route('**/api/**', async route => {
      const req = route.request()
      const url = new URL(req.url())
      const apiPath = url.pathname
      const headers = { 'access-control-allow-origin': new URL(baseUrl).origin, 'access-control-allow-credentials': 'true' }
      const respond = (value, status = 200) => route.fulfill({ status, headers, json: value })
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PUT' } })
      if (apiPath === '/api/auth/refresh') return respond({ accessToken: 'test-only', user })
      if (apiPath === '/api/receivables/summary') return respond({ unpaidInvoices: 0, totalOutstanding: 0, customersWithBalance: 0, overdueInvoices: 0, currency: 'CAD' })
      if (apiPath === '/api/pricing/rates') return respond({ rollerRate: 4.5, zebraRate: 4.75, motorSurcharge: 250 })
      if (apiPath.startsWith('/api/customers')) return respond([])
      if (apiPath === '/api/projects' && req.method() === 'POST') { requests.push(req.postDataJSON()); return respond(project, 201) }
      if (apiPath === '/api/projects/test-project') {
        if (req.method() === 'PUT') requests.push(req.postDataJSON())
        return respond(project)
      }
      if (apiPath === '/api/invoices/test-invoice') return respond(invoice)
      if (apiPath.endsWith('/revisions')) return respond([])
      throw new Error(`Unexpected API request (blocked): ${req.method()} ${apiPath}`)
    })
    const page = await context.newPage()
    const waitText = async (locator, text) => {
      await locator.filter({ hasText: text }).waitFor()
    }
    const markup = () => page.locator('#defaultMarkupPercent')
    const price = (i = 0) => page.locator(`#item-${i}-price`)
    const windowCard = (i = 0) => page.locator('li').filter({ has: page.locator(`#item-${i}-price`) })
    const lineTotal = (i = 0) => page.getByLabel(`Window ${i + 1} total`, { exact: true })
    const subtotal = () => page.getByLabel('Project subtotal', { exact: true })
    const summary = () => page.getByRole('region', { name: 'Internal financials' })
    /** The price box as it reads once you leave it. */
    const settledPrice = async (i = 0) => { await price(i).blur(); return price(i).inputValue() }

    await page.goto(baseUrl + '/admin/new')
    await markup().waitFor()
    assert.equal(await markup().inputValue(), '50')
    await page.getByRole('button', { name: 'Add a window' }).click()
    await page.locator('#item-0-width-whole').fill('89')
    await page.locator('#item-0-height-whole').fill('90')

    // the measurements give the cost; the project markup goes on top
    await waitText(windowCard(), '$288.00')
    await waitText(windowCard(), 'From the measurements')
    assert.equal(await price().inputValue(), '432.00')
    assert.equal(await lineTotal().innerText(), '$432.00')
    assert.equal(await subtotal().innerText(), '$432.00')
    await waitText(summary(), '$144.00')
    await waitText(summary(), '33.33%')

    // changing only the project markup reprices at once — the cost stays $288.00
    for (const [percent, expected] of [['0', '288.00'], ['25', '360.00'], ['50', '432.00'], ['75', '504.00'], ['150', '720.00'], ['100', '576.00']]) {
      await markup().fill(percent)
      assert.equal(await price().inputValue(), expected, `${percent}% markup`)
      assert.equal(await subtotal().innerText(), `$${expected}`)
    }
    assert.equal(await lineTotal().innerText(), '$576.00')
    assert.equal(await page.locator('#item-0-markup').getAttribute('placeholder'), 'Project 100%')
    await waitText(windowCard(), 'Follows the project markup')
    await waitText(summary(), '$288.00')
    await waitText(summary(), '50.00%')

    // a manual price wins, is what profit is measured on, and survives markup changes
    await price().fill('525')
    assert.equal(await settledPrice(), '525.00')
    await waitText(windowCard(), 'Manual override')
    assert.equal(await lineTotal().innerText(), '$525.00')
    assert.equal(await subtotal().innerText(), '$525.00')
    await waitText(summary(), '$237.00')
    await waitText(summary(), '45.14%')
    await markup().fill('150')
    assert.equal(await price().inputValue(), '525.00')
    await waitText(windowCard(), '$720.00')
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    assert.equal(await price().inputValue(), '720.00')
    await waitText(windowCard(), 'Automatic')

    // emptying the box also returns to the automatic price, without snapping back mid-edit
    await price().fill('4')
    await price().fill('')
    assert.equal(await price().inputValue(), '', 'an emptied box stays empty while focused')
    assert.equal(await settledPrice(), '720.00')

    // a supplier cost replaces the measurement cost
    await markup().fill('50')
    await page.locator('#item-0-cost').fill('250')
    assert.equal(await price().inputValue(), '375.00')
    await waitText(windowCard(), 'Replaced by the supplier cost')
    await page.locator('#item-0-cost').fill('')
    assert.equal(await price().inputValue(), '432.00')

    // a window markup overrides the project's until reset
    await page.locator('#item-0-markup').fill('75')
    assert.equal(await price().inputValue(), '504.00')
    await waitText(windowCard(), 'Custom 75% for this window')
    await markup().fill('100')
    assert.equal(await price().inputValue(), '504.00')
    await page.getByRole('button', { name: 'Use project markup' }).click()
    assert.equal(await price().inputValue(), '576.00')

    // quantity multiplies the price and the cost
    await page.getByLabel('Qty', { exact: true }).fill('3')
    assert.equal(await lineTotal().innerText(), '$1,728.00')
    await waitText(summary(), '$864.00')
    await waitText(summary(), '$1,728.00')

    // save: the automatic price is not sent as a manual one; the window follows the project
    await page.getByLabel('Qty', { exact: true }).fill('1')
    await price().fill('525')
    await page.locator('#projectName').fill('Test project')
    await page.locator('#customer-search').fill('Test customer')
    await page.getByRole('button', { name: 'Create project', exact: true }).click()
    await page.waitForURL('**/admin/projects/test-project')
    await summary().waitFor()
    assert.equal(requests[0].defaultMarkupPercent, 100)
    assert.equal(requests[0].items[0].unitPriceOverride, 525)
    assert.equal(requests[0].items[0].costPerUnit ?? null, null)
    assert.equal(requests[0].items[0].markupOverridePercent ?? null, null)
    await waitText(page.locator('main'), 'Cost / shade $288.00')
    await page.screenshot({ path: path.join(artifacts, 'project-desktop.png'), fullPage: true })

    // editing: the manual price stays manual through a markup change
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    assert.equal(await price().inputValue(), '525.00')
    assert.equal(await markup().inputValue(), '100')
    assert.equal(await page.locator('#item-0-markup').inputValue(), '')
    await markup().fill('75')
    assert.equal(await price().inputValue(), '525.00')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).waitFor()
    assert.equal(requests[1].defaultMarkupPercent, 75)
    assert.equal(requests[1].items[0].unitPriceOverride, 525)

    // a second, automatic window saves with no manual price (the stub still answers at 100%)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'Add a window' }).click()
    await page.locator('#item-1-width-whole').fill('89')
    await page.locator('#item-1-height-whole').fill('90')
    assert.equal(await price(1).inputValue(), '576.00')
    assert.equal(await subtotal().innerText(), '$1,101.00')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).waitFor()
    assert.equal(requests[2].items[1].unitPriceOverride ?? null, null, 'an automatic price is never saved as manual')

    // the customer's invoice shows prices only
    await page.goto(baseUrl + '/admin/invoices/test-invoice')
    const paper = page.locator('.invoice-paper')
    await paper.waitFor()
    const visible = await paper.innerText()
    assert(visible.includes('525.00'))
    for (const secret of ['cost', 'markup', 'profit', 'margin', '987,654.32', '77.777', '288', 'PRIVATE', 'INTERNAL SECRET', '89"', '90"']) {
      assert(!visible.toLowerCase().includes(secret.toLowerCase()), `Customer preview leaked ${secret}`)
    }
    await page.emulateMedia({ media: 'print' })
    assert.equal(await page.getByText('INTERNAL SECRET PAYMENT', { exact: true }).isVisible(), false)
    await page.pdf({ path: path.join(artifacts, 'customer-invoice-print.pdf'), format: 'Letter' })
    await page.emulateMedia({ media: 'screen' })

    // phone width
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(baseUrl + '/admin/new')
    await markup().waitFor()
    await page.getByRole('button', { name: 'Add a window' }).click()
    await page.locator('#item-0-cost').fill('1000')
    await page.locator('#item-0-markup').fill('75')
    assert.equal(await price().inputValue(), '1750.00')
    assert(await page.getByRole('button', { name: 'Use project markup' }).isVisible())
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile layout overflows horizontally')
    await page.screenshot({ path: path.join(artifacts, 'project-mobile.png'), fullPage: true })
    assert.deepEqual(errors, [], 'Browser errors')
    console.log('Browser checks passed: measurement cost + markup, live repricing, manual priority, supplier cost, window markup, quantity, save/edit, invoice privacy and mobile layout.')
    console.log('Artifacts: ' + artifacts)
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
