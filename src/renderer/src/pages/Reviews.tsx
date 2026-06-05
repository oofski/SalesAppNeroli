import { useMemo, useState } from 'react'
import { FileDown, FileText, Upload, Star as StarIcon } from 'lucide-react'
import type { ReviewRow } from '@shared/types'
import { locationName } from '@shared/locations'
import { Card, CardTitle, SectionHeader } from '../components/Card'
import { KpiCard } from '../components/KpiCard'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { LocationFilter } from '../components/LocationFilter'
import { Table } from '../components/Table'
import type { Column } from '../components/Table'
import { HorizontalBarChart } from '../components/charts/BarChart'
import { SkeletonCards } from '../components/Skeleton'
import { Stars, RatingDot } from '../components/Stars'
import { money, count, rating, periodLabel, formatDate, locationLabel } from '../lib/format'
import {
  allTags,
  employeeRatings,
  filterReviews,
  fiveStarLeaderboard,
  locationAverages,
  lowRatingReviews,
  reviewKpis,
  serviceCategories,
  tagFrequency
} from '../lib/reviewsData'
import {
  exportCompanyReviewSummaryExcel,
  exportEmployeeRatingsExcel,
  exportLowRatingExcel,
  exportLowRatingPdf,
  exportStarPerformersPdf
} from '../lib/exporters'
import { useAuth } from '../store/auth'
import { useReports } from '../store/reports'
import { useUpload } from '../store/upload'

const RATING_BADGE: Record<number, 'red' | 'amber'> = { 1: 'red', 2: 'red', 3: 'amber' }

