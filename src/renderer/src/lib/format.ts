import type { DateRange } from '@shared/types'
import { locationName } from '@shared/locations'

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})

const currencyFmtCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const numberFmt = new Intl.NumberFormat('en-US')

export function money(n: number, cents = false): string {
  if (!isFinite(n)) return '$0'
  return (cents ? currencyFmtCents : currencyFmt).format(n)
}

export function count(n: number): string {
  return numberFmt.format(Math.round(n))
}

export function percent(n: number, digits = 1): string {
  if (!isFinite(n)) return '0%'
  return `${n.toFixed(digits)}%`
}

export function rating(n: number): string {
  return n.toFixed(2)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return iso
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** A short, human label for a report's covered period (used in headers and exports). */
export function periodLabel(range: DateRange): string {
  if (!range.from && !range.to) return 'All dates'
  const from = range.from ? new Date(range.from + 'T00:00:00') : null
  const to = range.to ? new Date(range.to + 'T00:00:00') : null
  if (from && to) {
    const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
    if (sameMonth) return `${MONTHS[from.getMonth()]} ${from.getDate()}–${to.getDate()}, ${to.getFullYear()}`
    return `${MONTHS[from.getMonth()]} ${from.getDate()} – ${MONTHS[to.getMonth()]} ${to.getDate()}, ${to.getFullYear()}`
  }
  const single = from ?? to!
  return `${MONTHS[single.getMonth()]} ${single.getFullYear()}`
}

/** Human label for the active-location filter, used in headers and export metadata. */
export function locationLabel(activeLocations: string[], allowed: string[]): string {
  const effective = activeLocations.length ? activeLocations : allowed
  if (!effective.length) return 'All locations'
  if (effective.length >= 5) return 'All locations'
  if (effective.length > 2) return `${effective.length} locations`
  return effective.map(locationName).join(' & ')
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Compact $ for axis labels e.g. 12500 -> "$12.5k". */
export function moneyCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `$${Math.round(n)}`
}
