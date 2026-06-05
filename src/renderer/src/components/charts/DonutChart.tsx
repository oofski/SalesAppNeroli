export interface DonutDatum {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutDatum[]
  centerLabel?: string
}

// Donut chart — booking source / payment mix (§5.3). Pure SVG via stroke-dasharray arcs.
export function DonutChart({ data, centerLabel }: DonutChartProps): JSX.Element {
  const total = data.reduce((a, d) => a + d.value, 0)
  const r = 54
  const c = 2 * Math.PI * r
  let offset = 0

  if (total <= 0) {
    return <p className="py-8 text-center text-body-sm text-text-secondary">No data to display</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#F5F4F2" strokeWidth={18} />
        {data.map((d) => {
          const frac = d.value / total
          const len = frac * c
          const seg = (
            <circle
              key={d.label}
              cx={70}
              cy={70}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={18}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          )
          offset += len
          return seg
        })}
        <text x={70} y={66} textAnchor="middle" fontSize={20} fontWeight={600} fill="#2C3E35">
          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
        </text>
        <text x={70} y={84} textAnchor="middle" fontSize={9} fill="#6B6864">
          {centerLabel ?? 'TOTAL'}
        </text>
      </svg>

      <div className="flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-body-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-text-primary">{d.label}</span>
            <span className="ml-auto font-mono text-text-secondary">
              {((d.value / total) * 100).toFixed(0)}% · {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
