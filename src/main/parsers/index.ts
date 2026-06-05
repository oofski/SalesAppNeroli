import type { ReportType } from '@shared/types'
import { readSheetGrid, str } from './util'
import { parseAccrual } from './accrual'
import { parseService } from './service'
import { parseMetrics } from './metrics'
import { parseFeedback } from './feedback'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB warning threshold (§12.1)

export interface ParseRequest {
  bytes: string // base64
  name: string
  type: ReportType
  locationId?: string // required for metrics (no location column)
}

/** Inspect a file's structure to guess which Zenoti report it is. */
export function detectReportType(name: string, buffer: Buffer): ReportType | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.csv')) return 'metrics'
  try {
    const { grid, sheetName } = readSheetGrid(buffer)
    const sn = sheetName.toLowerCase()
    if (sn.includes('accrual')) return 'accrual'
    if (sn === 'feedback') return 'feedback'
    if (sn.includes('sales report')) return 'service'
    const head = grid
      .slice(0, 8)
      .map((r) => (r ?? []).map(str).join(' ').toLowerCase())
      .join(' | ')
    if (head.includes('rating') && head.includes('client comments')) return 'feedback'
    if (head.includes('item subcategory') || head.includes('sales(inc. tax)')) return 'accrual'
    if (head.includes('servicename') || head.includes('serviced by')) return 'service'
  } catch {
    return null
  }
  return null
}

export function parseReport(req: ParseRequest) {
  const ext = req.name.toLowerCase()
  const isCsv = ext.endsWith('.csv')
  const isXlsx = ext.endsWith('.xlsx') || ext.endsWith('.xls')
  if (!isCsv && !isXlsx) {
    return {
      ok: false,
      type: req.type,
      error: {
        code: 'wrong-type' as const,
        message: "This file type isn't supported. Please upload an Excel (.xlsx) or CSV file."
      }
    }
  }

  const buffer = Buffer.from(req.bytes, 'base64')
  if (buffer.length > MAX_BYTES) {
    // Non-fatal: callers may surface a progress hint. We still attempt the parse.
  }

  switch (req.type) {
    case 'accrual':
      return parseAccrual(buffer)
    case 'service':
      return parseService(buffer)
    case 'feedback':
      return parseFeedback(buffer)
    case 'metrics':
      return parseMetrics(buffer.toString('utf-8'), req.locationId ?? 'unknown')
    default:
      return {
        ok: false,
        type: req.type,
        error: { code: 'parse-failure' as const, message: 'Unknown report type.' }
      }
  }
}
