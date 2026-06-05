import { useMemo, useState } from 'react'
import { FileDown, FileText, Search, Upload } from 'lucide-react'
import type { AccrualRow } from '@shared/types'
import { Card, CardTitle, SectionHeader } from '../../components/Card'
import { KpiCard } from '../../components/KpiCard'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { LocationFilter } from '../../components/LocationFilter'
import { Table } from '../../components/Table'
import type { Column } from '../../components/Table'
import { HorizontalBarChart } from '../../components/charts/BarChart'
import { LineChart } from '../../components/charts/LineChart'
import type { LineSeries } from '../../components/charts/LineChart'
import { SkeletonCards } from '../../components/Skeleton'
import { money, count, periodLabel, formatDate, locationLabel } from '../../lib/format'
import { LOCATION_COLOR } from '../../lib/colors'
import { locationName } from '@shared/locations'
import {
  aggregateProducts,
  brands,
  byCategory,
  byVendor,
  dailyTrend,
  filterAccrual,
  productKpis,
  subcategories,
  topClients,
  vendors
} from '../../lib/salesData'
import {
  exportProductDetailExcel,
  exportProductSummaryExcel,
  exportProductSummaryPdf
} from '../../lib/exporters'
import { useAuth } from '../../store/auth'
import { useReports } from '../../store/reports'
import { useUpload } from '../../store/upload'

