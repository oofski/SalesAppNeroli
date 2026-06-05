import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}

// Illustrated empty state — "Upload a report to get started" (§4.5).
export function EmptyState({ icon, title, message, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-brand-stone bg-surface-white/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand-mid">
        {icon ?? <Inbox size={28} strokeWidth={1.6} />}
      </div>
      <h3 className="text-h2 text-brand-dark">{title}</h3>
      {message && <p className="mt-1 max-w-md text-body text-text-secondary">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
