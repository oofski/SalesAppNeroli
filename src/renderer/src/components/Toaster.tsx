import { clsx } from 'clsx'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useUi } from '../store/ui'

const ICONS = {
  success: <CheckCircle2 size={18} className="text-status-green" />,
  error: <AlertCircle size={18} className="text-status-red" />,
  info: <Info size={18} className="text-brand-mid" />
}

export function Toaster(): JSX.Element {
  const { toasts, dismiss } = useUi()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex items-start gap-3 rounded-card border bg-surface-white px-4 py-3 shadow-elevated fade-in',
            t.kind === 'error' ? 'border-badge-red-bg' : 'border-brand-stone'
          )}
        >
          <div className="mt-0.5">{ICONS[t.kind]}</div>
          <p className="flex-1 text-body-sm text-text-primary">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-text-secondary hover:text-brand-dark">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
