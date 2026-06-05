import { create } from 'zustand'
import type {
  AccrualReport,
  EmployeeGoals,
  FeedbackReport,
  MetricsReport,
  ServiceReport,
  UploadedReport
} from '@shared/types'

interface ReportsState {
  accrual: AccrualReport | null
  services: ServiceReport[] // one per location (§5.3 Service)
  metrics: MetricsReport | null
  goals: EmployeeGoals[]
  feedback: FeedbackReport | null
  uploads: UploadedReport[]

  /** Active location filter applied across the whole app. */
  activeLocations: string[]

  setAccrual: (r: AccrualReport, upload: UploadedReport) => void
  addService: (r: ServiceReport, upload: UploadedReport) => void
  setMetrics: (r: MetricsReport, upload: UploadedReport) => void
  setGoals: (g: EmployeeGoals[]) => void
  setFeedback: (r: FeedbackReport, upload: UploadedReport) => void
  removeUpload: (id: string) => void
  setActiveLocations: (ids: string[]) => void
  initLocations: (ids: string[]) => void
  reset: () => void
}

export const useReports = create<ReportsState>((set) => ({
  accrual: null,
  services: [],
  metrics: null,
  goals: [],
  feedback: null,
  uploads: [],
  activeLocations: [],

  setAccrual: (r, upload) =>
    set((s) => ({ accrual: r, uploads: [...s.uploads.filter((u) => u.type !== 'accrual'), upload] })),

  addService: (r, upload) =>
    set((s) => ({
      // Replace any existing service report for the same location.
      services: [...s.services.filter((x) => x.locationId !== r.locationId), r],
      uploads: [...s.uploads.filter((u) => !(u.type === 'service' && u.locationIds[0] === r.locationId)), upload]
    })),

  setMetrics: (r, upload) =>
    set((s) => ({
      metrics: r,
      goals: [],
      uploads: [...s.uploads.filter((u) => u.type !== 'metrics'), upload]
    })),

  setGoals: (g) => set({ goals: g }),

  setFeedback: (r, upload) =>
    set((s) => ({ feedback: r, uploads: [...s.uploads.filter((u) => u.type !== 'feedback'), upload] })),

  removeUpload: (id) =>
    set((s) => {
      const upload = s.uploads.find((u) => u.id === id)
      if (!upload) return s
      const next: Partial<ReportsState> = { uploads: s.uploads.filter((u) => u.id !== id) }
      if (upload.type === 'accrual') next.accrual = null
      if (upload.type === 'metrics') {
        next.metrics = null
        next.goals = []
      }
      if (upload.type === 'feedback') next.feedback = null
      if (upload.type === 'service')
        next.services = s.services.filter((x) => x.locationId !== upload.locationIds[0])
      return next as ReportsState
    }),

  setActiveLocations: (ids) => set({ activeLocations: ids }),
  initLocations: (ids) => set((s) => (s.activeLocations.length ? s : { activeLocations: ids })),

  reset: () =>
    set({ accrual: null, services: [], metrics: null, goals: [], feedback: null, uploads: [], activeLocations: [] })
}))

/** True when a location passes the active filter (empty filter = show all). */
export function inScope(activeLocations: string[], locationId: string): boolean {
  return activeLocations.length === 0 || activeLocations.includes(locationId)
}
