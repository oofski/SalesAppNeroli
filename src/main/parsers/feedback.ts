import type { FeedbackReport, ParseResult, ReviewRow } from '@shared/types'
import { canonicalLocationId } from '@shared/locations'
import {
  cellAt,
  cellToIso,
  col,
  decodeEntities,
  headerIndex,
  isTruthyFlag,
  parseDateRange,
  ratingInt,
  readSheetGrid,
  str
} from './util'

const EXPECTED = [
  'Center Name', 'Invoice No', 'Client Name', 'Sale Date', 'Rating', 'Client Comments',
  'Tags', 'Service Provider', 'Service', 'Category', 'Sub-Category', 'First Visit', 'Member', 'Source'
]

function findHeaderRow(grid: unknown[][]): number {
  for (let i = 0; i < Math.min(grid.length, 8); i++) {
    const joined = (grid[i] ?? []).map((c) => str(c).toLowerCase()).join('|')
    if (joined.includes('rating') && joined.includes('center name')) return i
  }
  return 3
}

export function parseFeedback(buffer: Buffer): ParseResult<FeedbackReport> {
  let grid: unknown[][]
  try {
    grid = readSheetGrid(buffer, 'Feedback').grid
  } catch (e) {
    return { ok: false, type: 'feedback', error: { code: 'parse-failure', message: `Could not read the Excel file. ${(e as Error).message}` } }
  }
  if (!grid.length) {
    return { ok: false, type: 'feedback', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  let dateRange = { from: null as string | null, to: null as string | null }
  for (let i = 0; i < Math.min(grid.length, 4); i++) {
    const dr = parseDateRange((grid[i] ?? []).map(str).join(' '))
    if (dr.from || dr.to) {
      dateRange = dr
      break
    }
  }

  const headerRowIdx = findHeaderRow(grid)
  const idx = headerIndex(grid[headerRowIdx] ?? [])

  const cRating = col(idx, 'Rating')
  const cCenter = col(idx, 'Center Name', 'Center')
  if (cRating < 0 || cCenter < 0) {
    return {
      ok: false,
      type: 'feedback',
      error: {
        code: 'wrong-structure',
        message: "This doesn't look like a Feedback export. Please check the file and try again.",
        expectedColumns: EXPECTED
      }
    }
  }

  const c = {
    center: cCenter,
    invoiceNo: col(idx, 'Invoice No'),
    clientName: col(idx, 'Client Name', 'Guest'),
    saleDate: col(idx, 'Sale Date'),
    rating: cRating,
    comments: col(idx, 'Client Comments', 'Comments'),
    tags: col(idx, 'Tags'),
    apptStatus: col(idx, 'Appointment Status'),
    provider: col(idx, 'Service Provider', 'Serviced By'),
    service: col(idx, 'Service'),
    category: col(idx, 'Category'),
    subCategory: col(idx, 'Sub-Category', 'Sub Category'),
    firstVisit: col(idx, 'First Visit', 'FirstVisit'),
    member: col(idx, 'Member'),
    source: col(idx, 'Source')
  }

  const rows: ReviewRow[] = []
  const locationIds = new Set<string>()

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? []
    if (row.every((cell) => cell === null || cell === '')) continue
    const centerRaw = str(cellAt(row, c.center))
    if (!centerRaw || centerRaw.toLowerCase().startsWith('total')) continue

    const locId = canonicalLocationId(centerRaw) ?? 'unknown'
    if (locId !== 'unknown') locationIds.add(locId)

    const tagsRaw = str(cellAt(row, c.tags))
    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => decodeEntities(t).trim()).filter(Boolean)
      : []

    const comments = str(cellAt(row, c.comments))

    rows.push({
      locationId: locId,
      centerName: centerRaw,
      invoiceNo: str(cellAt(row, c.invoiceNo)),
      clientName: str(cellAt(row, c.clientName)),
      saleDate: cellToIso(cellAt(row, c.saleDate)),
      rating: ratingInt(cellAt(row, c.rating)),
      comments: comments || '', // UI renders "No comment provided" when empty
      tags,
      appointmentStatus: str(cellAt(row, c.apptStatus)),
      serviceProvider: str(cellAt(row, c.provider)),
      service: str(cellAt(row, c.service)),
      category: decodeEntities(cellAt(row, c.category)),
      subCategory: decodeEntities(cellAt(row, c.subCategory)),
      firstVisit: isTruthyFlag(cellAt(row, c.firstVisit)),
      member: isTruthyFlag(cellAt(row, c.member)),
      source: str(cellAt(row, c.source))
    })
  }

  if (!rows.length) {
    return { ok: false, type: 'feedback', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  return { ok: true, type: 'feedback', data: { type: 'feedback', dateRange, locationIds: [...locationIds], rows } }
}
