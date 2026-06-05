import { useMemo, useState } from 'react'
import { FileDown, FileUp, Target, Upload, MoonStar } from 'lucide-react'
import type { EmployeeMetric, PerformanceTier } from '@shared/types'
import { locationName } from '@shared/locations'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { SkeletonCards } from '../components/Skeleton'
import { money, percent } from '../lib/format'
import { scoreColor, TIER_BADGE, TIER_LABEL } from '../lib/insights'
import { exportEmployeeGoalsExcel, exportEmployeePerformanceExcel } from '../lib/exporters'
import { EmployeeModal } from './coaching/EmployeeModal'
import { GoalsModal } from './coaching/GoalsModal'
import { useReports } from '../store/reports'
import { useUpload } from '../store/upload'

const COLUMNS: { tier: PerformanceTier; accent: string }[] = [
  { tier: 'performing', accent: '#3A7A4A' },
  { tier: 'on-track', accent: '#B8871A' },
  { tier: 'coaching', accent: '#C0392B' }
]

export function Coaching(): JSX.Element {
  const { metrics, goals } = useReports()
  const { start, parsing } = useUpload()
  const [selected, setSelected] = useState<EmployeeMetric | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)

  const goalsByCode = useMemo(() => new Map(goals.map((g) => [g.code, g])), [goals])
  const hasGoals = goals.length > 0

  if (parsing === 'metrics' && !metrics) return <SkeletonCards count={6} />

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-display text-brand-dark">Coaching</h1>
        <EmptyState
          title="No employee metrics loaded"
          message="Upload a Zenoti Employee Sales Metrics export (.csv). The app scores each employee against their peers in the same job at the same location, then lays out who to recognize and who needs a 1:1."
          action={<Button icon={<Upload size={16} />} onClick={() => start('metrics')}>Upload Employee Metrics</Button>}
        />
      </div>
    )
  }

  const location = locationName(metrics.locationId)
  const period = 'Current period'

  const byTier = (tier: PerformanceTier): EmployeeMetric[] =>
    metrics.employees.filter((e) => e.tier === tier).sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-brand-dark">Coaching</h1>
          <p className="mt-1 text-body text-text-secondary">
            {location} · {metrics.employees.length} active employees · scored vs. peers in the same role
            {hasGoals && <span className="ml-1 text-brand-mid">· goals loaded</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Target size={15} />} onClick={() => setGoalsOpen(true)}>
            Set / Edit Goals
          </Button>
          <Button variant="secondary" size="sm" icon={<FileUp size={15} />} onClick={() => exportEmployeeGoalsExcel(metrics.employees, { location, period })}>
            Export Goals Sheet
          </Button>
          <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportEmployeePerformanceExcel(metrics.employees, goalsByCode, { location, period })}>
            Export Performance
          </Button>
          <Button size="sm" icon={<Upload size={15} />} onClick={() => start('metrics')}>
            Re-upload
          </Button>
        </div>
      </div>

      {/* Three-column performance view (§6.2) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {COLUMNS.map(({ tier, accent }) => {
          const list = byTier(tier)
          return (
            <div key={tier} className="rounded-card border border-brand-stone bg-surface-gray/50">
              <div className="flex items-center justify-between rounded-t-card px-4 py-3" style={{ backgroundColor: `${accent}14` }}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="text-h2" style={{ color: accent }}>
                    {TIER_LABEL[tier]}
                  </span>
                </div>
                <Badge tone={TIER_BADGE[tier]}>{list.length}</Badge>
              </div>
              <div className="space-y-3 p-3">
                {list.map((e) => (
                  <EmployeeCard key={e.code} e={e} accent={accent} goal={goalsByCode.get(e.code)} hasGoals={hasGoals} onClick={() => setSelected(e)} />
                ))}
                {!list.length && <p className="px-2 py-6 text-center text-body-sm text-text-secondary">No employees in this tier.</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Activity (§6.2) */}
      {metrics.inactive.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <MoonStar size={16} className="text-text-secondary" />
            <span className="text-h2 text-brand-dark">No Activity</span>
            <Badge tone="neutral">{metrics.inactive.length}</Badge>
          </div>
          <p className="mb-3 text-body-sm text-text-secondary">
            Employees with zero guests this period — excluded from peer scoring.
          </p>
          <div className="flex flex-wrap gap-2">
            {metrics.inactive.map((e) => (
              <span key={e.code} className="rounded-lg border border-brand-stone bg-surface-gray px-3 py-1.5 text-body-sm text-text-secondary">
                {e.name} · {e.job}
              </span>
            ))}
          </div>
        </Card>
      )}

      <EmployeeModal employee={selected} location={location} period={period} goals={selected ? goalsByCode.get(selected.code) : undefined} onClose={() => setSelected(null)} />
      <GoalsModal open={goalsOpen} employees={metrics.employees} locationId={metrics.locationId} existing={goals} onClose={() => setGoalsOpen(false)} />
    </div>
  )
}

function EmployeeCard({
  e,
  accent,
  goal,
  hasGoals,
  onClick
}: {
  e: EmployeeMetric
  accent: string
  goal?: { rebookGoal: number | null; serviceRevenueGoal: number | null }
  hasGoals: boolean
  onClick: () => void
}): JSX.Element {
  const rebookDelta = goal?.rebookGoal != null ? e.rebookRate - goal.rebookGoal : null
  const revDelta = goal?.serviceRevenueGoal != null ? e.serviceRevenue - goal.serviceRevenueGoal : null

  return (
    <button
      onClick={onClick}
      className="block w-full rounded-card border border-brand-stone bg-surface-white p-3.5 text-left shadow-card transition-all hover:border-brand-mid hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-text-primary">{e.name}</p>
          <p className="truncate text-[11px] text-text-secondary">{e.job}</p>
        </div>
        <span className="text-h1 font-semibold leading-none" style={{ color: scoreColor(e.tier) }}>
          {Math.round(e.score)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Quick label="Revenue" value={money(e.serviceRevenue)} delta={revDelta} deltaFmt={(n) => money(Math.abs(n))} />
        <Quick label="Rebook" value={percent(e.rebookRate, 0)} delta={rebookDelta} deltaFmt={(n) => `${Math.abs(n).toFixed(0)}%`} />
        <Quick label="Product" value={percent(e.productAttachRate, 0)} />
      </div>
      {hasGoals && revDelta == null && rebookDelta == null && (
        <p className="mt-2 text-center text-[10px] text-text-secondary">No goal set</p>
      )}
    </button>
  )
}

function Quick({ label, value, delta, deltaFmt }: { label: string; value: string; delta?: number | null; deltaFmt?: (n: number) => string }): JSX.Element {
  return (
    <div className="rounded-md bg-surface-gray py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="text-body-sm font-medium text-text-primary">{value}</p>
      {delta != null && deltaFmt && (
        <p className={`text-[10px] ${delta >= 0 ? 'text-status-green' : 'text-status-red'}`}>
          {delta >= 0 ? '↑' : '↓'} {deltaFmt(delta)}
        </p>
      )}
    </div>
  )
}
