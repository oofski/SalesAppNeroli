import * as XLSX from 'xlsx'
import type { DateRange } from '@shared/types'

/** Read an .xlsx buffer into a sheet grid (array of rows, each an array of cells). */
export function readSheetGrid(
  buffer: Buffer,
  preferredSheet?: string
): { grid: unknown[][]; sheetName: string } {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  let sheetName = preferredSheet && wb.SheetNames.includes(preferredSheet)
    ? preferredSheet
    : wb.SheetNames[0]
  if (!sheetName) sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true
  })
  return { grid, sheetName }
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
}

function toIso(day: string, month: string, year: string): string | null {
  const m = MONTHS[month.slice(0, 3).toLowerCase()]
  if (m === undefined) return null
  const d = new Date(Date.UTC(Number(year), m, Number(day)))
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Parse a Zenoti metadata string like "From : 01 May 2026 To : 31 May 2026"
 * into an ISO date range (§14.1).
 */
export function parseDateRange(text: string | null | undefined): DateRange {
  if (!text) return { from: null, to: null }
  const s = String(text)
  const re =
    /From\s*:?\s*(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4}).*?To\s*:?\s*(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/i
  const m = s.match(re)
  if (!m) return { from: null, to: null }
  return { from: toIso(m[1], m[2], m[3]), to: toIso(m[4], m[5], m[6]) }
}

/** Extract a location name from "Center : [Location]" (Service report, §14.2). */
export function parseCenterName(text: string | null | undefined): string | null {
  if (!text) return null
  const m = String(text).match(/Center\s*:?\s*(.+)$/i)
  return m ? m[1].trim() : null
}

/** Coerce a cell to a finite number; blanks/garbage become 0 (errors='coerce'). */
export function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[$,%\s]/g, '').replace(/[()]/g, '')
  const n = parseFloat(cleaned)
  return isFinite(n) ? n : 0
}

/** Coerce a 1–5 rating to an integer, clamped (§14.4). */
export function ratingInt(value: unknown): number {
  const n = Math.round(num(value))
  return Math.min(5, Math.max(0, n))
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Decode the handful of HTML entities Zenoti leaves in Category fields (§14.2/§14.4). */
export function decodeEntities(value: unknown): string {
  return str(value)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
}

export function titleCase(value: unknown): string {
  return str(value)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Convert a cell that may be a Date, an Excel serial, or a string into an ISO date. */
export function cellToIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  const parsed = new Date(String(value))
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function isTruthyFlag(value: unknown): boolean {
  const s = str(value).toLowerCase()
  return s === 'yes' || s === 'true' || s === 'y' || s === '1'
}

/** Map raw header cells to indexes, tolerant of case and surrounding whitespace. */
export function headerIndex(headerRow: unknown[]): Record<string, number> {
  const idx: Record<string, number> = {}
  headerRow.forEach((cell, i) => {
    const key = str(cell).toLowerCase().replace(/\s+/g, ' ')
    if (key) idx[key] = i
  })
  return idx
}

/** Find a column index by trying several header aliases. */
export function col(idx: Record<string, number>, ...aliases: string[]): number {
  for (const a of aliases) {
    const key = a.toLowerCase().replace(/\s+/g, ' ')
    if (key in idx) return idx[key]
  }
  return -1
}

export function cellAt(row: unknown[], index: number): unknown {
  if (index < 0 || index >= row.length) return null
  return row[index]
}

/** True when a row is the trailing "Total:" summary row (§14.1). */
export function isTotalRow(firstCell: unknown): boolean {
  return str(firstCell).toLowerCase().startsWith('total')
}
