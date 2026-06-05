import { app, dialog, ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { IPC } from '@shared/ipc'
import type { ExcelExportRequest, ExportResult, PdfExportRequest, PickedFile } from '@shared/ipc'
import type { EmployeeGoals, ReportType, Role } from '@shared/types'
import {
  adminSetTempPassword,
  changePassword,
  completeReset,
  currentUser,
  forceLogout,
  hashPassword,
  login,
  logout,
  requestReset,
  unlockUser
} from './auth'
import {
  createUser,
  getGoals,
  listUsers,
  saveGoals,
  updateUser
} from './db'
import { parseReport } from './parsers'
import { writeExcel } from './exports/excel'
import { writePdf } from './exports/pdf'
import { getPrefs, setPrefs } from './prefs'

const RELEASE_NOTES = [
  { version: '1.0.0', notes: 'Initial release — Dashboard, Sales, Coaching, and Reviews with Zenoti report parsing and PDF/Excel exports.' }
]

function requireAdmin(): boolean {
  return currentUser()?.role === 'admin'
}

export function registerIpc(): void {
  // ---- Auth ----
  ipcMain.handle(IPC.authLogin, (_e, email: string, password: string) => login(email, password))
  ipcMain.handle(IPC.authLogout, () => {
    logout()
    return { ok: true }
  })
  ipcMain.handle(IPC.authCurrent, () => currentUser())
  ipcMain.handle(IPC.authChangePassword, (_e, current: string, next: string) => {
    const u = currentUser()
    if (!u) return { ok: false, error: 'Not signed in.' }
    return changePassword(u.id, current, next)
  })
  ipcMain.handle(IPC.authResetRequest, (_e, email: string) => requestReset(email))
  ipcMain.handle('auth:reset-complete', (_e, token: string, next: string) => completeReset(token, next))

  // ---- User management (admin) ----
  ipcMain.handle(IPC.usersList, () => (requireAdmin() ? listUsers() : []))
  ipcMain.handle(
    IPC.usersCreate,
    (_e, input: { name: string; email: string; role: Role; locations: string[]; tempPassword: string }) => {
      if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
      try {
        const user = createUser({
          name: input.name,
          email: input.email,
          role: input.role,
          locations: input.locations,
          tempPasswordHash: hashPassword(input.tempPassword)
        })
        return { ok: true, user }
      } catch (e) {
        return { ok: false, error: (e as Error).message }
      }
    }
  )
  ipcMain.handle(
    IPC.usersUpdate,
    (_e, id: number, patch: { name?: string; email?: string; role?: Role; locations?: string[]; active?: boolean }) => {
      if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
      const user = updateUser(id, patch)
      return { ok: !!user, user }
    }
  )
  ipcMain.handle(IPC.usersDeactivate, (_e, id: number) => {
    if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
    const user = updateUser(id, { active: false })
    forceLogout(id)
    return { ok: !!user, user }
  })
  ipcMain.handle(IPC.usersResetPassword, (_e, id: number, temp: string) => {
    if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
    return adminSetTempPassword(id, temp)
  })
  ipcMain.handle(IPC.usersForceLogout, (_e, id: number) => {
    if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
    forceLogout(id)
    return { ok: true }
  })
  ipcMain.handle(IPC.usersUnlock, (_e, id: number) => {
    if (!requireAdmin()) return { ok: false, error: 'Admin only.' }
    unlockUser(id)
    return { ok: true }
  })

  // ---- Reports ----
  ipcMain.handle(IPC.reportPick, async (_e, kind: 'xlsx' | 'csv' | 'any'): Promise<PickedFile | null> => {
    const filters =
      kind === 'csv'
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : kind === 'xlsx'
          ? [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
          : [{ name: 'Reports', extensions: ['xlsx', 'xls', 'csv'] }]
    const res = await dialog.showOpenDialog({ properties: ['openFile'], filters })
    if (res.canceled || !res.filePaths.length) return null
    const path = res.filePaths[0]
    const buf = await readFile(path)
    return { path, name: basename(path), size: buf.length, bytes: buf.toString('base64') }
  })

  ipcMain.handle(
    IPC.reportParse,
    (_e, req: { bytes: string; name: string; type: ReportType; locationId?: string }) => {
      try {
        return parseReport(req)
      } catch (e) {
        return {
          ok: false,
          type: req.type,
          error: { code: 'parse-failure', message: `Unexpected error while parsing: ${(e as Error).message}` }
        }
      }
    }
  )

  // ---- Goals ----
  ipcMain.handle(IPC.goalsGet, (_e, locationId: string) => getGoals(locationId))
  ipcMain.handle(IPC.goalsSave, (_e, locationId: string, goals: EmployeeGoals[]) => {
    saveGoals(locationId, goals)
    return { ok: true }
  })

  // ---- Exports ----
  ipcMain.handle(IPC.exportExcel, async (_e, req: ExcelExportRequest): Promise<ExportResult> => {
    const res = await dialog.showSaveDialog({
      defaultPath: req.defaultFileName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    try {
      await writeExcel(req, res.filePath)
      return { ok: true, path: res.filePath }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle(IPC.exportPdf, async (_e, req: PdfExportRequest): Promise<ExportResult> => {
    const res = await dialog.showSaveDialog({
      defaultPath: req.defaultFileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    try {
      await writePdf(req.html, res.filePath)
      return { ok: true, path: res.filePath }
    } catch (e) {
      return { ok: false, error: `Export failed. Please try again. (${(e as Error).message})` }
    }
  })

  // ---- Preferences / About ----
  ipcMain.handle(IPC.prefsGet, () => getPrefs())
  ipcMain.handle(IPC.prefsSet, (_e, patch) => setPrefs(patch))
  ipcMain.handle(IPC.aboutGet, () => ({
    version: app.getVersion(),
    lastUpdateCheck: new Date().toISOString(),
    releaseNotes: RELEASE_NOTES
  }))
  ipcMain.handle(IPC.updateCheck, () => ({ ok: true, upToDate: true }))
}
