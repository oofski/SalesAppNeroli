import { useMemo, useState } from 'react'
import { formatDate } from '../../lib/format'

export interface LineSeries {
  id: string
  label: string
  color: string
  points: { x: string; y: number }[]
}

interface LineChartProps {
  series: LineSeries[]
  format?: (n: number) => string
  height?: number
}

const W = 760
const PAD = { l: 56, r: 16, t: 16, b: 30 }

// Daily sales trend — one line per location, hover tooltip (§5.3). Pure SVG.
export function LineChart({ series, format = (n) => String(Math.round(n)), height = 240 }: LineChartProps): JSX.Element {
  const [hover, setHover] = useState<number | null>(null)

  const xLabels = useMemo(() => {
    const set = new Set<string>()
    series.forEach((s) => s.points.forEach((p) => set.add(p.x)))
    return [...set].sort()
  }, [series])

  const maxY = useMemo(
    () => Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))),
    [series]
  )

  if (!xLabels.length) {
    return <p className="py-10 text-center text-body-sm text-text-secondary">No trend data to display</p>
  }

  const plotW = W - PAD.l - PAD.r
  const plotH = height - PAD.t - PAD.b
  const xAt = (i: number): number => (xLabels.length === 1 ? PAD.l + plotW / 2 : PAD.l + (i / (xLabels.length - 1)) * plotW)
  const yAt = (v: number): number => PAD.t + plotH - (v / maxY) * plotH

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY)
  const xTickEvery = Math.max(1, Math.ceil(xLabels.length / 8))

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yAt(t)} x2={W - PAD.r} y2={yAt(t)} stroke="#E8EDE6" strokeWidth={1} />
            <text x={PAD.l - 8} y={yAt(t) + 3} textAnchor="end" fontSize={10} fill="#6B6864">
              {format(t)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {xLabels.map((lbl, i) =>
          i % xTickEvery === 0 ? (
            <text key={lbl} x={xAt(i)} y={height - 10} textAnchor="middle" fontSize={9} fill="#6B6864">
              {formatDate(lbl).replace(/, \d{4}$/, '')}
            </text>
          ) : null
        )}
        {/* series lines */}
        {series.map((s) => {
          const pts = xLabels
            .map((lbl, i) => {
              const p = s.points.find((q) => q.x === lbl)
              return p ? `${xAt(i)},${yAt(p.y)}` : null
            })
            .filter(Boolean)
            .join(' ')
          return (
            <polyline key={s.id} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )
        })}
        {/* hover guide */}
        {hover != null && (
          <line x1={xAt(hover)} y1={PAD.t} x2={xAt(hover)} y2={PAD.t + plotH} stroke="#8B7355" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {hover != null &&
          series.map((s) => {
            const p = s.points.find((q) => q.x === xLabels[hover])
            return p ? <circle key={s.id} cx={xAt(hover)} cy={yAt(p.y)} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1.5} /> : null
          })}
        {/* hover capture */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = (e.target as SVGRectElement).getBoundingClientRect()
            const rel = (e.clientX - rect.left) / rect.width
            setHover(Math.max(0, Math.min(xLabels.length - 1, Math.round(rel * (xLabels.length - 1)))))
          }}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {hover != null && (
        <div className="pointer-events-none absolute left-1/2 top-0 w-max -translate-x-1/2 rounded-lg border border-brand-stone bg-surface-white px-3 py-2 text-body-sm shadow-elevated">
          <div className="mb-1 font-semibold text-brand-dark">{formatDate(xLabels[hover])}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === xLabels[hover])
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-text-secondary">{s.label}</span>
                <span className="ml-auto font-mono text-text-primary">{format(p?.y ?? 0)}</span>
              </div>
            )
          })}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