export function ProductTab(): JSX.Element {
  const { isAdmin, allowedLocations } = useAuth()
  const { accrual, activeLocations } = useReports()
  const { start, parsing } = useUpload()

  const [catMode, setCatMode] = useState<'revenue' | 'units'>('revenue')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [fSub, setFSub] = useState('')
  const [fVendor, setFVendor] = useState('')
  const [fBrand, setFBrand] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [topN, setTopN] = useState<10 | 25>(10)
  const [topMode, setTopMode] = useState<'revenue' | 'units'>('revenue')

  const rows = useMemo(() => filterAccrual(accrual, activeLocations), [accrual, activeLocations])
  const kpis = useMemo(() => productKpis(rows), [rows])
  const categories = useMemo(() => byCategory(rows), [rows])
  const vendorBreak = useMemo(() => byVendor(rows), [rows])
  const products = useMemo(() => aggregateProducts(rows), [rows])
  const clients = useMemo(() => topClients(rows).slice(0, 10), [rows])

  const trendSeries: LineSeries[] = useMemo(() => {
    const trend = dailyTrend(rows)
    return [...trend.entries()].map(([loc, m]) => ({
      id: loc,
      label: locationName(loc),
      color: LOCATION_COLOR[loc] ?? '#4A6741',
      points: [...m.entries()].map(([x, y]) => ({ x, y })).sort((a, b) => a.x.localeCompare(b.x))
    }))
  }, [rows])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCat && p.subcategory !== selectedCat) return false
      if (fSub && p.subcategory !== fSub) return false
      if (fVendor && p.vendor !== fVendor) return false
      if (fBrand && p.brand !== fBrand) return false
      if (search && !p.itemName.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, selectedCat, fSub, fVendor, fBrand, search])

  const meta = { location: locationLabel(activeLocations, allowedLocations()), period: accrual ? periodLabel(accrual.dateRange) : 'All dates' }

  if (parsing === 'accrual' && !accrual) return <SkeletonCards count={5} />

  if (!accrual) {
    return (
      <EmptyState
        title="No product report loaded"
        message="Upload a Zenoti Sales-Accrual export (.xlsx) to see product KPIs, category and vendor breakdowns, the daily trend, and a searchable product table."
        action={<Button icon={<Upload size={16} />} onClick={() => start('accrual')}>Upload Accrual Report</Button>}
      />
    )
  }

  const productColumns: Column<(typeof products)[number]>[] = [
    { key: 'itemName', header: 'Item Name', render: (p) => <span className="font-medium text-text-primary">{p.itemName}</span> },
    { key: 'subcategory', header: 'Subcategory' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'units', header: 'Units', align: 'right', mono: true, value: (p) => p.units, render: (p) => count(p.units) },
    { key: 'revenue', header: 'Revenue', align: 'right', mono: true, value: (p) => p.revenue, render: (p) => money(p.revenue) },
    { key: 'avgPrice', header: 'Avg Price', align: 'right', mono: true, value: (p) => p.avgPrice, render: (p) => money(p.avgPrice, true) }
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Product Sales"
        subtitle={`${meta.location} · ${meta.period}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileText size={15} />} onClick={() => exportProductSummaryPdf(meta, kpis, categories, products)}>
              PDF
            </Button>
            <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportProductSummaryExcel(kpis, categories, products, meta)}>
              Summary
            </Button>
            <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportProductDetailExcel(rows, meta)}>
              Detail
            </Button>
            <Button size="sm" icon={<Upload size={15} />} onClick={() => start('accrual')}>
              Re-upload
            </Button>
          </div>
        }
      />

      {isAdmin() && <LocationFilter available={accrual.locationIds} />}

      {/* KPI row (§5.3) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total Sales (exc tax)" value={money(kpis.totalSalesExcTax)} />
        <KpiCard label="Total Collected" value={money(kpis.totalCollected)} />
        <KpiCard label="Total Redeemed" value={money(kpis.totalRedeemed)} />
        <KpiCard label="Total Outstanding" value={money(kpis.totalDue)} tone={kpis.totalDue > 0 ? 'alert' : 'default'} />
        <KpiCard label="Units Sold" value={count(kpis.unitsSold)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Revenue by Category</CardTitle>
            <Toggle options={[{ v: 'revenue', l: 'Revenue' }, { v: 'units', l: 'Units' }]} value={catMode} onChange={(v) => setCatMode(v as 'revenue' | 'units')} />
          </div>
          {selectedCat && (
            <button onClick={() => setSelectedCat(null)} className="mb-3 inline-flex items-center gap-1.5 text-body-sm text-brand-mid hover:text-brand-dark">
              <Badge tone="green">{selectedCat}</Badge> Clear drill-down ✕
            </button>
          )}
          <HorizontalBarChart
            data={categories.map((c) => ({ id: c.label, label: c.label, value: catMode === 'revenue' ? c.revenue : c.units }))}
            format={catMode === 'revenue' ? (n) => money(n) : (n) => count(n)}
            onBarClick={(d) => setSelectedCat((cur) => (cur === d.id ? null : d.id ?? null))}
            activeId={selectedCat}
          />
        </Card>

        <Card>
          <CardTitle>Vendor / Brand Breakdown</CardTitle>
          <div className="mt-4">
            <HorizontalBarChart
              data={vendorBreak.map((v) => ({ id: v.label, label: v.label, value: v.revenue, meta: `${v.pct.toFixed(0)}%` }))}
              format={(n) => money(n)}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Daily Sales Trend</CardTitle>
        <div className="mt-4">
          <LineChart series={trendSeries} format={(n) => money(n)} />
        </div>
      </Card>

      {/* Product search & drill-down */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Product Search</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-52 rounded-lg border border-brand-stone bg-surface-white py-2 pl-9 pr-3 text-body-sm outline-none focus:border-brand-mid"
              />
            </div>
            <Select value={fSub} onChange={setFSub} placeholder="All subcategories" options={subcategories(rows)} />
            <Select value={fVendor} onChange={setFVendor} placeholder="All vendors" options={vendors(rows)} />
            <Select value={fBrand} onChange={setFBrand} placeholder="All brands" options={brands(rows)} />
          </div>
        </div>
        <Table
          columns={productColumns}
          rows={filteredProducts}
          rowKey={(p) => p.itemName}
          initialSort={{ key: 'revenue', dir: 'desc' }}
          maxHeight="460px"
          expandedKey={expanded}
          onRowClick={(p) => setExpanded((cur) => (cur === p.itemName ? null : p.itemName))}
          renderExpanded={(p) => <TransactionList rows={p.transactions} />}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Top Products</CardTitle>
            <div className="flex gap-2">
              <Toggle options={[{ v: 'revenue', l: 'Revenue' }, { v: 'units', l: 'Units' }]} value={topMode} onChange={(v) => setTopMode(v as 'revenue' | 'units')} />
              <Toggle options={[{ v: '10', l: 'Top 10' }, { v: '25', l: 'Top 25' }]} value={String(topN)} onChange={(v) => setTopN(Number(v) as 10 | 25)} />
            </div>
          </div>
          <div className="space-y-1.5">
            {[...products]
              .sort((a, b) => (topMode === 'revenue' ? b.revenue - a.revenue : b.units - a.units))
              .slice(0, topN)
              .map((p, i) => (
                <div key={p.itemName} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-gray">
                  <span className="w-5 text-center font-mono text-[13px] text-text-secondary">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-body-sm">{p.itemName}</span>
                  <span className="text-[11px] text-text-secondary">{p.subcategory}</span>
                  <span className="w-24 text-right font-mono text-[13px] text-brand-dark">
                    {topMode === 'revenue' ? money(p.revenue) : `${count(p.units)} u`}
                  </span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Top Clients</CardTitle>
          <div className="mt-4 space-y-1.5">
            {clients.map((c, i) => (
              <div key={c.clientName + i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-gray">
                <span className="w-5 text-center font-mono text-[13px] text-text-secondary">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-body-sm">{c.clientName}</span>
                <span className="text-[11px] text-text-secondary">{c.transactions} txns</span>
                <span className="w-24 text-right font-mono text-[13px] text-brand-dark">{money(c.spend)}</span>
              </div>
            ))}
            {!clients.length && <p className="text-body-sm text-text-secondary">No client data.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TransactionList({ rows }: { rows: AccrualRow[] }): JSX.Element {
  return (
    <div className="rounded-lg bg-surface-white p-2">
      <p className="kpi-label mb-2 px-1">{rows.length} transactions</p>
      <div className="max-h-52 overflow-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-text-secondary">
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Location</th>
              <th className="px-2 py-1">Client</th>
              <th className="px-2 py-1">Invoice</th>
              <th className="px-2 py-1 text-right">Collected</th>
              <th className="px-2 py-1 text-right">Redeemed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={i} className="border-t border-brand-stone/60">
                <td className="px-2 py-1">{formatDate(t.saleDate)}</td>
                <td className="px-2 py-1">{locationName(t.locationId)}</td>
                <td className="px-2 py-1">{t.clientName || '—'}</td>
                <td className="px-2 py-1 font-mono text-[12px]">{t.invoiceNo}</td>
                <td className="px-2 py-1 text-right font-mono">{money(t.collected, true)}</td>
                <td className="px-2 py-1 text-right font-mono">{money(t.redeemed, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Toggle({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-brand-stone bg-surface-white p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
            value === o.v ? 'bg-brand-dark text-white' : 'text-text-secondary hover:text-brand-dark'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-brand-stone bg-surface-white px-3 py-2 text-body-sm text-text-primary outline-none focus:border-brand-mid"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
