import { clsx } from 'clsx'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const SIZES = {
  md: 'max-w-[600px]', // §4.4: 600px max
  lg: 'max-w-[820px]',
  xl: 'max-w-[1040px]'
}

// Centered, white, 16px radius, scrim rgba(0,0,0,0.45) (§4.4).
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className={clsx(
          'fade-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-modal bg-surface-white shadow-modal',
          SIZES[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-brand-stone px-6 py-4">
            <div className="text-h2 text-brand-dark">{title}</div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-brand-light hover:text-brand-dark"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-brand-stone bg-surface-gray px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
