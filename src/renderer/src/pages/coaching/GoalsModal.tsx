import { useState } from 'react'
import type { EmployeeGoals, EmployeeMetric } from '@shared/types'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { api } from '../../lib/api'
import { useReports } from '../../store/reports'
import { useUi } from '../../store/ui'

interface Props {
  open: boolean
  employees: EmployeeMetric[]
  locationId: string
  existing: EmployeeGoals[]
  onClose: () => void
}

type Draft = Record<string, { sr: string; ps: string; rb: string; rq: string; ad: string }>

function buildDraft(employees: EmployeeMetric[], existing: EmployeeGoals[]): Draft {
  const byCode = new Map(existing.map((g) => [g.code, g]))
  const d: Draft = {}
  for (const e of employees) {
    const g = byCode.get(e.code)
    d[e.code] = {
      sr: g?.serviceRevenueGoal != null ? String(g.serviceRevenueGoal) : '',
      ps: g?.productSalesGoal != null ? String(g.productSalesGoal) : '',
      rb: g?.rebookGoal != null ? String(g.rebookGoal) : '',
      rq: g?.requestGoal != null ? String(g.requestGoal) : '',
      ad: g?.addonGoal != null ? String(g.addonGoal) : ''
    }
  }
  return d
}

export function GoalsModal({ open, employees, locationId, existing, onClose }: Props): JSX.Element {
  const setGoals = useReports((s) => s.setGoals)
  const notify = useUi((s) => s.notify)
  const [draft, setDraft] = useState<Draft>(() => buildDraft(employees, existing))
  const [saving, setSaving] = useState(false)

  const update = (code: string, field: keyof Draft[string], value: string): void => {
    setDraft((d) => ({ ...d, [code]: { ...d[code], [field]: value } }))
  }

  const num = (v: string): number | null => {
    const n = parseFloat(v)
    return v.trim() !== '' && isFinite(n) ? n : null
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    const goals: EmployeeGoals[] = employees.map((e) => ({
      code: e.code,
      serviceRevenueGoal: num(draft[e.code]?.sr ?? ''),
      productSalesGoal: num(draft[e.code]?.ps ?? ''),
      rebookGoal: num(draft[e.code]?.rb ?? ''),
      requestGoal: num(draft[e.code]?.rq ?? ''),
      addonGoal: num(draft[e.code]?.ad ?? '')
    }))
    await api.goals.save(locationId, goals)
    setGoals(goals)
    setSaving(false)
    notify('Goals saved. Comparisons will appear across the coaching view.', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Set / Edit Goals"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Goals'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-body-sm text-text-secondary">
        Enter target values per employee. Leave a field blank to skip its comparison. Goals are stored
        locally, keyed by employee code, and matched on the next report upload.
      </p>
      <div className="overflow-auto rounded-card border border-brand-stone" style={{ maxHeight: '52vh' }}>
        <table className="w-full text-body-sm">
          <thead className="sticky top-0 bg-brand-dark text-white">
            <tr>
              <th className="px-3 py-2 text-left text-label uppercase">Employee</th>
              <th className="px-3 py-2 text-right text-label uppercase">Service Rev</th>
              <th className="px-3 py-2 text-right text-label uppercase">Product</th>
              <th className="px-3 py-2 text-right text-label uppercase">Rebook %</th>
              <th className="px-3 py-2 text-right text-label uppercase">Request %</th>
              <th className="px-3 py-2 text-right text-label uppercase">Add-on %</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e, i) => (
              <tr key={e.code} className={i % 2 ? 'bg-surface-gray' : 'bg-surface-white'}>
                <td className="px-3 py-1.5">
                  <div className="font-medium text-text-primary">{e.name}</div>
                  <div className="text-[11px] text-text-secondary">{e.job}</div>
                </td>
                <GoalCell prefix="$" value={draft[e.code]?.sr ?? ''} onChange={(v) => update(e.code, 'sr', v)} />
                <GoalCell prefix="$" value={draft[e.code]?.ps ?? ''} onChange={(v) => update(e.code, 'ps', v)} />
                <GoalCell suffix="%" value={draft[e.code]?.rb ?? ''} onChange={(v) => update(e.code, 'rb', v)} />
                <GoalCell suffix="%" value={draft[e.code]?.rq ?? ''} onChange={(v) => update(e.code, 'rq', v)} />
                <GoalCell suffix="%" value={draft[e.code]?.ad ?? ''} onChange={(v) => update(e.code, 'ad', v)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

function GoalCell({ value, onChange, prefix, suffix }: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }): JSX.Element {
  return (
    <td className="px-2 py-1.5">
      <div className="flex items-center justify-end gap-1">
        {prefix && <span className="text-[11px] text-text-secondary">{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="w-20 rounded-md border border-brand-stone bg-surface-white px-2 py-1 text-right font-mono text-[13px] outline-none focus:border-brand-mid"
          placeholder="—"
        />
        {suffix && <span className="text-[11px] text-text-secondary">{suffix}</span>}
      </div>
    </td>
  )
}
