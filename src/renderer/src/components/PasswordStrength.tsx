import { clsx } from 'clsx'
import { Check, X } from 'lucide-react'
import { validatePassword } from '@shared/password'
import type { StrengthResult } from '@shared/password'

const BAR_COLOR = ['bg-status-red', 'bg-status-red', 'bg-status-amber', 'bg-brand-mid', 'bg-status-green']

// Real-time strength indicator + requirement checklist (§2.4).
export function PasswordStrength({ password, strength }: { password: string; strength: StrengthResult }): JSX.Element | null {
  if (!password) return null
  const check = validatePassword(password)
  const reqs = [
    { label: '10+ characters', ok: password.length >= 10 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) }
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={clsx(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < strength.score ? BAR_COLOR[strength.score] : 'bg-brand-stone'
              )}
            />
          ))}
        </div>
        <span className="w-12 text-right text-[11px] font-medium text-text-secondary">{strength.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {reqs.map((r) => (
          <span
            key={r.label}
            className={clsx('flex items-center gap-1.5 text-[12px]', r.ok ? 'text-status-green' : 'text-text-secondary')}
          >
            {r.ok ? <Check size={13} /> : <X size={13} className="text-text-secondary/50" />}
            {r.label}
          </span>
        ))}
      </div>
      {!check.ok && <span className="sr-only">Password incomplete</span>}
    </div>
  )
}
