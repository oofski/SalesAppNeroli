import { useState } from 'react'
import { FileText, Lightbulb } from 'lucide-react'
import type { EmployeeGoals, EmployeeMetric } from '@shared/types'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { PeerBar } from '../../components/charts/PeerBar'
import { money, percent, count } from '../../lib/format'
import { generateCoachingTip, scoreColor, TIER_BADGE, TIER_LABEL } from '../../lib/insights'
import { exportCoachingGuidePdf } from '../../lib/exporters'

interface Props {
  employee: EmployeeMetric | null
  location: string
  period: string
  goals?: EmployeeGoals
  onClose: () => void
}

export function EmployeeModal({ employee, location, period, goals, onClose }: Props): JSX.Element | null {
  const [notes, setNotes] = useState('')
  if (!employee) return null
  const e = employee
  const avg = e.peerAverages ?? {}
  const tip = generateCoachingTip(e)

  const kpi = (label: string, value: string, goal?: number | null, actual?: number, fmt?: (n: number) => string): JSX.Element => {
    const hasGoal = goal != null && goal > 0 && actual != null && fmt
    const variance = hasGoal ? actual! - goal! : 0
    return (
      <div className="rounded-lg border border-brand-stone bg-surface-white p-3">
        <p className="kpi-label">{label}</p>
        <p className="mt-1 text-h2 text-brand-dark">{value}</p>
        {hasGoal && (
          <p className={`mt-0.5 text-[11px] ${variance >= 0 ? 'text-status-green' : 'text-status-red'}`}>
            Goal {fmt!(goal!)} · {variance >= 0 ? '+' : ''}
            {fmt!(variance)}
          </p>
        )}
      </div>
    )
  }

  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-3">
          <span>{e.name}</span>
          <Badge tone={TIER_BADGE[e.tier]}>{TIER_LABEL[e.tier]}</Badge>
        </div>
      }
      footer={
        <Button icon={<FileText size={16} />} onClick={() => exportCoachingGuidePdf(e, { location, period }, goals, notes)}>
          Export Coaching Guide
        </Button>
      }
    >
      {/* Header */}
      <div className="flex items-center gap-5">
        <div
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full text-white"
          style={{ backgroundColor: scoreColor(e.tier) }}
        >
          <span className="text-[28px] font-semibold leading-none">{Math.round(e.score)}</span>
          <span className="text-[9px] uppercase tracking-wide opacity-80">Score</span>
        </div>
        <div>
          <p className="text-h1 text-brand-dark">{e.name}</p>
          <p className="text-body text-text-secondary">
            {e.job} · {location} · {count(e.monthsEmployed)} months employed
          </p>
          <p className="mt-1 text-body-sm text-brand-mid">
            Ranked vs. {e.peerCount} {e.job}
            {e.peerCount === 1 ? '' : 's'} at {location}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi('Service Revenue', money(e.serviceRevenue), goals?.serviceRevenueGoal, e.serviceRevenue, (n) => money(n))}
        {kpi('Product Sales', money(e.productSales), goals?.productSalesGoal, e.productSales, (n) => money(n))}
        {kpi('Total Revenue', money(e.totalRevenue))}
        {kpi('Gift Card Sales', money(e.giftCardSales))}
        {kpi('Rebook Rate', percent(e.rebookRate), goals?.rebookGoal, e.rebookRate, (n) => percent(n))}
        {kpi('Request Rate', percent(e.requestRate), goals?.requestGoal, e.requestRate, (n) => percent(n))}
        {kpi('New Guests', count(e.newGuests))}
        {kpi('Add-on Rate', percent(e.addonRate), goals?.addonGoal, e.addonRate, (n) => percent(n))}
      </div>

      {/* Bar charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="kpi-label mb-3">Revenue Breakdown</p>
          <div className="space-y-3">
            <PeerBar label="Service" value={e.serviceRevenue} peerAvg={avg.serviceRevenue ?? 0} format={(n) => money(n)} />
            <PeerBar label="Product" value={e.productSales} peerAvg={avg.productSales ?? 0} format={(n) => money(n)} />
            <PeerBar label="Gift Cards" value={e.giftCardSales} peerAvg={avg.giftCardSales ?? 0} format={(n) => money(n)} />
            <PeerBar label="Memberships" value={e.membershipSales} peerAvg={avg.membershipSales ?? 0} format={(n) => money(n)} />
            <PeerBar label="Packages" value={e.packageSales} peerAvg={avg.packageSales ?? 0} format={(n) => money(n)} />
          </div>
        </div>
        <div>
          <p className="kpi-label mb-3">Behavioral Metrics</p>
          <div className="space-y-3">
            <PeerBar label="Rebook %" value={e.rebookRate} peerAvg={avg.rebookRate ?? 0} max={100} format={(n) => percent(n, 0)} />
            <PeerBar label="Request %" value={e.requestRate} peerAvg={avg.requestRate ?? 0} max={100} format={(n) => percent(n, 0)} />
            <PeerBar label="Product Attach %" value={e.productAttachRate} peerAvg={avg.productAttachRate ?? 0} max={100} format={(n) => percent(n, 0)} />
            <PeerBar label="Add-on %" value={e.addonRate} peerAvg={avg.addonRate ?? 0} max={100} format={(n) => percent(n, 0)} />
            <PeerBar label="Online Booking %" value={e.onlineBookingRate} peerAvg={avg.onlineBookingRate ?? 0} max={100} format={(n) => percent(n, 0)} />
          </div>
        </div>
      </div>

      {/* Coaching tip */}
      <div className="mt-6 rounded-card border border-brand-stone bg-brand-light/60 p-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-brand-mid" />
          <p className="text-h2 text-brand-dark">Coaching Tip</p>
        </div>
        <p className="mt-2 text-body text-text-primary">{tip.headline}</p>
        {tip.points.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-text-primary">
            {tip.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
        <textarea
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="Add your own notes — these are included in the exported coaching guide…"
          className="mt-3 h-20 w-full resize-none rounded-lg border border-brand-stone bg-surface-white p-3 text-body-sm outline-none focus:border-brand-mid"
        />
      </div>
    </Modal>
  )
}
