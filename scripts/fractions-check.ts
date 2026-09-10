import {
  formatInches, parseInches, splitInches, joinInches, isEighth, FRACTION_OPTIONS,
} from "../src/lib/fractions.ts"

let bad = 0
const ok = (m: string) => console.log("  ok   " + m)
const fail = (m: string) => { bad++; console.log("  FAIL " + m) }

console.log("== format ==")
const fmt: [number, string][] = [
  [30, "30"], [30.5, "30 1/2"], [30.125, "30 1/8"], [30.25, "30 1/4"],
  [30.375, "30 3/8"], [30.625, "30 5/8"], [30.75, "30 3/4"], [30.875, "30 7/8"],
  [0.5, "1/2"], [0, "0"], [78, "78"], [57, "57"],
]
for (const [v, want] of fmt) {
  const got = formatInches(v)
  got === want ? ok(`${v} -> "${got}"`) : fail(`${v} -> "${got}", expected "${want}"`)
}
// legacy non-eighth must NOT be silently rounded
const legacy = formatInches(78.1)
legacy === "78.1" ? ok(`legacy 78.1 -> "${legacy}" (not rounded)`) : fail(`78.1 -> "${legacy}"`)

console.log("\n== parse ==")
const par: [string, number | null][] = [
  ["30", 30], ["30 1/2", 30.5], ["30-1/2", 30.5], ['30 1/2"', 30.5],
  ["1/2", 0.5], ["30.5", 30.5], ["30.125", 30.125], ["  30   3/8  ", 30.375],
  ["", null], ["abc", null], ["1/0", null],
]
for (const [t, want] of par) {
  const got = parseInches(t)
  got === want ? ok(`"${t}" -> ${got}`) : fail(`"${t}" -> ${got}, expected ${want}`)
}

console.log("\n== round trip is lossless for every eighth ==")
let rt = 0
for (let whole = 0; whole <= 200; whole++) {
  for (const f of FRACTION_OPTIONS) {
    const original = whole + f.value
    const back = parseInches(formatInches(original))
    if (back !== original) { fail(`${original} -> "${formatInches(original)}" -> ${back}`); rt++ }
    const split = splitInches(original)
    const rejoined = joinInches(split.whole, split.fraction)
    if (rejoined !== original) { fail(`split/join lost ${original} -> ${rejoined}`); rt++ }
  }
}
rt === 0 ? ok(`all ${201 * FRACTION_OPTIONS.length} eighth values round-trip exactly`) : fail(`${rt} round-trip failures`)

console.log("\n== every eighth is exactly representable ==")
const notExact = FRACTION_OPTIONS.filter((f) => !isEighth(f.value))
notExact.length === 0 ? ok("all picker fractions are exact in binary") : fail(String(notExact))

console.log("\n== pricing inputs are unchanged by the format layer ==")
// the value that reaches calculateLinePrice must be identical
const cases = [30.5, 30.125, 30.375, 30.625, 30.875, 78, 57]
let same = true
for (const v of cases) {
  const through = parseInches(formatInches(v))
  if (through !== v) { same = false; fail(`${v} changed to ${through}`) }
}
if (same) ok("values pass through format/parse bit-identical")

console.log(bad === 0 ? "\nFRACTIONS VERIFIED" : `\n${bad} PROBLEM(S)`)
process.exit(bad ? 1 : 0)
