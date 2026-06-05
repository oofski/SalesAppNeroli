import { useEffect, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, FileText, Users, Star } from 'lucide-react'
import type { ReportType } from '@shared/types'
import { Button } from './Button'
import { useUpload } from '../store/upload'

const ITEMS: { type: ReportType; label: string; hint: string; icon: JSX.Element }[] = [
  { type: 'accrual', label: 'Sales — Product', hint: 'Zenoti Accrual (.xlsx)', icon: <FileSpreadsheet size={16} /> },
  { type: 'service', label: 'Sales — Service', hint: 'Zenoti Service (.xlsx)', icon: <FileText size={16} /> },
  { type: 'metrics', label: 'Employee Metrics', hint: 'Zenoti Coaching (.csv)', icon: <Users size={16} /> },
  { type: 'feedback', label: 'Guest Feedback', hint: 'Zenoti Feedback (.xlsx)', icon: <Star size={16} /> }
]

export function UploadMenu({ label = 'Upload Report' }: { label?: string }): JSX.Element {
  const start = useUpload((s) => s.start)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button icon={<Upload size={16} />} onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-card border border-brand-stone bg-surface-white p-2 shadow-elevated">
          {ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                setOpen(false)
                start(item.type)
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-light"
            >
              <span className="text-brand-mid">{item.icon}</span>
              <span className="flex-1">
                <span className="block text-body font-medium text-text-primary">{item.label}</span>
                <span className="block text-[11px] text-text-secondary">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
