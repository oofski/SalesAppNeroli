import { clsx } from 'clsx'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LOCATIONS } from '@shared/locations'
import { useAuth } from '../store/auth'
import { useReports } from '../store/reports'

interface LocationFilterProps {
  variant?: 'pills' | 'dropdown'
  /** Restrict to locations actually present in the loaded data. */
  available?: string[]
}

export function LocationFilter({ variant = 'pills', available }: LocationFilterProps): JSX.Element | null {
  const allowed = useAuth((s) => s.user?.locations ?? [])
  const { activeLocations, setActiveLocations } = useReports()

  const options = LOCATIONS.filter(
    (l) => allowed.includes(l.id) && (!available || available.includes(l.id))
  )

  // GMs with a single location have nothing to filter.
  if (options.length <= 1) return null

  const isActive = (id: string): boolean => activeLocations.length === 0 || activeLocations.includes(id)

  const toggle = (id: string): void => {
    const base = activeLocations.length === 0 ? options.map((o) => o.id) : activeLocations
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    // Empty selection means "all" — keep at least nothing-collapses-to-all behavior.
    setActiveLocations(next.length === options.length ? [] : next)
  }

  if (variant === 'dropdown') return <LocationDropdown options={options} isActive={isActive} toggle={toggle} setAll={() => setActiveLocations([])} activeCount={activeLocations.length} />

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setActiveLocations([])}
        className={clsx(
          'rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors',
          activeLocations.length === 0
            ? 'bg-brand-dark text-white'
            : 'border border-brand-stone bg-surface-white text-text-secondary hover:border-brand-mid'
        )}
      >
        All locations
      </button>
      {options.map((loc) => {
        const on = activeLocations.length > 0 && activeLocations.includes(loc.id)
        return (
          <button
            key={loc.id}
            onClick={() => toggle(loc.id)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors',
              on
                ? 'bg-brand-mid text-white'
                : 'border border-brand-stone bg-surface-white text-text-secondary hover:border-brand-mid'
            )}
          >
            {loc.name}
          </button>
        )
      })}
    </div>
  )
}

interface DropdownProps {
  options: typeof LOCATIONS
  isActive: (id: string) => boolean
  toggle: (id: string) => void
  setAll: () => void
  activeCount: number
}

function LocationDropdown({ options, isActive, toggle, setAll, activeCount }: DropdownProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const label = activeCount === 0 ? 'All locations' : `${activeCount} selected`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-brand-stone bg-surface-white px-3.5 py-2 text-body-sm font-medium text-brand-dark hover:border-brand-mid"
      >
        <MapPin size={15} className="text-brand-mid" />
        {label}
        <ChevronDown size={15} className="text-text-secondary" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-card border border-brand-stone bg-surface-white p-2 shadow-elevated">
          <button
            onClick={setAll}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-body-sm hover:bg-brand-light"
          >
            All locations
            {activeCount === 0 && <Check size={15} className="text-brand-mid" />}
          </button>
          <div className="my-1 h-px bg-brand-stone" />
          {options.map((loc) => (
            <button
              key={loc.id}
              onClick={() => toggle(loc.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-body-sm hover:bg-brand-light"
            >
              <span>{loc.name}</span>
              {isActive(loc.id) && activeCount > 0 && <Check size={15} className="text-brand-mid" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
