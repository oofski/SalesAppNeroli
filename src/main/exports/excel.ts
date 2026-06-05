import ExcelJS from 'exceljs'
import type { ExcelExportRequest } from '@shared/ipc'

const BRAND_DARK = 'FF2C3E35'
const ALT_ROW = 'FFF5F4F2'
const WHITE = 'FFFFFFFF'
const MUTED = 'FF6B6864'

const FORMATS: Record<string, string> = {
  currency: '$#,##0.00',
  percent: '0.0%',
  int: '#,##0',
  text: '@'
}

/** Build a styled .xlsx workbook to the Build Plan §8.3 standards and write it to disk. */
export async function writeExcel(req: ExcelExportRequest, savePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Neroli Sales App'
  wb.created = new Date()

  for (const sheetSpec of req.sheets) {
    const ws = wb.addWorksheet(sheetSpec.name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 4 }] // freeze through the header row
    })

    // Row 1: report title.
    ws.mergeCells(1, 1, 1, Math.max(sheetSpec.columns.length, 1))
    const titleCell = ws.getCell(1, 1)
    titleCell.value = `Neroli Salon & Spa — ${req.title}`
    titleCell.font = { name: 'Inter', size: 14, bold: true, color: { argb: BRAND_DARK } }

    // Row 2: location / period / generated.
    ws.mergeCells(2, 1, 2, Math.max(sheetSpec.columns.length, 1))
    const metaCell = ws.getCell(2, 1)
    metaCell.value = `${req.location}   •   ${req.period}   •   Generated ${new Date().toLocaleDateString()}`
    metaCell.font = { name: 'Inter', size: 10, color: { argb: MUTED } }

    // Row 4: header.
    const headerRow = ws.getRow(4)
    sheetSpec.columns.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = c.header
      cell.font = { name: 'Inter', bold: true, color: { argb: WHITE } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } }
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD4CFC8' } } }
    })
    headerRow.height = 20

    // Data rows from row 5.
    sheetSpec.rows.forEach((row, r) => {
      const xlRow = ws.getRow(5 + r)
      sheetSpec.columns.forEach((c, i) => {
        const cell = xlRow.getCell(i + 1)
        const raw = row[c.key]
        if (c.format === 'percent' && typeof raw === 'number') {
          cell.value = raw / 100 // stored as 0..100; Excel % format expects a fraction
        } else {
          cell.value = raw === null || raw === undefined ? '' : raw
        }
        if (c.format && FORMATS[c.format]) cell.numFmt = FORMATS[c.format]
        if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW } }
        cell.font = { name: 'Inter', size: 11, color: { argb: 'FF1A1A1A' } }
      })
    })

    // Auto-fit column widths to content (never truncated), with a sensible minimum.
    sheetSpec.columns.forEach((c, i) => {
      let max = c.header.length
      for (const row of sheetSpec.rows) {
        const v = row[c.key]
        if (v !== null && v !== undefined) max = Math.max(max, String(v).length)
      }
      ws.getColumn(i + 1).width = Math.min(48, Math.max(12, max + 2, (c.width ?? 0)))
    })
  }

  await wb.xlsx.writeFile(savePath)
}
