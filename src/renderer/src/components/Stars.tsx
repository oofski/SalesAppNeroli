import { Star } from 'lucide-react'

export function Stars({ value, size = 14 }: { value: number; size?: number }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'text-brand-warm' : 'text-brand-stone'}
          fill={i <= Math.round(value) ? '#8B7355' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

/** Colored dot for an average rating: green 4.5+, amber 4.0–4.4, red <4.0 (§7.5). */
export function RatingDot({ value }: { value: number }): JSX.Element {
  const color = value >= 4.5 ? '#3A7A4A' : value >= 4.0 ? '#B8871A' : '#C0392B'
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
}
