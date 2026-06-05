import type { ServiceReport, ServiceRow } from '@shared/types'

export interface ServiceKpis {
  grossPrice: number
  netSaleValue: number
  discounts: number
  openCount: number
  newGuests: number
  requestRate: number
}

export function serviceKpis(rows: ServiceRow[]): ServiceKpis {
  let grossPrice = 0
  let netSaleValue = 0
  let discounts = 0
  let openCount = 0
  let newGuests = 0
  let requested = 0
  for (const r of rows) {
    grossPrice += r.price
    netSaleValue += r.saleValue
    discounts += r.discount
    if (r.status.toLowerCase() === 'open') openCount += 1
    if (r.firstVisit) newGuests += 1
    if (r.requested) requested += 1
  }
  return {
    grossPrice,
    netSaleValue,
    discounts,
    openCount,
    newGuests,
    requestRate: rows.length ? (requested / rows.length) * 100 : 0
  }
}

export interface ServiceCategoryTotal {
  label: string
  listPrice: number
  actual: number
}

export function byServiceCategory(rows: ServiceRow[]): ServiceCategoryTotal[] {
  const map = new Map<string, ServiceCategoryTotal>()
  for (const r of rows) {
    const key = r.category || 'Uncategorized'
    const c = map.get(key) ?? { label: key, listPrice: 0, actual: 0 }
    c.listPrice += r.price
    c.actual += r.saleValue
    map.set(key, c)
  }
  return [...map.values()].sort((a, b) => b.actual - a.actual)
}

export interface EmployeeServiceAgg {
  name: string
  services: number
  revenue: number
  discounts: number
  requestRate: number
  rows: ServiceRow[]
}

export function employeePerformance(rows: ServiceRow[]): EmployeeServiceAgg[] {
  const map = new Map<string, EmployeeServiceAgg>()
  for (const r of rows) {
    const key = r.servicedBy || 'Unassigned'
    const e = map.get(key) ?? { name: key, services: 0, revenue: 0, discounts: 0, requestRate: 0, rows: [] }
    e.services += 1
    e.revenue += r.saleValue
    e.discounts += r.discount
    e.rows.push(r)
    map.set(key, e)
  }
  const list = [...map.values()]
  for (const e of list) {
    const requested = e.rows.filter((r) => r.requested).length
    e.requestRate = e.rows.length ? (requested / e.rows.length) * 100 : 0
  }
  return list.sort((a, b) => b.revenue - a.revenue)
}

export function bookingSource(rows: ServiceRow[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const key = r.appointmentSource || 'Zenoti'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export interface PromoRow {
  employee: string
  guest: string
  service: string
  promo: string
  discount: number
}

export function promotions(rows: ServiceRow[]): PromoRow[] {
  return rows
    .filter((r) => r.promotion && r.promotion.trim() !== '')
    .map((r) => ({ employee: r.servicedBy, guest: r.guest, service: r.serviceName, promo: r.promotion, discount: r.discount }))
    .sort((a, b) => b.discount - a.discount)
}

export function paymentMix(rows: ServiceRow[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const key = r.paymentType || 'Other'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export function openAppointments(rows: ServiceRow[]): { count: number; uncollected: number; rows: ServiceRow[] } {
  const open = rows.filter((r) => r.status.toLowerCase() === 'open')
  return { count: open.length, uncollected: open.reduce((a, r) => a + r.saleValue, 0), rows: open }
}

/** Combine all loaded service reports that pass the active-location filter. */
export function scopedServices(services: ServiceReport[], active: string[]): ServiceReport[] {
  return services.filter((s) => active.length === 0 || active.includes(s.locationId))
}
