import Papa from 'papaparse'
import type { EmployeeMetric, MetricsReport, ParseResult, PerformanceTier } from '@shared/types'
import { num, str } from './util'

const EXPECTED = ['Code', 'EmpName', 'Job', 'Months Employed', '# Guests']

/** Normalize a header for tolerant matching: lowercase, strip spaces/punctuation. */
function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function makeGetter(row: Record<string, unknown>): (...aliases: string[]) => unknown {
  const map: Record<string, unknown> = {}
  for (const key of Object.keys(row)) map[normKey(key)] = row[key]
  return (...aliases: string[]) => {
    for (const a of aliases) {
      const nk = normKey(a)
      if (nk in map && map[nk] !== '' && map[nk] !== null && map[nk] !== undefined) return map[nk]
    }
    return null
  }
}

/** Job titles scored on product/gift-card/campaign rather than service metrics (§6.2). */
function isProductRole(job: string): boolean {
  const j = job.toLowerCase()
  return j.includes('advisor') || j.includes('team lead')
}

interface WeightSpec {
  field: keyof EmployeeMetric
  weight: number
}

const SERVICE_WEIGHTS: WeightSpec[] = [
  { field: 'serviceRevenue', weight: 0.35 },
  { field: 'rebookRate', weight: 0.25 },
  { field: 'productAttachRate', weight: 0.2 },
  { field: 'requestRate', weight: 0.2 }
]

const PRODUCT_WEIGHTS: WeightSpec[] = [
  { field: 'productSales', weight: 0.5 },
  { field: 'giftCardSales', weight: 0.25 },
  { field: 'campaignRedemptions', weight: 0.25 }
]

const AVG_FIELDS: (keyof EmployeeMetric)[] = [
  'serviceRevenue', 'productSales', 'giftCardSales', 'membershipSales', 'packageSales',
  'totalRevenue', 'rebookRate', 'requestRate', 'productAttachRate', 'addonRate',
  'onlineBookingRate', 'newGuests'
]

/** Percentile rank of `value` within `values` (0..100). */
function percentileRank(value: number, values: number[]): number {
  if (values.length <= 1) return 50
  let less = 0
  let equal = 0
  for (const v of values) {
    if (v < value) less++
    else if (v === value) equal++
  }
  return ((less + 0.5 * equal) / values.length) * 100
}

function tierForPosition(position: number, count: number): PerformanceTier {
  if (count <= 1) return 'on-track'
  if (position < count / 3) return 'performing'
  if (position < (2 * count) / 3) return 'on-track'
  return 'coaching'
}

/** Score one peer group (same Job + same location) in place. */
function scoreGroup(group: EmployeeMetric[]): void {
  const productRole = group.length > 0 && isProductRole(group[0].job)
  const weights = productRole ? PRODUCT_WEIGHTS : SERVICE_WEIGHTS

  // Pre-collect each weighted field's value distribution.
  const dist: Record<string, number[]> = {}
  for (const w of weights) dist[w.field] = group.map((e) => e[w.field] as number)

  // Peer averages (for the detail modal context bars).
  const averages: Record<string, number> = {}
  for (const f of AVG_FIELDS) {
    const vals = group.map((e) => e[f] as number)
    averages[f] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }

  for (const emp of group) {
    let composite = 0
    for (const w of weights) {
      composite += percentileRank(emp[w.field] as number, dist[w.field]) * w.weight
    }
    emp.score = Math.round(composite * 10) / 10
    emp.peerCount = group.length
    emp.peerAverages = averages
  }

  // Tiers from ranked position within the group.
  const ranked = [...group].sort((a, b) => b.score - a.score)
  ranked.forEach((emp, pos) => {
    emp.tier = tierForPosition(pos, ranked.length)
  })
}

export function parseMetrics(text: string, locationId: string): ParseResult<MetricsReport> {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  })

  if (!parsed.data || !parsed.data.length) {
    return { ok: false, type: 'metrics', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  const fields = (parsed.meta.fields ?? []).map(normKey)
  const hasCore = ['code', 'empname', 'job'].every((k) => fields.includes(k))
  if (!hasCore) {
    return {
      ok: false,
      type: 'metrics',
      error: {
        code: 'wrong-structure',
        message: "This doesn't look like an Employee Sales Metrics export. Please check the file and try again.",
        expectedColumns: EXPECTED
      }
    }
  }

  const all: EmployeeMetric[] = []
  for (const raw of parsed.data) {
    const g = makeGetter(raw)
    const code = str(g('Code', 'Employee Code', 'EmployeeCode'))
    const name = str(g('EmpName', 'Employee Name', 'Name'))
    if (!code && !name) continue

    const serviceRevenue = num(g('Service Sales', 'ServiceSales', 'Service Revenue', 'ServiceRevenue'))
    const productSales = num(g('Product Sales', 'ProductSales'))
    const giftCardSales = num(g('Gift Card Sales', 'GiftCardSales', 'Giftcard Sales'))
    const membershipSales = num(g('Membership Sales', 'MembershipSales'))
    const packageSales = num(g('Package Sales', 'PackageSales'))

    all.push({
      code,
      name,
      job: str(g('Job', 'Job Title', 'Role')) || 'Unspecified',
      monthsEmployed: num(g('Months Employed', 'MonthsEmployed')),
      guests: num(g('# Guests', 'Guests', 'Total Guests', 'NumGuests')),
      serviceRevenue,
      productSales,
      giftCardSales,
      membershipSales,
      packageSales,
      totalRevenue:
        num(g('Total Revenue', 'TotalRevenue')) ||
        serviceRevenue + productSales + giftCardSales + membershipSales + packageSales,
      rebookRate: num(g('Rebook %', 'RebookPercent', 'Rebook Rate', 'RebookRate')),
      requestRate: num(g('Request %', 'RequestsPercent', 'Request Rate', 'RequestRate', 'Requests %')),
      productAttachRate: num(g('% Bought Products', 'ProductAttachPercent', 'Product Attach %', 'BoughtProductsPercent')),
      addonRate: num(g('Addon %', 'AddonPercent', 'Add-on %', 'AddOnPercent')),
      onlineBookingRate: num(g('Online Booking %', 'OnlineBookingPercent', 'Online %')),
      newGuests: num(g('New Guests', 'NewGuests')),
      campaignRedemptions: num(g('Campaign Redemptions', 'CampaignRedemptions', 'Campaigns')),
      score: 0,
      tier: 'on-track',
      peerCount: 0,
      peerGroup: '',
      peerAverages: {}
    })
  }

  // Split active vs inactive (0 guests → No Activity section, §6.2).
  const active = all.filter((e) => e.guests > 0)
  const inactive = all.filter((e) => e.guests <= 0).map((e) => ({ ...e, tier: 'no-activity' as PerformanceTier }))

  // Group by Job (location is fixed per upload) and score each group independently.
  const groups = new Map<string, EmployeeMetric[]>()
  for (const emp of active) {
    emp.peerGroup = `${emp.job} @ ${locationId}`
    if (!groups.has(emp.job)) groups.set(emp.job, [])
    groups.get(emp.job)!.push(emp)
  }
  for (const group of groups.values()) scoreGroup(group)

  return {
    ok: true,
    type: 'metrics',
    data: { type: 'metrics', locationId, employees: active, inactive }
  }
}
