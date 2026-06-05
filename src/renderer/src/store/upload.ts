import { create } from 'zustand'
import type {
  AccrualReport,
  FeedbackReport,
  MetricsReport,
  ReportType,
  ServiceReport,
  UploadedReport
} from '@shared/types'
import type { PickedFile } from '@shared/ipc'
import { api } from '../lib/api'
import { locationName } from '@shared/locations'
import { periodLabel } from '../lib/format'
import { useAuth } from './auth'
import { useReports } from './reports'
import { useUi } from './ui'

const PICK_KIND: Record<ReportType, 'xlsx' | 'csv'> = {
  accrual: 'xlsx',
  service: 'xlsx',
  feedback: 'xlsx',
  metrics: 'csv'
}

const NEEDS_LOCATION: ReportType[] = ['metrics', 'service']

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

interface UploadState {
  parsing: ReportType | null
  /** A picked file awaiting a location choice (metrics/service). */
  pending: { pick: PickedFile; type: ReportType } | null
  /** Whether the optional goals-sheet prompt is showing after a metrics upload. */
  goalsPrompt: { locationId: string } | null

  start: (type: ReportType) => Promise<void>
  chooseLocation: (locationId: string) => Promise<void>
  cancel: () => void
  promptGoalsUpload: () => Promise<void>
  dismissGoalsPrompt: () => void
}

function makeUpload(type: ReportType, fileName: string, locationIds: string[], range: { from: string | null; to: string | null }): UploadedReport {
  const label =
    type === 'accrual'
      ? `Sales – Product (${periodLabel(range)})`
      : type === 'service'
        ? `Service – ${locationName(locationIds[0])} (${periodLabel(range)})`
        : type === 'metrics'
          ? `Coaching – ${locationName(locationIds[0])}`
          : `Reviews (${periodLabel(range)})`
  return {
    id: `${type}-${Date.now()}`,
    type,
    label,
    locationIds,
    dateRange: range,
    uploadedAt: new Date().toISOString(),
    fileName
  }
}

export const useUpload = create<UploadState>((set, get) => ({
  parsing: null,
  pending: null,
  goalsPrompt: null,

  start: async (type) => {
    const pick = await api.reports.pick(PICK_KIND[type])
    if (!pick) return
    if (NEEDS_LOCATION.includes(type)) {
      set({ pending: { pick, type } })
      return
    }
    await runParse(pick, type)
  },

  chooseLocation: async (locationId) => {
    const pending = get().pending
    if (!pending) return
    set({ pending: null })
    await runParse(pending.pick, pending.type, locationId)
  },

  cancel: () => set({ pending: null }),

  promptGoalsUpload: async () => {
    const gp = get().goalsPrompt
    if (!gp) return
    set({ goalsPrompt: null })
    const pick = await api.reports.pick('xlsx')
    if (!pick) return
    // A goals sheet is an .xlsx with one row per employee; reuse the metrics location.
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(base64ToBytes(pick.bytes), { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
      const goals = rows
        .map((r) => {
          const get2 = (k: string): number | null => {
            const key = Object.keys(r).find((kk) => kk.toLowerCase().replace(/[^a-z]/g, '').includes(k))
            const v = key ? Number(r[key]) : NaN
            return isFinite(v) && v > 0 ? v : null
          }
          const codeKey = Object.keys(r).find((kk) => kk.toLowerCase().includes('code'))
          return {
            code: codeKey ? String(r[codeKey]) : '',
            serviceRevenueGoal: get2('servicerevenue'),
            productSalesGoal: get2('productsales'),
            rebookGoal: get2('rebook'),
            requestGoal: get2('request'),
            addonGoal: get2('addon')
          }
        })
        .filter((g) => g.code)
      useReports.getState().setGoals(goals)
      await api.goals.save(gp.locationId, goals)
      useUi.getState().notify(`Loaded goals for ${goals.length} employees — actual vs goal is now active.`, 'success')
    } catch {
      useUi.getState().notify('Could not read that goals sheet. Make sure it was exported from this app.', 'error')
    }
  },

  dismissGoalsPrompt: () => set({ goalsPrompt: null })
}))

async function runParse(pick: PickedFile, type: ReportType, locationId?: string): Promise<void> {
  useUpload.setState({ parsing: type })
  const reports = useReports.getState()
  const ui = useUi.getState()
  try {
    const res = await api.reports.parse({ bytes: pick.bytes, name: pick.name, type, locationId })
    if (!res.ok || !res.data) {
      const msg = res.error?.message ?? 'That file could not be read.'
      ui.notify(msg, 'error')
      return
    }

    if (type === 'accrual') {
      const data = res.data as AccrualReport
      reports.setAccrual(data, makeUpload('accrual', pick.name, data.locationIds, data.dateRange))
      ui.notify(`Loaded ${data.rows.length} product line items.`, 'success')
    } else if (type === 'service') {
      const data = res.data as ServiceReport
      const loc = locationId ?? data.locationId
      const fixed: ServiceReport = { ...data, locationId: loc }
      reports.addService(fixed, makeUpload('service', pick.name, [loc], data.dateRange))
      ui.notify(`Loaded ${data.rows.length} service transactions for ${locationName(loc)}.`, 'success')
    } else if (type === 'metrics') {
      const data = res.data as MetricsReport
      const loc = locationId ?? data.locationId
      reports.setMetrics(data, makeUpload('metrics', pick.name, [loc], { from: null, to: null }))
      // Pre-load any goals stored from a prior session, then offer the goals-sheet upload.
      const stored = await api.goals.get(loc)
      if (stored.length) reports.setGoals(stored)
      ui.notify(`Scored ${data.employees.length} active employees (${data.inactive.length} inactive).`, 'success')
      useUpload.setState({ goalsPrompt: { locationId: loc } })
    } else if (type === 'feedback') {
      const data = res.data as FeedbackReport
      reports.setFeedback(data, makeUpload('feedback', pick.name, data.locationIds, data.dateRange))
      ui.notify(`Loaded ${data.rows.length} guest reviews across ${data.locationIds.length} location(s).`, 'success')
    }
  } catch (e) {
    ui.notify(`Unexpected error: ${(e as Error).message}`, 'error')
  } finally {
    useUpload.setState({ parsing: null })
  }
}
