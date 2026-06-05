import type { AccrualReport, AccrualRow, ParseResult } from '@shared/types'
import { canonicalLocationId } from '@shared/locations'
import {
  cellAt,
  cellToIso,
  col,
  headerIndex,
  isTotalRow,
  num,
  parseDateRange,
  readSheetGrid,
  str,
  titleCase
} from './util'

const EXPECTED = [
  'Sale Date', 'Invoice No', 'Client Code', 'Client Name', 'Center Code', 'Center Name',
  'Item Code', 'Item Name', 'Qty', 'Sales (Exc. Tax)', 'Tax', 'Sales(Inc. Tax)',
  'Redeemed', 'Collected', 'Due', 'Item Subcategory', 'Vendor Name', 'Brand Name'
]

/** Locate the header row: documented at row index 3, but found by signature for resilience. */
function findHeaderRow(grid: unknown[][]): number {
  for (let i = 0; i < Math.min(grid.length, 8); i++) {
    const row = grid[i] ?? []
    const joined = row.map((c) => str(c).toLowerCase()).join('|')
    if (joined.includes('sale date') && joined.includes('item name')) return i
  }
  return 3
}

export function parseAccrual(buffer: Buffer): ParseResult<AccrualReport> {
  let grid: unknown[][]
  try {
    grid = readSheetGrid(buffer, 'Sales-Accrual').grid
  } catch (e) {
    return {
      ok: false,
      type: 'accrual',
      error: { code: 'parse-failure', message: `Could not read the Excel file. ${(e as Error).message}` }
    }
  }

  if (!grid.length) {
    return { ok: false, type: 'accrual', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  // Metadata row (date range) — documented at row 1; scan the first rows for "From".
  let dateRange = { from: null as string | null, to: null as string | null }
  for (let i = 0; i < Math.min(grid.length, 4); i++) {
    const joined = (grid[i] ?? []).map(str).join(' ')
    const dr = parseDateRange(joined)
    if (dr.from || dr.to) {
      dateRange = dr
      break
    }
  }

  const headerRowIdx = findHeaderRow(grid)
  const idx = headerIndex(grid[headerRowIdx] ?? [])

  const cSaleDate = col(idx, 'Sale Date')
  const cItemName = col(idx, 'Item Name')
  const cCenter = col(idx, 'Center Name')
  if (cSaleDate < 0 || cItemName < 0 || cCenter < 0) {
    return {
      ok: false,
      type: 'accrual',
      error: {
        code: 'wrong-structure',
        message:
          "This doesn't look like a Sales Accrual export. Please check the file and try again.",
        expectedColumns: EXPECTED
      }
    }
  }

  const c = {
    saleDate: cSaleDate,
    invoiceNo: col(idx, 'Invoice No', 'Invoice Number'),
    clientCode: col(idx, 'Client Code'),
    clientName: col(idx, 'Client Name'),
    centerCode: col(idx, 'Center Code'),
    centerName: cCenter,
    itemCode: col(idx, 'Item Code'),
    itemName: cItemName,
    qty: col(idx, 'Qty', 'Quantity'),
    salesExc: col(idx, 'Sales (Exc. Tax)', 'Sales(Exc. Tax)', 'Sales Exc Tax'),
    tax: col(idx, 'Tax'),
    salesInc: col(idx, 'Sales(Inc. Tax)', 'Sales (Inc. Tax)'),
    redeemed: col(idx, 'Redeemed'),
    collected: col(idx, 'Collected'),
    due: col(idx, 'Due'),
    invoiceDate: col(idx, 'Invoice Date'),
    invoiceClosed: col(idx, 'Invoice Closed Date'),
    subcat: col(idx, 'Item Subcategory', 'Subcategory'),
    notes: col(idx, 'Invoice Notes'),
    source: col(idx, 'Invoice Source'),
    vendor: col(idx, 'Vendor Name', 'Vendor'),
    brand: col(idx, 'Brand Name', 'Brand')
  }

  const rows: AccrualRow[] = []
  const locationIds = new Set<string>()

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? []
    if (row.every((cell) => cell === null || cell === '')) continue
    if (isTotalRow(cellAt(row, c.saleDate))) continue // trailing Total: summary (§14.1)

    const itemName = str(cellAt(row, c.itemName))
    if (!itemName) continue

    const locId = canonicalLocationId(str(cellAt(row, c.centerName))) ?? 'unknown'
    if (locId !== 'unknown') locationIds.add(locId)

    const subRaw = str(cellAt(row, c.subcat))
    rows.push({
      saleDate: cellToIso(cellAt(row, c.saleDate)),
      invoiceNo: str(cellAt(row, c.invoiceNo)),
      clientCode: str(cellAt(row, c.clientCode)),
      clientName: str(cellAt(row, c.clientName)),
      centerCode: str(cellAt(row, c.centerCode)),
      locationId: locId,
      itemCode: str(cellAt(row, c.itemCode)),
      itemName,
      qty: num(cellAt(row, c.qty)),
      salesExcTax: num(cellAt(row, c.salesExc)),
      tax: num(cellAt(row, c.tax)),
      salesIncTax: num(cellAt(row, c.salesInc)),
      redeemed: num(cellAt(row, c.redeemed)),
      collected: num(cellAt(row, c.collected)),
      due: num(cellAt(row, c.due)),
      invoiceDate: cellToIso(cellAt(row, c.invoiceDate)),
      invoiceClosedDate: cellToIso(cellAt(row, c.invoiceClosed)),
      subcategory: titleCase(subRaw) || 'Uncategorized',
      subcategoryRaw: subRaw,
      invoiceNotes: str(cellAt(row, c.notes)),
      invoiceSource: str(cellAt(row, c.source)),
      vendor: str(cellAt(row, c.vendor)) || 'Unknown',
      brand: str(cellAt(row, c.brand)) || 'Unknown'
    })
  }

  if (!rows.length) {
    return { ok: false, type: 'accrual', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  return {
    ok: true,
    type: 'accrual',
    data: { type: 'accrual', dateRange, locationIds: [...locationIds], rows }
  }
}
