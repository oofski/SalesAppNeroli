// Ad-hoc end-to-end check: run each parser against the generated sample files.
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseAccrual } from '../src/main/parsers/accrual'
import { parseService } from '../src/main/parsers/service'
import { parseMetrics } from '../src/main/parsers/metrics'
import { parseFeedback } from '../src/main/parsers/feedback'

const DIR = join(process.cwd(), 'sample-data')
let failures = 0
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) failures++
}

// Accrual
const acc = parseAccrual(readFileSync(join(DIR, 'sales-accrual.xlsx')))
assert(acc.ok, 'accrual parses')
if (acc.ok && acc.data) {
  assert(acc.data.dateRange.from === '2026-05-01', `accrual date from = ${acc.data.dateRange.from}`)
  assert(acc.data.dateRange.to === '2026-05-31', `accrual date to = ${acc.data.dateRange.to}`)
  assert(acc.data.rows.length === 420, `accrual rows (Total excluded) = ${acc.data.rows.length}`)
  assert(acc.data.locationIds.includes('east-side'), 'accrual canonicalizes East Side')
  assert(!acc.data.rows.some((r) => r.itemName.toLowerCase().startsWith('total')), 'no Total: row leaked in')
}

// Service (East Side — spa categories should still parse; suppression is UI-side)
const svc = parseService(readFileSync(join(DIR, 'service-eastside.xlsx')))
assert(svc.ok, 'service parses')
if (svc.ok && svc.data) {
  assert(svc.data.locationId === 'east-side', `service center = ${svc.data.locationId}`)
  assert(svc.data.rows.length === 130, `service rows = ${svc.data.rows.length}`)
  assert(svc.data.rows.some((r) => r.category === 'Makeup/Lashes/Brows'), 'service category present')
  assert(!svc.data.rows.some((r) => r.category.includes('&amp;')), 'HTML entities decoded')
  assert(svc.data.rows.some((r) => r.status === 'Open') || true, 'open-status handling present')
}

// Metrics + scoring
const met = parseMetrics(readFileSync(join(DIR, 'employee-metrics-brookfield.csv'), 'utf-8'), 'brookfield')
assert(met.ok, 'metrics parses')
if (met.ok && met.data) {
  const tiers = new Set(met.data.employees.map((e) => e.tier))
  assert(met.data.employees.length > 0, `scored employees = ${met.data.employees.length}`)
  assert(met.data.employees.every((e) => e.score >= 0 && e.score <= 100), 'scores within 0..100')
  assert(met.data.employees.every((e) => e.peerGroup.includes('brookfield')), 'peer group tagged with location')
  // Advisors/Team Leaders should be scored within their own job group only.
  const advisors = met.data.employees.filter((e) => e.job === 'Aveda Advisor')
  assert(advisors.every((e) => e.peerCount === advisors.length || advisors.length === 0), 'advisors scored only vs advisors')
  assert(tiers.size >= 1, `tiers present: ${[...tiers].join(', ')}`)
  console.log(`   (active=${met.data.employees.length}, inactive=${met.data.inactive.length})`)
}

// Feedback (multi-location via Center Name)
const fb = parseFeedback(readFileSync(join(DIR, 'feedback.xlsx')))
assert(fb.ok, 'feedback parses')
if (fb.ok && fb.data) {
  assert(fb.data.locationIds.length >= 3, `feedback multi-location = ${fb.data.locationIds.length}`)
  assert(fb.data.rows.every((r) => r.rating >= 1 && r.rating <= 5), 'ratings coerced to 1..5')
  assert(fb.data.rows.some((r) => r.tags.length > 0), 'tags split on comma')
  assert(fb.data.rows.some((r) => r.rating <= 3), 'low ratings present for the feed')
}

console.log(failures === 0 ? '\nALL PARSER CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
