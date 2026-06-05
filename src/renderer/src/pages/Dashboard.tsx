import { ArrowRight, Trash2, Package, Scissors, Star as StarIcon, AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'
import type { Route } from '../components/Sidebar'
import { KpiCard } from '../components/KpiCard'
import { Card, CardTitle } from '../components/Card'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { UploadMenu } from '../components/UploadMenu'
import { LocationFilter } from '../components/LocationFilter'
import { SparkBars } from '../components/charts/Sparkline'
import { SkeletonCards } from '../components/Skeleton'
import { Stars } from '../components/Stars'
import { money, rating, count } from '../lib/format'
import { byCategory, filterAccrual, productKpis } from '../lib/salesData'
import { scopedServices, serviceKpis } from '../lib/serviceData'
import { fiveStarLeaderboard, filterReviews, reviewKpis } from '../lib/reviewsData'
import { useAuth } from '../store/auth'
import { useReports } from '../store/reports'
import { useUpload } from '../store/upload'

const REPORT_TONE: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  accrual: 'green',
  service: 'amber',
  metrics: 'neutral',
  feedback: 'red'
}

export function Dashboard({ onNavigate }: { onNavigate: (r: Route) => void }): JSX.Element {
  const { user, isAdmin } = useAuth()
  const { accrual, services, metrics, feedback, uploads, activeLocations, removeUpload } = useReports()
  const parsing = useUpload((s) => s.parsing)

  const product = useMemo(() => filterAccrual(accrual, activeLocations), [accrual, activeLocations])
  const pk = useMemo(() => productKpis(product), [product])
  const scopedSvc = useMemo(() => scopedServices(services, activeLocations), [services, activeLocations])
  const sk = useMemo(() => serviceKpis(scopedSvc.flatMap((s) => s.rows)), [scopedSvc])
  const reviews = useMemo(() => filterReviews(feedback, activeLocations), [feedback, activeLocations])
  const rk = useMemo(() => reviewKpis(reviews), [reviews])

  const topCategories = useMemo(() => byCategory(product).slice(0, 3), [product])
  const topStars = useMemo(() => fiveStarLeaderboard(reviews).slice(0, 3), [reviews])
  const coachingCount = metrics?.employees.filter((e) => e.tier === 'coaching').length ?? 0

  const hasData = uploads.length > 0
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display text-brand-dark">Good to see you, {firstName}</h1>
          <p className="mt-1 text-body text-text-secondary">
            A pulse on what you’ve loaded this session.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin() && <LocationFilter variant="dropdown" />}
          <UploadMenu />
        </div>
      </header>

      {parsing && !hasData ? (
        <SkeletonCards />
      ) : !hasData ? (
        <EmptyState
          title="Upload a report to get started"
          message="Load a Zenoti export — product sales, service sales, employee metrics, or guest feedback — and the dashboard will surface the highlights here."
          action={<UploadMenu label="Upload your first report" />}
        />
      ) : (
        <>
          {/* Top KPI bar (§5.2) */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Total Product Sales"
              value={money(pk.totalSalesExcTax)}
              sub={accrual ? `${count(pk.unitsSold)} units` : 'No product report'}
              icon={<Package size={16} />}
            />
            <KpiCard
              label="Total Service Revenue"
              value={money(sk.netSaleValue)}
              sub={scopedSvc.length ? `${scopedSvc.length} location report(s)` : 'No service report'}
              icon={<Scissors size={16} />}
            />
            <KpiCard
              label="Overall Avg Review"
              value={feedback ? `${rating(rk.avgRating)} ★` : '—'}
              sub={feedback ? `${count(rk.total)} reviews` : 'No feedback report'}
              icon={<StarIcon size={16} />}
            />
            <KpiCard
              label="Low Ratings"
              value={count(rk.lowRating)}
              tone={rk.lowRating > 0 ? 'alert' : 'default'}
              sub={feedback ? '1–3 star reviews' : 'No feedback report'}
              icon={<AlertTriangle size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Uploaded reports panel */}
            <Card className="lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle>Uploaded Reports</CardTitle>
                <Badge tone="neutral">{uploads.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg border border-brand-stone bg-surface-gray px-3 py-2.5"
                  >
                    <Badge tone={REPORT_TONE[u.type]}>{u.type}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body-sm font-medium text-text-primary">{u.label}</div>
                      <div className="truncate text-[11px] text-text-secondary">{u.fileName}</div>
                    </div>
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="text-text-secondary transition-colors hover:text-status-red"
                      title="Remove report"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick insights (§5.2) */}
            <Card className="lg:col-span-2">
              <CardTitle>Quick Insights</CardTitle>
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <p className="kpi-label mb-2">Top Product Categories</p>
                  {topCategories.length ? (
                    <div className="space-y-2">
                      {topCategories.map((c) => (
                        <div key={c.label} className="flex items-center gap-3">
                          <SparkBars values={[c.units, c.revenue / 50, c.units * 1.4]} />
                          <span className="flex-1 truncate text-body-sm">{c.label}</span>
                          <span className="font-mono text-[13px] text-text-secondary">{money(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body-sm text-text-secondary">Upload a product report to see categories.</p>
                  )}
                </div>

                <div>
                  <p className="kpi-label mb-2">Top 5-Star Performers</p>
                  {topStars.length ? (
                    <div className="space-y-2">
                      {topStars.map((e, i) => (
                        <div key={e.name} className="flex items-center gap-3">
                          <span className="w-4 text-center font-mono text-[13px] text-text-secondary">{i + 1}</span>
                          <span className="flex-1 truncate text-body-sm">{e.name}</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[13px] text-brand-mid">
                            {e.fiveStar} <StarIcon size={12} fill="#8B7355" className="text-brand-warm" />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-body-sm text-text-secondary">Upload feedback to see star performers.</p>
                  )}
                </div>
              </div>

              {/* Flags row */}
              <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-stone pt-4">
                {rk.lowRating > 0 && (
                  <button
                    onClick={() => onNavigate('reviews')}
                    className="inline-flex items-center gap-2 rounded-lg bg-badge-red-bg px-3 py-2 text-body-sm font-medium text-status-red hover:brightness-95"
                  >
                    <AlertTriangle size={15} />
                    {rk.lowRating} review{rk.lowRating === 1 ? '' : 's'} below 4 stars — review
                    <ArrowRight size={14} />
                  </button>
                )}
                {coachingCount > 0 && (
                  <button
                    onClick={() => onNavigate('coaching')}
                    className="inline-flex items-center gap-2 rounded-lg bg-badge-amber-bg px-3 py-2 text-body-sm font-medium text-status-amber hover:brightness-95"
                  >
                    <StarIcon size={15} />
                    {coachingCount} employee{coachingCount === 1 ? '' : 's'} need coaching
                    <ArrowRight size={14} />
                  </button>
                )}
                {topStars.length > 0 && rk.lowRating === 0 && coachingCount === 0 && (
                  <p className="inline-flex items-center gap-2 text-body-sm text-status-green">
                    <Stars value={5} size={13} /> Everything looks healthy this period.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
