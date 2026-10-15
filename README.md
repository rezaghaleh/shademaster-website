# ShadeMaster Blinds — React (Next.js) Starter (with logo)

Brand color auto-detected from logo: RGB (6, 29, 63), HSL 216 83% 14%.

## Run
npm install
npm run dev
# open http://localhost:3000

Place your photos in /public and reference them like /hero.jpg.

## Internal project financials

Each window is priced by one chain (`src/lib/project-math.ts` previews it; the backend's
`ProjectPricing` recomputes it on save):

```
measurements          → calculated cost / shade   (the size and motor formula)
supplier cost, if any → base cost / shade         (replaces the calculated cost)
base cost + markup    → automatic price / shade   (window markup, else project markup)
manual price, if any  → price / shade
price × quantity      → line total; line totals add up to the subtotal
subtotal − total cost → gross profit; profit ÷ subtotal → margin
```

New projects default to 50% markup. An empty window markup follows the project's; zero
is a valid one. Profit is before invoice fees and taxes. Cost, markup and profit stay in
the admin project screens: an invoice receives only the price.

Run `npm run project-pricing:verify`, `npm run pricing:verify`, `npm run fractions:verify`,
`npx tsc --noEmit`, `npm run lint`, and `npm run build`.

`node scripts/project-ui-check.cjs` runs Chromium checks against a local server at
`http://localhost:3099` (`npm run dev -- --port 3099`). It intercepts every API call and
uses synthetic data. Playwright must be available locally, or `PLAYWRIGHT_MODULE` can
point to an existing Playwright package directory. Override `SHADEMASTER_UI_TEST_URL`
or `SHADEMASTER_UI_TEST_ARTIFACTS` to choose the URL or screenshot/print-PDF directory.
