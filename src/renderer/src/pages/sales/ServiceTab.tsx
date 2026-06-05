import { useMemo, useState } from 'react'
import { AlertTriangle, FileDown, Upload, ChevronDown } from 'lucide-react'
import type { ServiceRow } from '@shared/types'
import { locationById, locationName, SPA_CATEGORIES } from '@shared/locations'
import { Card, CardTitle, SectionHeader } from '../../components/Card'
import { KpiCard } from '../../components/KpiCard'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { Table } from '../../components/Table'
import type { Column } from '../../components/Table'
import { HorizontalBarChart } from '../../components/charts/BarChart'
import { DonutChart } from '../../components/charts/DonutChart'
import { SkeletonCards } from '../../components/Skeleton'
import { money, count, percent, periodLabel, formatDate } from '../../lib/format'
import { paletteAt } from '../../lib/colors'
import {
  bookingSource,
  byServiceCategory,
  employeePerformance,
  openAppointments,
  paymentMix,
  promotions,
  scopedServices,
  serviceKpis
} from '../../lib/serviceData'
import { exportServiceDetailExcel } from '../../lib/exporters'
import { useReports } from '../../store/reports'
import { useUpload } from '../../store/upload'

export function ServiceTab(): JSX.Element {
  const { services, activeLocations } = useReports()
  const { start, parsing } = useUpload()
  const [activeTab, setActiveTab] = useState(0)
  const [catMode, setCatMode] = useState<'actual' | 'list'>('actual')
  const [showOpen, setShowOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const scoped = useMemo(() => scopedServices(services, activeLocations), [services, activeLocations])

  // Inner tabs: one per loaded location, plus Combined when more than one.
  const tabs = useMemo(() => {
    const base = scoped.map((s) => ({ id: s.locationId, label: locationName(s.locationId), rows: s.rows, range: s.dateRange }))
    if (base.length > 1)
      base.unshift({ id: 'combined', label: 'Combined', rows: scoped.flatMap((s) => s.rows), range: scoped[0].dateRange })
    return base
  }, [scoped])

  if (parsing === 'service' && !services.length) return <SkeletonCards count={6} />

  if (!services.length) {
    return (
      <EmptyState
        title="No service report loaded"
        message="Upload a Zenoti Service Sales export (.xlsx) — one per location. You’ll see service-category revenue, an employee performance table, booking sources, promotions, and guest insights."
        action={<Button icon={<Upload size={16} />} onClick={() => start('service')}>Upload Service Report</Button>}
      />
    )
  }

  const tab = tabs[Math.min(activeTab, tabs.length - 1)] ?? tabs[0]
  const rows = tab.rows
  const isCombined = tab.id === 'combined'
  const loc = locationById(tab.id)
  const hasSpa = isCombined ? true : (loc?.hasSpa ?? true)

  const kpis = serviceKpis(rows)
  const categoriesAll = byServiceCategory(rows)
  const suppressed = !hasSpa
    ? categoriesAll.filter((c) => SPA_CATEGORIES.some((s) => c.label.toLowerCase().includes(s.toLowerCase())))
    : []
  const categories = !hasSpa
    ? categoriesAll.filter((c) => !SPA_CATEGORIES.some((s) => c.label.toLowerCase().includes(s.toLowerCase())))
    : categoriesAll
  const employees = employeePerformance(rows)
  const sources = bookingSource(rows)
  const promos = promotions(rows)
  const promoTotal = promos.reduce((a, p) => a + p.discount, 0)
  const open = openAppointments(rows)
  const payments = paymentMix(rows)

  const meta = { location: isCombined ? 'All loaded locations' : locationName(tab.id), period: periodLabel(tab.range) }

  const empColumns: Column<(typeof employees)[number]>[] = [
    { key: 'name', header: 'Employee', render: (e) => <span className="font-medium text-text-primary">{e.name}</span> },
    { key: 'services', header: 'Services', align: 'right', mono: true, value: (e) => e.services, render: (e) => count(e.services) },
    { key: 'revenue', header: 'Revenue', align: 'right', mono: true, value: (e) => e.revenue, render: (e) => money(e.revenue) },
    { key: 'discounts', header: 'Discounts', align: 'right', mono: true, value: (e) => e.discounts, render: (e) => money(e.discounts) },
    { key: 'requestRate', header: 'Request Rate', align: 'right', mono: true, value: (e) => e.requestRate, render: (e) => percent(e.requestRate, 0) }
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Service Sales"
        subtitle={`${meta.location} · ${meta.period}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportServiceDetailExcel(rows, meta)}>
              Service Detail
            </Button>
            <Button size="sm" icon={<Upload size={15} />} onClick={() => start('service')}>
              Upload Service Report
            </Button>
          </div>
        }
      />

      {/* Inner location tabs */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(i)}
              className={`rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors ${
                i === activeTab ? 'bg-brand-dark text-white' : 'border border-brand-stone bg-surface-white text-text-secondary hover:border-brand-mid'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Open appointments banner (§5.3) */}
      {open.count > 0 && (
        <div className="overflow-hidden rounded-card border border-badge-amber-bg bg-badge-amber-bg/60">
          <button onClick={() => setShowOpen((s) => !s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <AlertTriangle size={18} className="text-status-amber" />
            <span className="flex-1 text-body font-medium text-status-amber">
              {open.count} appointment{open.count === 1 ? '' : 's'} pending close — {money(open.uncollected)} in uncollected revenue
            </span>
            <ChevronDown size={16} className={`text-status-amber transition-transform ${showOpen ? 'rotate-180' : ''}`} />
          </button>
          {showOpen && (
            <div className="border-t border-status-amber/20 bg-surface-white px-4 py-3">
              <div className="max-h-44 overflow-auto">
                {open.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-brand-stone/50 py-1.5 text-body-sm last:border-0">
                    <span className="flex-1">{r.serviceName}</span>
                    <span className="text-text-secondary">{r.servicedBy}</span>
                    <span className="font-mono">{money(r.saleValue, true)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard label="Gross Price" value={money(kpis.grossPrice)} />
        <KpiCard label="Net Sale Value" value={money(kpis.netSaleValue)} />
        <KpiCard label="Discounts" value={money(kpis.discounts)} tone={kpis.discounts > 0 ? 'alert' : 'default'} />
        <KpiCard label="Open Appts" value={count(kpis.openCount)} tone={kpis.openCount > 0 ? 'alert' : 'default'} />
        <KpiCard label="New Guests" value={count(kpis.newGuests)} />
        <KpiCard label="Request Rate" value={percent(kpis.requestRate, 0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Revenue by Service Category</CardTitle>
            <Toggle options={[{ v: 'actual', l: 'Actual' }, { v: 'list', l: 'List Price' }]} value={catMode} onChange={(v) => setCatMode(v as 'actual' | 'list')} />
          </div>
          <HorizontalBarChart
            data={categories.map((c) => ({ id: c.label, label: c.label, value: catMode === 'actual' ? c.actual : c.listPrice, meta: catMode === 'actual' && c.listPrice > c.actual ? `−${money(c.listPrice - c.actual)}` : undefined }))}
            format={(n) => money(n)}
          />
          {suppressed.length > 0 && (
            <div className="mt-4 rounded-lg bg-surface-gray px-3 py-2.5">
              <p className="text-body-sm text-text-secondary">
                <span className="font-medium">Not available at {meta.location}:</span>{' '}
                {suppressed.map((s) => s.label).join(', ')} — spa categories are hidden for this location.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Booking Source</CardTitle>
          <div className="mt-4">
            <DonutChart data={sources.map((s, i) => ({ label: s.label, value: s.value, color: paletteAt(i) }))} centerLabel="APPTS" />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Employee Performance</CardTitle>
        <p className="mb-3 mt-0.5 text-body-sm text-text-secondary">Click a row to see that employee’s service log for the period.</p>
        <Table
          columns={empColumns}
          rows={employees}
          rowKey={(e) => e.name}
          initialSort={{ key: 'revenue', dir: 'desc' }}
          maxHeight="440px"
          expandedKey={expanded}
          onRowClick={(e) => setExpanded((cur) => (cur === e.name ? null : e.name))}
          renderExpanded={(e) => <ServiceLog rows={e.rows} />}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Promotions &amp; Discounts</CardTitle>
            <Badge tone="amber">{money(promoTotal)} total</Badge>
          </div>
          <div className="max-h-72 overflow-auto">
            {promos.length ? (
              <table className="w-full text-body-sm">
                <thead className="sticky top-0 bg-surface-white">
                  <tr className="text-left text-[11px] uppercase text-text-secondary">
                    <th className="py-1.5">Employee</th>
                    <th className="py-1.5">Guest</th>
                    <th className="py-1.5">Promo</th>
                    <th className="py-1.5 text-right">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p, i) => (
                    <tr key={i} className="border-t border-brand-stone/60">
                      <td className="py-1.5">{p.employee}</td>
                      <td className="py-1.5 text-text-secondary">{p.guest}</td>
                      <td className="py-1.5">{p.promo}</td>
                      <td className="py-1.5 text-right font-mono">{money(p.discount, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-6 text-center text-body-sm text-text-secondary">No promotions applied this period.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Guest Insights</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Insight label="New Guests" value={count(kpis.newGuests)} sub={`${percent(rows.length ? (kpis.newGuests / rows.length) * 100 : 0, 0)} of visits`} />
            <Insight label="Request Rate" value={percent(kpis.requestRate, 0)} sub="requested a provider" />
          </div>
          <p className="kpi-label mt-5 mb-2">Payment Method Mix</p>
          <DonutChart data={payments.map((p, i) => ({ label: p.label, value: p.value, color: paletteAt(i + 2) }))} centerLabel="PAID" />
        </Card>
      </div>
    </div>
  )
}

function ServiceLog({ rows }: { rows: ServiceRow[] }): JSX.Element {
  return (
    <div className="rounded-lg bg-surface-white p-2">
      <p className="kpi-label mb-2 px-1">{rows.length} services</p>
      <div className="max-h-52 overflow-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-text-secondary">
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Service</th>
              <th className="px-2 py-1">Guest</th>
              <th className="px-2 py-1 text-right">Sale</th>
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-brand-stone/60">
                <td className="px-2 py-1">{formatDate(r.saleDate)}</td>
                <td className="px-2 py-1">{r.serviceName}</td>
                <td className="px-2 py-1 text-text-secondary">{r.guest}</td>
                <td className="px-2 py-1 text-right font-mono">{money(r.saleValue, true)}</td>
                <td className="px-2 py-1">
                  {r.status.toLowerCase() === 'open' ? <Badge tone="amber">Open</Badge> : r.status || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Insight({ label, value, sub }: { label: string; value: string; sub: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-surface-gray px-3 py-3">
      <p className="kpi-label">{label}</p>
      <p className="mt-1 text-h1 text-brand-dark">{value}</p>
      <p className="text-[11px] text-text-secondary">{sub}</p>
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
