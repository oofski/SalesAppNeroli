import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'alert'
  icon?: ReactNode
}

// Muted uppercase label, large bold number, small contextual sub-label (§5.2).
export function KpiCard({ label, value, sub, tone = 'default', icon }: KpiCardProps): JSX.Element {
  return (
    <div
      className={clsx(
        'rounded-card border bg-surface-white p-5 shadow-card',
        tone === 'alert' ? 'border-badge-red-bg' : 'border-brand-stone'
      )}
    >
      <div className="flex items-start justify-between">
        <span className="kpi-label">{label}</span>
        {icon && <span className="text-brand-mid">{icon}</span>}
      </div>
      <div
        className={clsx(
          'mt-2 text-[26px] font-semibold leading-none tracking-tight',
          tone === 'alert' ? 'text-status-red' : 'text-brand-dark'
        )}
      >
        {value}
      </div>
      {sub != null && <div className="mt-1.5 text-body-sm text-text-secondary">{sub}</div>}
    </div>
  )
}
