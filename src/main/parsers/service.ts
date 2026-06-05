import type { ParseResult, ServiceReport, ServiceRow } from '@shared/types'
import { canonicalLocationId } from '@shared/locations'
import {
  cellAt,
  cellToIso,
  col,
  decodeEntities,
  headerIndex,
  isTruthyFlag,
  num,
  parseCenterName,
  parseDateRange,
  readSheetGrid,
  str
} from './util'

const EXPECTED = [
  'Invoice No', 'ServiceName', 'Category', 'Sub Category', 'Sale Date', 'Guest',
  'EmployeeCode', 'Serviced By', 'Price', 'Discount', 'Net Price', 'Sale Value',
  'Status', 'AppointmentSource', 'FirstVisit', 'Requested'
]

function findHeaderRow(grid: unknown[][]): number {
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const joined = (grid[i] ?? []).map((c) => str(c).toLowerCase()).join('|')
    if (joined.includes('servicename') || (joined.includes('service') && joined.includes('serviced by')))
      return i
  }
  return 4
}

export function parseService(buffer: Buffer): ParseResult<ServiceReport> {
  let grid: unknown[][]
  try {
    grid = readSheetGrid(buffer, 'Sales Report').grid
  } catch (e) {
    return { ok: false, type: 'service', error: { code: 'parse-failure', message: `Could not read the Excel file. ${(e as Error).message}` } }
  }
  if (!grid.length) {
    return { ok: false, type: 'service', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  // Center name (row 1) + date range (row 2) — scanned for resilience.
  let locationId = 'unknown'
  let dateRange = { from: null as string | null, to: null as string | null }
  for (let i = 0; i < Math.min(grid.length, 5); i++) {
    const joined = (grid[i] ?? []).map(str).join(' ')
    const center = parseCenterName(joined)
    if (center && locationId === 'unknown') {
      locationId = canonicalLocationId(center) ?? 'unknown'
    }
    const dr = parseDateRange(joined)
    if ((dr.from || dr.to) && !dateRange.from) dateRange = dr
  }

  const headerRowIdx = findHeaderRow(grid)
  const idx = headerIndex(grid[headerRowIdx] ?? [])

  const cService = col(idx, 'ServiceName', 'Service Name', 'Service')
  const cServicedBy = col(idx, 'Serviced By', 'ServicedBy')
  if (cService < 0 || cServicedBy < 0) {
    return {
      ok: false,
      type: 'service',
      error: {
        code: 'wrong-structure',
        message: "This doesn't look like a Service Sales export. Please check the file and try again.",
        expectedColumns: EXPECTED
      }
    }
  }

  const c = {
    invoiceNo: col(idx, 'Invoice No'),
    service: cService,
    receiptNo: col(idx, 'Receipt No'),
    category: col(idx, 'Category'),
    subCategory: col(idx, 'Sub Category', 'SubCategory'),
    bookedDate: col(idx, 'Booked Date'),
    saleDate: col(idx, 'Sale Date'),
    guest: col(idx, 'Guest'),
    employeeCode: col(idx, 'EmployeeCode', 'Employee Code'),
    servicedBy: cServicedBy,
    quantity: col(idx, 'Quantity', 'Qty'),
    promotion: col(idx, 'Promotion'),
    price: col(idx, 'Price'),
    discount: col(idx, 'Discount'),
    netPrice: col(idx, 'Net Price'),
    tax: col(idx, 'Tax'),
    pricePaid: col(idx, 'Price Paid'),
    saleValue: col(idx, 'Sale Value'),
    paymentType: col(idx, 'Payment Type'),
    status: col(idx, 'Status'),
    appointmentSource: col(idx, 'AppointmentSource', 'Appointment Source'),
    guestCode: col(idx, 'GuestCode', 'Guest Code'),
    firstVisit: col(idx, 'FirstVisit', 'First Visit'),
    requested: col(idx, 'Requested')
  }

  const rows: ServiceRow[] = []
  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? []
    if (row.every((cell) => cell === null || cell === '')) continue
    const serviceName = str(cellAt(row, c.service))
    if (!serviceName || serviceName.toLowerCase().startsWith('total')) continue

    rows.push({
      invoiceNo: str(cellAt(row, c.invoiceNo)),
      serviceName,
      receiptNo: str(cellAt(row, c.receiptNo)),
      category: decodeEntities(cellAt(row, c.category)) || 'Uncategorized',
      subCategory: decodeEntities(cellAt(row, c.subCategory)),
      bookedDate: cellToIso(cellAt(row, c.bookedDate)),
      saleDate: cellToIso(cellAt(row, c.saleDate)),
      guest: str(cellAt(row, c.guest)),
      guestCenter: '',
      employeeCode: str(cellAt(row, c.employeeCode)),
      servicedBy: str(cellAt(row, c.servicedBy)),
      quantity: num(cellAt(row, c.quantity)) || 1,
      promotion: str(cellAt(row, c.promotion)),
      price: num(cellAt(row, c.price)),
      discount: num(cellAt(row, c.discount)),
      netPrice: num(cellAt(row, c.netPrice)),
      tax: num(cellAt(row, c.tax)),
      pricePaid: num(cellAt(row, c.pricePaid)),
      saleValue: num(cellAt(row, c.saleValue)),
      paymentType: str(cellAt(row, c.paymentType)),
      status: str(cellAt(row, c.status)),
      appointmentSource: str(cellAt(row, c.appointmentSource)) || 'Zenoti',
      guestCode: str(cellAt(row, c.guestCode)),
      firstVisit: isTruthyFlag(cellAt(row, c.firstVisit)),
      requested: isTruthyFlag(cellAt(row, c.requested))
    })
  }

  if (!rows.length) {
    return { ok: false, type: 'service', error: { code: 'empty', message: 'This file appears to be empty. Please re-export from Zenoti and try again.' } }
  }

  return { ok: true, type: 'service', data: { type: 'service', dateRange, locationId, rows } }
}
