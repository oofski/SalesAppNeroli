// Tiny inline bar sparkline for dashboard "top categories" rows (§5.2).
export function SparkBars({ values, color = '#4A6741' }: { values: number[]; color?: string }): JSX.Element {
  const max = Math.max(1, ...values)
  return (
    <div className="flex h-8 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.4 + 0.6 * (v / max) }}
        />
      ))}
    </div>
  )
}
