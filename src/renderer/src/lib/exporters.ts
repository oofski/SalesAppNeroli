import type { ExcelExportRequest, ExcelSheetSpec, ExportResult, PdfExportRequest } from '@shared/ipc'
import type { AccrualRow, EmployeeGoals, EmployeeMetric, FeedbackReport, ReviewRow, ServiceRow } from '@shared/types'
import { locationName } from '@shared/locations'
import { useUi } from '../store/ui'
import { api } from './api'
import { money } from './format'
import { TIER_LABEL } from './insights'
import type { ProductAgg, ProductKpis, CategoryTotal } from './salesData'
import type { EmployeeRating } from './reviewsData'
import {
  coachingGuideHtml,
  lowRatingHtml,
  salesSummaryHtml,
  starPerformersHtml
} from './pdfTemplates'

interface Meta {
  location: string
  period: string
}

async function runExcel(req: ExcelExportRequest): Promise<void> {
  const res = await api.exports.excel(req)
  reportResult(res, 'Excel')
}

async function runPdf(req: PdfExportRequest): Promise<void> {
  const res = await api.exports.pdf(req)
  reportResult(res, 'PDF')
}

function reportResult(res: ExportResult, kind: string): void {
  const notify = useUi.getState().notify
  if (res.ok) notify(`${kind} saved to ${res.path}`, 'success')
  else if (!res.canceled) notify(res.error ?? `${kind} export failed.`, 'error')
}

// ---------- Product ----------

