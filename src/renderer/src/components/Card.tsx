import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

// White bg, 1px stone border, 12px radius, 20px padding (§4.4).
export function Card({ children, className, hover, onClick }: CardProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-card border border-brand-stone bg-surface-white p-5 shadow-card',
        hover && 'cursor-pointer transition-colors hover:border-brand-mid',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <h3 className={clsx('text-h2 text-brand-dark', className)}>{children}</h3>
}

export function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-h1 text-brand-dark">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