export function Reviews(): JSX.Element {
  const { isAdmin, allowedLocations } = useAuth()
  const { feedback, activeLocations } = useReports()
  const { start, parsing } = useUpload()

  const [leaderTop, setLeaderTop] = useState<10 | 15>(10)
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null)
  const [fRating, setFRating] = useState<'all' | '1' | '2' | '3'>('all')
  const [fEmp, setFEmp] = useState('')
  const [fCat, setFCat] = useState('')
  const [fTag, setFTag] = useState('')
  const [fFirst, setFFirst] = useState<'all' | 'yes' | 'no'>('all')
  const [tagScope, setTagScope] = useState<'all' | 'low'>('all')

  const rows = useMemo(() => filterReviews(feedback, activeLocations), [feedback, activeLocations])
  const kpis = useMemo(() => reviewKpis(rows), [rows])
  const locAverages = useMemo(() => locationAverages(rows), [rows])
  const leaders = useMemo(() => fiveStarLeaderboard(rows), [rows])
  const empRatings = useMemo(() => employeeRatings(rows), [rows])
  const lowReviews = useMemo(() => lowRatingReviews(rows), [rows])
  const tagsAll = useMemo(() => tagFrequency(rows), [rows])
  const tagsLow = useMemo(() => tagFrequency(lowReviews), [lowReviews])

  const filteredLow = useMemo(() => {
    return lowReviews.filter((r) => {
      if (fRating !== 'all' && r.rating !== Number(fRating)) return false
      if (fEmp && !r.serviceProvider.toLowerCase().includes(fEmp.toLowerCase())) return false
      if (fCat && r.category !== fCat) return false
      if (fTag && !r.tags.includes(fTag)) return false
      if (fFirst === 'yes' && !r.firstVisit) return false
      if (fFirst === 'no' && r.firstVisit) return false
      return true
    })
  }, [lowReviews, fRating, fEmp, fCat, fTag, fFirst])

  const meta = { location: locationLabel(activeLocations, allowedLocations()), period: feedback ? periodLabel(feedback.dateRange) : 'All dates' }

  if (parsing === 'feedback' && !feedback) return <SkeletonCards count={4} />

  if (!feedback) {
    return (
      <div className="space-y-6">
        <h1 className="text-display text-brand-dark">Reviews</h1>
        <EmptyState
          icon={<StarIcon size={28} strokeWidth={1.6} />}
          title="No feedback report loaded"
          message="Upload a Zenoti Feedback export (.xlsx). The app surfaces your star performers and, just as importantly, every 1–3 star review that needs a follow-up."
          action={<Button icon={<Upload size={16} />} onClick={() => start('feedback')}>Upload Feedback Report</Button>}
        />
      </div>
    )
  }

  const empColumns: Column<(typeof empRatings)[number]>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (e) => (
        <span className={e.total < 3 ? 'text-text-secondary' : 'font-medium text-text-primary'}>
          {e.name}
          {e.total < 3 && <span className="ml-2 text-[10px] italic text-text-secondary">low review count</span>}
        </span>
      )
    },
    { key: 'role', header: 'Role' },
    {
      key: 'avg',
      header: 'Avg Rating',
      align: 'right',
      value: (e) => e.avg,
      render: (e) => (
        <span className="inline-flex items-center gap-2">
          <RatingDot value={e.avg} />
          <span className="font-mono">{rating(e.avg)}</span>
        </span>
      )
    },
    { key: 'total', header: 'Reviews', align: 'right', mono: true, value: (e) => e.total },
    { key: 'fiveStar', header: '5-Star', align: 'right', mono: true, value: (e) => e.fiveStar },
    { key: 'lowRating', header: 'Low (1–3)', align: 'right', mono: true, value: (e) => e.lowRating, render: (e) => (e.lowRating > 0 ? <span className="font-mono text-status-red">{e.lowRating}</span> : <span className="font-mono">0</span>) }
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reviews"
        subtitle={`${meta.location} · ${meta.period}`}
        action={
          <div className="flex items-center gap-2">
            {isAdmin() && (
              <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportCompanyReviewSummaryExcel(feedback, meta)}>
                Company Summary
              </Button>
            )}
            <Button size="sm" icon={<Upload size={15} />} onClick={() => start('feedback')}>
              Upload Feedback
            </Button>
          </div>
        }
      />

      {isAdmin() && <LocationFilter available={feedback.locationIds} />}

      {/* KPI row (§7.2) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Reviews" value={count(kpis.total)} />
        <KpiCard label="Overall Avg Rating" value={<span className="inline-flex items-center gap-2">{rating(kpis.avgRating)} <StarIcon size={20} className="text-brand-warm" fill="#8B7355" /></span>} />
        <KpiCard label="5-Star Count" value={count(kpis.fiveStar)} />
        <KpiCard label="Low Rating Count" value={count(kpis.lowRating)} tone={kpis.lowRating > 0 ? 'alert' : 'default'} sub="1–3 stars" />
      </div>

      {/* Location averages (§7.3) */}
      {locAverages.length > 1 && (
        <Card>
          <CardTitle>Location Average Ratings</CardTitle>
          <div className="mt-3 flex flex-wrap gap-3">
            {locAverages.map((l) => (
              <div key={l.locationId} className="flex items-center gap-2.5 rounded-full border border-brand-stone bg-surface-white px-4 py-2">
                <RatingDot value={l.avg} />
                <span className="text-body font-medium text-text-primary">{locationName(l.locationId)}</span>
                <span className="font-mono text-body-sm text-text-secondary">{rating(l.avg)} · {l.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Five-star leaderboard (§7.4) */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Five-Star Leaderboard</CardTitle>
          <div className="flex items-center gap-2">
            <Toggle options={[{ v: '10', l: 'Top 10' }, { v: '15', l: 'Top 15' }]} value={String(leaderTop)} onChange={(v) => setLeaderTop(Number(v) as 10 | 15)} />
            <Button variant="secondary" size="sm" icon={<FileText size={15} />} onClick={() => exportStarPerformersPdf(meta, leaders.slice(0, leaderTop))}>
              Star Performers PDF
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          {leaders.slice(0, leaderTop).map((e, i) => (
            <div key={e.name} className="rounded-lg border border-brand-stone/70">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-6 text-center font-mono text-body-sm text-text-secondary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text-primary">{e.name}</p>
                  <p className="truncate text-[11px] text-text-secondary">{e.role}</p>
                </div>
                <Stars value={e.avg} />
                <span className="inline-flex items-center gap-1 font-mono text-body-sm text-brand-mid">
                  {e.fiveStar} <StarIcon size={13} fill="#8B7355" className="text-brand-warm" />
                </span>
                <span className="hidden font-mono text-body-sm text-text-secondary sm:inline">{e.total} total</span>
                <button onClick={() => setExpandedLeader((c) => (c === e.name ? null : e.name))} className="text-body-sm font-medium text-brand-mid hover:text-brand-dark">
                  {expandedLeader === e.name ? 'Hide' : 'View Reviews'}
                </button>
              </div>
              {expandedLeader === e.name && (
                <div className="space-y-2 border-t border-brand-stone bg-surface-gray px-3 py-3">
                  {e.reviews.filter((r) => r.rating === 5 && r.comments).slice(0, 8).map((r, idx) => (
                    <p key={idx} className="text-body-sm text-text-primary">
                      <span className="text-text-secondary">{formatDate(r.saleDate)} · {r.service}</span> — “{r.comments}”
                    </p>
                  ))}
                  {!e.reviews.some((r) => r.rating === 5 && r.comments) && (
                    <p className="text-body-sm text-text-secondary">No written comments on the 5-star reviews.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Employee rating table (§7.5) */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Employee Average Rating</CardTitle>
          <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportEmployeeRatingsExcel(empRatings, meta)}>
            Export Ratings
          </Button>
        </div>
        <Table
          columns={empColumns}
          rows={empRatings}
          rowKey={(e) => e.name}
          initialSort={{ key: 'avg', dir: 'desc' }}
          maxHeight="420px"
          expandedKey={expandedEmp}
          onRowClick={(e) => setExpandedEmp((c) => (c === e.name ? null : e.name))}
          renderExpanded={(e) => <EmployeeReviews rows={e.reviews} />}
        />
      </Card>

      {/* Tag frequency (§7.7) */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Review Tag Frequency</CardTitle>
          <Toggle options={[{ v: 'all', l: 'All Reviews' }, { v: 'low', l: 'Low Ratings' }]} value={tagScope} onChange={(v) => setTagScope(v as 'all' | 'low')} />
        </div>
        <HorizontalBarChart
          data={(tagScope === 'all' ? tagsAll : tagsLow).map((t) => ({ id: t.tag, label: t.tag, value: t.count }))}
          format={(n) => count(n)}
          color={tagScope === 'low' ? '#C0392B' : '#4A6741'}
        />
      </Card>

      {/* Low-rating feed (§7.6) */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h1 text-brand-dark">Low-Rating Reviews</h2>
            <p className="text-body-sm text-text-secondary">{filteredLow.length} of {lowReviews.length} shown — every 1–3 star review, in full.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileText size={15} />} onClick={() => exportLowRatingPdf(meta, filteredLow)}>
              PDF
            </Button>
            <Button variant="secondary" size="sm" icon={<FileDown size={15} />} onClick={() => exportLowRatingExcel(filteredLow, meta)}>
              Excel
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Toggle options={[{ v: 'all', l: 'All' }, { v: '1', l: '1★' }, { v: '2', l: '2★' }, { v: '3', l: '3★' }]} value={fRating} onChange={(v) => setFRating(v as 'all' | '1' | '2' | '3')} />
            <input value={fEmp} onChange={(e) => setFEmp(e.target.value)} placeholder="Employee…" className="w-40 rounded-lg border border-brand-stone bg-surface-white px-3 py-2 text-body-sm outline-none focus:border-brand-mid" />
            <Select value={fCat} onChange={setFCat} placeholder="All categories" options={serviceCategories(rows)} />
            <Select value={fTag} onChange={setFTag} placeholder="All tags" options={allTags(rows)} />
            <Toggle options={[{ v: 'all', l: 'Any visit' }, { v: 'yes', l: 'First visit' }, { v: 'no', l: 'Returning' }]} value={fFirst} onChange={(v) => setFFirst(v as 'all' | 'yes' | 'no')} />
          </div>
        </Card>

        {filteredLow.length === 0 ? (
          <EmptyState title={lowReviews.length === 0 ? 'No low ratings 🎉' : 'No results match your filters'} message={lowReviews.length === 0 ? 'Every review this period was 4 stars or higher.' : undefined} action={lowReviews.length > 0 ? <Button variant="secondary" onClick={() => { setFRating('all'); setFEmp(''); setFCat(''); setFTag(''); setFFirst('all') }}>Reset Filters</Button> : undefined} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredLow.map((r, i) => (
              <ReviewCard key={i} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewCard({ r }: { r: ReviewRow }): JSX.Element {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2.5">
        <Badge tone={RATING_BADGE[r.rating]}>{r.rating}★</Badge>
        <span className="font-medium text-text-primary">{r.serviceProvider || 'Unknown'}</span>
        {r.firstVisit && <Badge tone="neutral">First visit</Badge>}
        <span className="ml-auto text-[11px] text-text-secondary">{locationName(r.locationId)} · {formatDate(r.saleDate)}</span>
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">{r.service}{r.clientName ? ` · ${r.clientName}` : ''}</p>
      <p className="mt-2 text-body text-text-primary">{r.comments || <span className="italic text-text-secondary">No comment provided</span>}</p>
      {r.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span key={t} className="rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] text-brand-mid">{t}</span>
          ))}
        </div>
      )}
    </Card>
  )
}

function EmployeeReviews({ rows }: { rows: ReviewRow[] }): JSX.Element {
  return (
    <div className="space-y-1.5 rounded-lg bg-surface-white p-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-brand-stone/50 py-1.5 last:border-0">
          <Stars value={r.rating} size={12} />
          <span className="text-[11px] text-text-secondary">{formatDate(r.saleDate)}</span>
          <span className="flex-1 text-body-sm text-text-primary">{r.comments || <span className="italic text-text-secondary">No comment</span>}</span>
        </div>
      ))}
    </div>
  )
}

function Toggle({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-brand-stone bg-surface-white p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${value === o.v ? 'bg-brand-dark text-white' : 'text-text-secondary hover:text-brand-dark'}`}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }): JSX.Element {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-brand-stone bg-surface-white px-3 py-2 text-body-sm outline-none focus:border-brand-mid">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
