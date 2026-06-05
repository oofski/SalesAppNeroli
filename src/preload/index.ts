import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type { ExcelExportRequest, PdfExportRequest } from '@shared/ipc'
import type { EmployeeGoals, ReportType, Role } from '@shared/types'

const api = {
  auth: {
    login: (email: string, password: string) => ipcRenderer.invoke(IPC.authLogin, email, password),
    logout: () => ipcRenderer.invoke(IPC.authLogout),
    current: () => ipcRenderer.invoke(IPC.authCurrent),
    changePassword: (current: string, next: string) =>
      ipcRenderer.invoke(IPC.authChangePassword, current, next),
    requestReset: (email: string) => ipcRenderer.invoke(IPC.authResetRequest, email),
    completeReset: (token: string, next: string) =>
      ipcRenderer.invoke('auth:reset-complete', token, next)
  },
  users: {
    list: () => ipcRenderer.invoke(IPC.usersList),
    create: (input: { name: string; email: string; role: Role; locations: string[]; tempPassword: string }) =>
      ipcRenderer.invoke(IPC.usersCreate, input),
    update: (id: number, patch: { name?: string; email?: string; role?: Role; locations?: string[]; active?: boolean }) =>
      ipcRenderer.invoke(IPC.usersUpdate, id, patch),
    deactivate: (id: number) => ipcRenderer.invoke(IPC.usersDeactivate, id),
    resetPassword: (id: number, temp: string) => ipcRenderer.invoke(IPC.usersResetPassword, id, temp),
    forceLogout: (id: number) => ipcRenderer.invoke(IPC.usersForceLogout, id),
    unlock: (id: number) => ipcRenderer.invoke(IPC.usersUnlock, id)
  },
  reports: {
    pick: (kind: 'xlsx' | 'csv' | 'any') => ipcRenderer.invoke(IPC.reportPick, kind),
    parse: (req: { bytes: string; name: string; type: ReportType; locationId?: string }) =>
      ipcRenderer.invoke(IPC.reportParse, req)
  },
  goals: {
    get: (locationId: string) => ipcRenderer.invoke(IPC.goalsGet, locationId),
    save: (locationId: string, goals: EmployeeGoals[]) => ipcRenderer.invoke(IPC.goalsSave, locationId, goals)
  },
  exports: {
    excel: (req: ExcelExportRequest) => ipcRenderer.invoke(IPC.exportExcel, req),
    pdf: (req: PdfExportRequest) => ipcRenderer.invoke(IPC.exportPdf, req)
  },
  prefs: {
    get: () => ipcRenderer.invoke(IPC.prefsGet),
    set: (patch: Record<string, unknown>) => ipcRenderer.invoke(IPC.prefsSet, patch)
  },
  about: {
    get: () => ipcRenderer.invoke(IPC.aboutGet),
    checkUpdate: () => ipcRenderer.invoke(IPC.updateCheck)
  }
}

export type NeroliApi = typeof api

contextBridge.exposeInMainWorld('neroli', api)
