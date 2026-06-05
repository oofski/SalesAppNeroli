import { clsx } from 'clsx'

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={clsx('skeleton', className)} />
}

/** Skeleton placeholder shown while Python/parser processes an upload (§4.5). */
export function SkeletonCards({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-brand-stone bg-surface-white p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
