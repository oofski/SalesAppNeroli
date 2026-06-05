import type { FeedbackReport, ReviewRow } from '@shared/types'
import { inScope } from '../store/reports'

export function filterReviews(report: FeedbackReport | null, active: string[]): ReviewRow[] {
  if (!report) return []
  return report.rows.filter((r) => inScope(active, r.locationId))
}

export interface ReviewKpis {
  total: number
  avgRating: number
  fiveStar: number
  lowRating: number
}

export function reviewKpis(rows: ReviewRow[]): ReviewKpis {
  const total = rows.length
  const sum = rows.reduce((a, r) => a + r.rating, 0)
  return {
    total,
    avgRating: total ? sum / total : 0,
    fiveStar: rows.filter((r) => r.rating === 5).length,
    lowRating: rows.filter((r) => r.rating >= 1 && r.rating <= 3).length
  }
}

export function locationAverages(rows: ReviewRow[]): { locationId: string; avg: number; count: number }[] {
  const map = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const m = map.get(r.locationId) ?? { sum: 0, count: 0 }
    m.sum += r.rating
    m.count += 1
    map.set(r.locationId, m)
  }
  return [...map.entries()]
    .map(([locationId, m]) => ({ locationId, avg: m.count ? m.sum / m.count : 0, count: m.count }))
    .sort((a, b) => b.avg - a.avg)
}

export interface EmployeeRating {
  name: string
  role: string
  total: number
  avg: number
  fiveStar: number
  lowRating: number
  reviews: ReviewRow[]
}

export function employeeRatings(rows: ReviewRow[]): EmployeeRating[] {
  const map = new Map<string, EmployeeRating>()
  for (const r of rows) {
    const key = r.serviceProvider || 'Unknown'
    const e =
      map.get(key) ?? { name: key, role: r.category || '', total: 0, avg: 0, fiveStar: 0, lowRating: 0, reviews: [] }
    e.total += 1
    e.fiveStar += r.rating === 5 ? 1 : 0
    e.lowRating += r.rating <= 3 ? 1 : 0
    e.reviews.push(r)
    map.set(key, e)
  }
  const list = [...map.values()]
  for (const e of list) e.avg = e.total ? e.reviews.reduce((a, r) => a + r.rating, 0) / e.total : 0
  return list
}

export function fiveStarLeaderboard(rows: ReviewRow[]): EmployeeRating[] {
  return employeeRatings(rows)
    .filter((e) => e.fiveStar > 0)
    .sort((a, b) => b.fiveStar - a.fiveStar || b.avg - a.avg)
}

export function lowRatingReviews(rows: ReviewRow[]): ReviewRow[] {
  return rows
    .filter((r) => r.rating >= 1 && r.rating <= 3)
    .sort((a, b) => a.rating - b.rating || (b.saleDate ?? '').localeCompare(a.saleDate ?? ''))
}

export function tagFrequency(rows: ReviewRow[]): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) for (const t of r.tags) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
}

export function serviceCategories(rows: ReviewRow[]): string[] {
  return [...new Set(rows.map((r) => r.category).filter(Boolean))].sort()
}

export function allTags(rows: ReviewRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) for (const t of r.tags) set.add(t)
  return [...set].sort()
}