export function exportProductDetailExcel(rows: AccrualRow[], meta: Meta): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Product Sales',
    columns: [
      { header: 'Sale Date', key: 'saleDate', format: 'text' },
      { header: 'Invoice', key: 'invoiceNo', format: 'text' },
      { header: 'Client', key: 'clientName', format: 'text' },
      { header: 'Location', key: 'location', format: 'text' },
      { header: 'Item', key: 'itemName', format: 'text' },
      { header: 'Subcategory', key: 'subcategory', format: 'text' },
      { header: 'Vendor', key: 'vendor', format: 'text' },
      { header: 'Brand', key: 'brand', format: 'text' },
      { header: 'Qty', key: 'qty', format: 'int' },
      { header: 'Sales (exc tax)', key: 'salesExcTax', format: 'currency' },
      { header: 'Collected', key: 'collected', format: 'currency' },
      { header: 'Redeemed', key: 'redeemed', format: 'currency' },
      { header: 'Due', key: 'due', format: 'currency' }
    ],
    rows: rows.map((r) => ({
      saleDate: r.saleDate ?? '',
      invoiceNo: r.invoiceNo,
      clientName: r.clientName,
      location: locationName(r.locationId),
      itemName: r.itemName,
      subcategory: r.subcategory,
      vendor: r.vendor,
      brand: r.brand,
      qty: r.qty,
      salesExcTax: r.salesExcTax,
      collected: r.collected,
      redeemed: r.redeemed,
      due: r.due
    }))
  }
  return runExcel({
    kind: 'product-detail',
    title: 'Product Sales Detail',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Product_Detail_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportProductSummaryExcel(
  kpis: ProductKpis,
  categories: CategoryTotal[],
  products: ProductAgg[],
  meta: Meta
): Promise<void> {
  const sheets: ExcelSheetSpec[] = [
    {
      name: 'KPIs',
      columns: [
        { header: 'Metric', key: 'metric', format: 'text' },
        { header: 'Value', key: 'value', format: 'text' }
      ],
      rows: [
        { metric: 'Total Sales (exc tax)', value: money(kpis.totalSalesExcTax, true) },
        { metric: 'Total Collected', value: money(kpis.totalCollected, true) },
        { metric: 'Total Redeemed', value: money(kpis.totalRedeemed, true) },
        { metric: 'Total Outstanding', value: money(kpis.totalDue, true) },
        { metric: 'Units Sold', value: kpis.unitsSold }
      ]
    },
    {
      name: 'Categories',
      columns: [
        { header: 'Subcategory', key: 'label', format: 'text' },
        { header: 'Revenue', key: 'revenue', format: 'currency' },
        { header: 'Units', key: 'units', format: 'int' }
      ],
      rows: categories.map((c) => ({ label: c.label, revenue: c.revenue, units: c.units }))
    },
    {
      name: 'Top 25 Products',
      columns: [
        { header: 'Item', key: 'itemName', format: 'text' },
        { header: 'Subcategory', key: 'subcategory', format: 'text' },
        { header: 'Vendor', key: 'vendor', format: 'text' },
        { header: 'Units', key: 'units', format: 'int' },
        { header: 'Revenue', key: 'revenue', format: 'currency' },
        { header: 'Avg Price', key: 'avgPrice', format: 'currency' }
      ],
      rows: products.slice(0, 25).map((p) => ({
        itemName: p.itemName,
        subcategory: p.subcategory,
        vendor: p.vendor,
        units: p.units,
        revenue: p.revenue,
        avgPrice: p.avgPrice
      }))
    }
  ]
  return runExcel({
    kind: 'product-summary',
    title: 'Product Sales Summary',
    location: meta.location,
    period: meta.period,
    sheets,
    defaultFileName: `Neroli_Product_Summary_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportProductSummaryPdf(
  meta: Meta,
  kpis: ProductKpis,
  categories: CategoryTotal[],
  products: ProductAgg[]
): Promise<void> {
  const html = salesSummaryHtml(
    meta,
    [
      { label: 'Total Sales', value: money(kpis.totalSalesExcTax) },
      { label: 'Collected', value: money(kpis.totalCollected) },
      { label: 'Redeemed', value: money(kpis.totalRedeemed) },
      { label: 'Outstanding', value: money(kpis.totalDue) },
      { label: 'Units Sold', value: String(kpis.unitsSold) }
    ],
    categories,
    products.map((p) => ({ itemName: p.itemName, subcategory: p.subcategory, units: p.units, revenue: p.revenue }))
  )
  return runPdf({ kind: 'sales-summary', html, defaultFileName: `Neroli_Sales_Summary_${meta.location}.pdf`.replace(/\s+/g, '_') })
}

// ---------- Service ----------

export function exportServiceDetailExcel(rows: ServiceRow[], meta: Meta): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Service Detail',
    columns: [
      { header: 'Sale Date', key: 'saleDate', format: 'text' },
      { header: 'Invoice', key: 'invoiceNo', format: 'text' },
      { header: 'Employee', key: 'servicedBy', format: 'text' },
      { header: 'Guest', key: 'guest', format: 'text' },
      { header: 'Service', key: 'serviceName', format: 'text' },
      { header: 'Category', key: 'category', format: 'text' },
      { header: 'List Price', key: 'price', format: 'currency' },
      { header: 'Discount', key: 'discount', format: 'currency' },
      { header: 'Sale Value', key: 'saleValue', format: 'currency' },
      { header: 'Status', key: 'status', format: 'text' }
    ],
    rows: rows.map((r) => ({
      saleDate: r.saleDate ?? '',
      invoiceNo: r.invoiceNo,
      servicedBy: r.servicedBy,
      guest: r.guest,
      serviceName: r.serviceName,
      category: r.category,
      price: r.price,
      discount: r.discount,
      saleValue: r.saleValue,
      status: r.status
    }))
  }
  return runExcel({
    kind: 'service-detail',
    title: 'Service Sales Detail',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Service_Detail_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

// ---------- Coaching ----------

export function exportEmployeeGoalsExcel(employees: EmployeeMetric[], meta: Meta): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Employee Goals',
    columns: [
      { header: 'Employee Code', key: 'code', format: 'text' },
      { header: 'Employee Name', key: 'name', format: 'text' },
      { header: 'Job', key: 'job', format: 'text' },
      { header: 'Location', key: 'location', format: 'text' },
      { header: 'Service Revenue Goal', key: 'serviceRevenueGoal', format: 'currency' },
      { header: 'Product Sales Goal', key: 'productSalesGoal', format: 'currency' },
      { header: 'Rebook % Goal', key: 'rebookGoal', format: 'percent' },
      { header: 'Request % Goal', key: 'requestGoal', format: 'percent' },
      { header: 'Addon % Goal', key: 'addonGoal', format: 'percent' }
    ],
    rows: employees.map((e) => ({
      code: e.code,
      name: e.name,
      job: e.job,
      location: meta.location,
      serviceRevenueGoal: null,
      productSalesGoal: null,
      rebookGoal: null,
      requestGoal: null,
      addonGoal: null
    }))
  }
  return runExcel({
    kind: 'employee-goals',
    title: 'Employee Goals Sheet',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Goals_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportEmployeePerformanceExcel(
  employees: EmployeeMetric[],
  goals: Map<string, EmployeeGoals>,
  meta: Meta
): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Employee Performance',
    columns: [
      { header: 'Code', key: 'code', format: 'text' },
      { header: 'Name', key: 'name', format: 'text' },
      { header: 'Job', key: 'job', format: 'text' },
      { header: 'Tier', key: 'tier', format: 'text' },
      { header: 'Score', key: 'score', format: 'int' },
      { header: 'Service Rev', key: 'serviceRevenue', format: 'currency' },
      { header: 'Service Goal', key: 'serviceGoal', format: 'currency' },
      { header: 'Service Var', key: 'serviceVar', format: 'currency' },
      { header: 'Product Sales', key: 'productSales', format: 'currency' },
      { header: 'Rebook %', key: 'rebookRate', format: 'percent' },
      { header: 'Request %', key: 'requestRate', format: 'percent' },
      { header: 'Product Attach %', key: 'productAttachRate', format: 'percent' }
    ],
    rows: employees.map((e) => {
      const g = goals.get(e.code)
      return {
        code: e.code,
        name: e.name,
        job: e.job,
        tier: TIER_LABEL[e.tier],
        score: Math.round(e.score),
        serviceRevenue: e.serviceRevenue,
        serviceGoal: g?.serviceRevenueGoal ?? null,
        serviceVar: g?.serviceRevenueGoal != null ? e.serviceRevenue - g.serviceRevenueGoal : null,
        productSales: e.productSales,
        rebookRate: e.rebookRate,
        requestRate: e.requestRate,
        productAttachRate: e.productAttachRate
      }
    })
  }
  return runExcel({
    kind: 'employee-performance',
    title: 'Employee Performance',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Performance_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportCoachingGuidePdf(
  emp: EmployeeMetric,
  meta: Meta,
  goals: EmployeeGoals | undefined,
  notes: string
): Promise<void> {
  const html = coachingGuideHtml(
    emp,
    meta,
    {
      serviceRevenueGoal: goals?.serviceRevenueGoal ?? null,
      productSalesGoal: goals?.productSalesGoal ?? null,
      rebookGoal: goals?.rebookGoal ?? null,
      requestGoal: goals?.requestGoal ?? null,
      addonGoal: goals?.addonGoal ?? null
    },
    notes
  )
  const safe = emp.name.replace(/\s+/g, '_')
  return runPdf({
    kind: 'coaching-guide',
    html,
    defaultFileName: `Coaching_Guide_${safe}_${meta.location}_${meta.period}.pdf`.replace(/[^\w.]+/g, '_')
  })
}

// ---------- Reviews ----------

export function exportEmployeeRatingsExcel(ratings: EmployeeRating[], meta: Meta): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Employee Ratings',
    columns: [
      { header: 'Employee', key: 'name', format: 'text' },
      { header: 'Role', key: 'role', format: 'text' },
      { header: 'Avg Rating', key: 'avg', format: 'text' },
      { header: 'Total Reviews', key: 'total', format: 'int' },
      { header: '5-Star', key: 'fiveStar', format: 'int' },
      { header: 'Low (1–3)', key: 'lowRating', format: 'int' }
    ],
    rows: ratings.map((e) => ({
      name: e.name,
      role: e.role,
      avg: e.avg.toFixed(2),
      total: e.total,
      fiveStar: e.fiveStar,
      lowRating: e.lowRating
    }))
  }
  return runExcel({
    kind: 'employee-ratings',
    title: 'Employee Ratings',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Ratings_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportLowRatingExcel(reviews: ReviewRow[], meta: Meta): Promise<void> {
  const sheet: ExcelSheetSpec = {
    name: 'Low Ratings',
    columns: [
      { header: 'Rating', key: 'rating', format: 'int' },
      { header: 'Date', key: 'date', format: 'text' },
      { header: 'Location', key: 'location', format: 'text' },
      { header: 'Employee', key: 'provider', format: 'text' },
      { header: 'Service', key: 'service', format: 'text' },
      { header: 'Guest', key: 'guest', format: 'text' },
      { header: 'First Visit', key: 'firstVisit', format: 'text' },
      { header: 'Tags', key: 'tags', format: 'text' },
      { header: 'Comment', key: 'comment', format: 'text' }
    ],
    rows: reviews.map((r) => ({
      rating: r.rating,
      date: r.saleDate ?? '',
      location: locationName(r.locationId),
      provider: r.serviceProvider,
      service: r.service,
      guest: r.clientName,
      firstVisit: r.firstVisit ? 'Yes' : 'No',
      tags: r.tags.join(', '),
      comment: r.comments || 'No comment provided'
    }))
  }
  return runExcel({
    kind: 'low-rating-reviews',
    title: 'Low-Rating Reviews',
    location: meta.location,
    period: meta.period,
    sheets: [sheet],
    defaultFileName: `Neroli_Low_Ratings_${meta.location}.xlsx`.replace(/\s+/g, '_')
  })
}

export function exportLowRatingPdf(meta: Meta, reviews: ReviewRow[]): Promise<void> {
  return runPdf({
    kind: 'low-rating-reviews',
    html: lowRatingHtml(meta, reviews),
    defaultFileName: `Neroli_Low_Ratings_${meta.location}.pdf`.replace(/\s+/g, '_')
  })
}

export function exportStarPerformersPdf(meta: Meta, leaders: EmployeeRating[]): Promise<void> {
  return runPdf({
    kind: 'star-performers',
    html: starPerformersHtml(
      meta,
      leaders.map((e) => ({ name: e.name, role: e.role, fiveStar: e.fiveStar, total: e.total, avg: e.avg }))
    ),
    defaultFileName: `Neroli_Star_Performers_${meta.location}.pdf`.replace(/\s+/g, '_')
  })
}

export function exportCompanyReviewSummaryExcel(report: FeedbackReport, meta: Meta): Promise<void> {
  // One sheet per location (§8.3 Admin export).
  const byLoc = new Map<string, ReviewRow[]>()
  for (const r of report.rows) {
    if (!byLoc.has(r.locationId)) byLoc.set(r.locationId, [])
    byLoc.get(r.locationId)!.push(r)
  }
  const sheets: ExcelSheetSpec[] = [...byLoc.entries()].map(([loc, rows]) => ({
    name: locationName(loc).slice(0, 31),
    columns: [
      { header: 'Rating', key: 'rating', format: 'int' },
      { header: 'Date', key: 'date', format: 'text' },
      { header: 'Employee', key: 'provider', format: 'text' },
      { header: 'Service', key: 'service', format: 'text' },
      { header: 'Guest', key: 'guest', format: 'text' },
      { header: 'Tags', key: 'tags', format: 'text' },
      { header: 'Comment', key: 'comment', format: 'text' }
    ],
    rows: rows.map((r) => ({
      rating: r.rating,
      date: r.saleDate ?? '',
      provider: r.serviceProvider,
      service: r.service,
      guest: r.clientName,
      tags: r.tags.join(', '),
      comment: r.comments || 'No comment provided'
    }))
  }))
  return runExcel({
    kind: 'company-review-summary',
    title: 'Company Review Summary',
    location: 'All Locations',
    period: meta.period,
    sheets,
    defaultFileName: 'Neroli_Company_Review_Summary.xlsx'
  })
}
