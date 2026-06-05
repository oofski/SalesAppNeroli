import { clsx } from 'clsx'

export interface BarDatum {
  label: string
  value: number
  meta?: string // optional right-aligned annotation (e.g. "32%")
  id?: string
}

interface BarChartProps {
  data: BarDatum[]
  format?: (n: number) => string
  color?: string
  onBarClick?: (d: BarDatum) => void
  activeId?: string | null
  maxBars?: number
  height?: number
}

// Horizontal bar chart — category/vendor breakdowns (§5.3). Pure SVG/DOM, no deps.
export function HorizontalBarChart({
  data,
  format = (n) => String(Math.round(n)),
  color = '#4A6741',
  onBarClick,
  activeId,
  maxBars = 12
}: BarChartProps): JSX.Element {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars)
  const max = Math.max(1, ...rows.map((d) => d.value))

  if (!rows.length) {
    return <p className="py-8 text-center text-body-sm text-text-secondary">No data to display</p>
  }

  return (
    <div className="space-y-2.5">
      {rows.map((d) => {
        const pct = (d.value / max) * 100
        const active = activeId != null && d.id === activeId
        return (
          <button
            key={d.id ?? d.label}
            type="button"
            disabled={!onBarClick}
            onClick={() => onBarClick?.(d)}
            className={clsx(
              'group block w-full text-left',
              onBarClick && 'cursor-pointer',
              !onBarClick && 'cursor-default'
            )}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span
                className={clsx(
                  'truncate text-body-sm',
                  active ? 'font-semibold text-brand-dark' : 'text-text-primary'
                )}
              >
                {d.label}
              </span>
              <span className="shrink-0 font-mono text-[13px] text-text-secondary">
                {format(d.value)}
                {d.meta && <span className="ml-1.5 text-text-secondary/70">{d.meta}</span>}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-light">
              <div
                className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                style={{ width: `${pct}%`, backgroundColor: active ? '#2C3E35' : color }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
