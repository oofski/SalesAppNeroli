import type { AccrualReport, AccrualRow } from '@shared/types'
import { inScope } from '../store/reports'

export interface ProductKpis {
  totalSalesExcTax: number
  totalCollected: number
  totalRedeemed: number
  totalDue: number
  unitsSold: number
  lineItems: number
}

export interface CategoryTotal {
  label: string
  revenue: number
  units: number
}

export interface ProductAgg {
  itemName: string
  subcategory: string
  vendor: string
  brand: string
  units: number
  revenue: number
  avgPrice: number
  transactions: AccrualRow[]
}

export interface ClientAgg {
  clientName: string
  spend: number
  transactions: number
  locationId: string
}

export function filterAccrual(report: AccrualReport | null, active: string[]): AccrualRow[] {
  if (!report) return []
  return report.rows.filter((r) => inScope(active, r.locationId))
}

export function productKpis(rows: AccrualRow[]): ProductKpis {
  const k: ProductKpis = {
    totalSalesExcTax: 0,
    totalCollected: 0,
    totalRedeemed: 0,
    totalDue: 0,
    unitsSold: 0,
    lineItems: rows.length
  }
  for (const r of rows) {
    k.totalSalesExcTax += r.salesExcTax
    k.totalCollected += r.collected
    k.totalRedeemed += r.redeemed
    k.totalDue += r.due
    k.unitsSold += r.qty
  }
  return k
}

export function byCategory(rows: AccrualRow[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const r of rows) {
    const key = r.subcategory || 'Uncategorized'
    const c = map.get(key) ?? { label: key, revenue: 0, units: 0 }
    c.revenue += r.salesExcTax
    c.units += r.qty
    map.set(key, c)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

export function byVendor(rows: AccrualRow[]): { label: string; revenue: number; pct: number }[] {
  const total = rows.reduce((a, r) => a + r.salesExcTax, 0) || 1
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.vendor, (map.get(r.vendor) ?? 0) + r.salesExcTax)
  return [...map.entries()]
    .map(([label, revenue]) => ({ label, revenue, pct: (revenue / total) * 100 }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** Daily revenue, optionally split by location for a multi-line trend. */
export function dailyTrend(rows: AccrualRow[]): Map<string, Map<string, number>> {
  // location -> (date -> revenue)
  const out = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!r.saleDate) continue
    if (!out.has(r.locationId)) out.set(r.locationId, new Map())
    const m = out.get(r.locationId)!
    m.set(r.saleDate, (m.get(r.saleDate) ?? 0) + r.salesExcTax)
  }
  return out
}

export function aggregateProducts(rows: AccrualRow[]): ProductAgg[] {
  const map = new Map<string, ProductAgg>()
  for (const r of rows) {
    const key = r.itemCode || r.itemName
    const a =
      map.get(key) ??
      ({
        itemName: r.itemName,
        subcategory: r.subcategory,
        vendor: r.vendor,
        brand: r.brand,
        units: 0,
        revenue: 0,
        avgPrice: 0,
        transactions: []
      } as ProductAgg)
    a.units += r.qty
    a.revenue += r.salesExcTax
    a.transactions.push(r)
    map.set(key, a)
  }
  const list = [...map.values()]
  for (const a of list) a.avgPrice = a.units > 0 ? a.revenue / a.units : 0
  return list.sort((a, b) => b.revenue - a.revenue)
}

export function topClients(rows: AccrualRow[]): ClientAgg[] {
  const map = new Map<string, ClientAgg>()
  for (const r of rows) {
    const key = `${r.clientCode}|${r.clientName}`
    const c = map.get(key) ?? { clientName: r.clientName || 'Guest', spend: 0, transactions: 0, locationId: r.locationId }
    c.spend += r.collected || r.salesExcTax
    c.transactions += 1
    map.set(key, c)
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend)
}

export function subcategories(rows: AccrualRow[]): string[] {
  return [...new Set(rows.map((r) => r.subcategory))].sort()
}

export function vendors(rows: AccrualRow[]): string[] {
  return [...new Set(rows.map((r) => r.vendor))].sort()
}

export function brands(rows: AccrualRow[]): string[] {
  return [...new Set(rows.map((r) => r.brand))].sort()
}
