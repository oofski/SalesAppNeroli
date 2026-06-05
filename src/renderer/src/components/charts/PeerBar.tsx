import { clsx } from 'clsx'

interface PeerBarProps {
  label: string
  value: number
  peerAvg: number
  max?: number
  format?: (n: number) => string
  color?: string
}

// A metric bar with the employee's value plus a faint marker at the peer-group
// average for context (§6.3 employee detail).
export function PeerBar({
  label,
  value,
  peerAvg,
  max,
  format = (n) => String(Math.round(n)),
  color = '#4A6741'
}: PeerBarProps): JSX.Element {
  const ceiling = Math.max(max ?? 0, value, peerAvg, 1)
  const valPct = Math.min(100, (value / ceiling) * 100)
  const peerPct = Math.min(100, (peerAvg / ceiling) * 100)
  const ahead = value >= peerAvg

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-body-sm text-text-primary">{label}</span>
        <span className="font-mono text-[13px] text-text-secondary">
          {format(value)}
          <span className="ml-1.5 text-text-secondary/60">peer {format(peerAvg)}</span>
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-brand-light">
        <div
          className={clsx('h-full rounded-full transition-all duration-500')}
          style={{ width: `${valPct}%`, backgroundColor: ahead ? color : '#B8871A' }}
        />
        {/* peer-average marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-brand-dark/70"
          style={{ left: `calc(${peerPct}% - 1px)` }}
          title={`Peer average: ${format(peerAvg)}`}
        />
      </div>
    </div>
  )
}
