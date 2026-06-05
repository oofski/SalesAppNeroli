import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'green' | 'amber' | 'red' | 'neutral'

const TONES: Record<Tone, string> = {
  green: 'bg-badge-green-bg text-badge-green-fg',
  amber: 'bg-badge-amber-bg text-badge-amber-fg',
  red: 'bg-badge-red-bg text-badge-red-fg',
  neutral: 'bg-brand-light text-text-secondary'
}

// 6px radius, 11px uppercase label, 6/10 padding (§4.4).
export function Badge({
  tone = 'neutral',
  children,
  className
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-badge px-2.5 py-1 text-label uppercase',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
