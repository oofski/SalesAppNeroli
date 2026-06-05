import { clsx } from 'clsx'

// A small, calm sprig mark + Neroli wordmark — evokes the Aveda botanical identity.
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }): JSX.Element {
  const fg = light ? '#FFFFFF' : '#2C3E35'
  const accent = '#8B7355'
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 28C16 28 6 22 6 13.5C6 8.8 9.6 5 16 5C22.4 5 26 8.8 26 13.5C26 22 16 28 16 28Z"
          stroke={fg}
          strokeWidth="1.6"
          fill="none"
        />
        <path d="M16 27V11" stroke={fg} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 16C16 16 12.5 15 11 12.5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 19.5C16 19.5 19.5 18.5 21 16" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="16" cy="8.5" r="1.6" fill={accent} />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div
            className={clsx('text-[15px] font-semibold tracking-[0.18em]')}
            style={{ color: fg }}
          >
            NEROLI
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.22em]" style={{ color: light ? '#D4CFC8' : '#6B6864' }}>
            Salon &amp; Spa
          </div>
        </div>
      )}
    </div>
  )
}
