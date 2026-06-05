// IPC channel contract shared by the preload bridge and the main-process handlers.
// Keeping the names in one place keeps both sides honest.

export const IPC = {
  // Auth & users
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authCurrent: 'auth:current',
  authChangePassword: 'auth:change-password',
  authResetRequest: 'auth:reset-request',

  usersList: 'users:list',
  usersCreate: 'users:create',
  usersUpdate: 'users:update',
  usersDeactivate: 'users:deactivate',
  usersResetPassword: 'users:reset-password',
  usersForceLogout: 'users:force-logout',
  usersUnlock: 'users:unlock',

  // Reports
  reportPick: 'report:pick', // open file dialog, returns file path + bytes
  reportParse: 'report:parse', // parse a chosen file as a given type

  // Goals
  goalsGet: 'goals:get',
  goalsSave: 'goals:save',

  // Exports
  exportExcel: 'export:excel',
  exportPdf: 'export:pdf',

  // Preferences / about / updates
  prefsGet: 'prefs:get',
  prefsSet: 'prefs:set',
  aboutGet: 'about:get',
  updateCheck: 'update:check'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export interface PickedFile {
  path: string
  name: string
  size: number
  /** base64-encoded file bytes */
  bytes: string
}

export interface ExcelExportRequest {
  kind:
    | 'product-detail'
    | 'product-summary'
    | 'service-detail'
    | 'employee-goals'
    | 'employee-performance'
    | 'employee-ratings'
    | 'low-rating-reviews'
    | 'company-review-summary'
  title: string
  location: string
  period: string
  sheets: ExcelSheetSpec[]
  defaultFileName: string
}

export interface ExcelSheetSpec {
  name: string
  columns: { header: string; key: string; width?: number; format?: 'currency' | 'percent' | 'int' | 'text' }[]
  rows: Record<string, string | number | null>[]
}

export interface PdfExportRequest {
  kind: 'coaching-guide' | 'sales-summary' | 'low-rating-reviews' | 'star-performers'
  /** Fully-rendered HTML document body to convert to PDF. */
  html: string
  defaultFileName: string
}

export interface ExportResult {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}
