import { existsSync, readFileSync, writeFileSync } from 'fs'
import type { AppPreferences } from '@shared/types'

// Lightweight JSON preferences store (the "electron-store" role in the Build Plan).
// Holds only non-sensitive UI preferences — never report data (§10.2).

const DEFAULT_PREFS: AppPreferences = {
  defaultLocationView: null,
  dateFormat: 'us',
  theme: 'light'
}

let prefsPath = ''
let cache: AppPreferences = { ...DEFAULT_PREFS }

export function initPrefs(filePath: string): void {
  prefsPath = filePath
  if (existsSync(prefsPath)) {
    try {
      cache = { ...DEFAULT_PREFS, ...JSON.parse(readFileSync(prefsPath, 'utf-8')) }
    } catch {
      cache = { ...DEFAULT_PREFS }
    }
  }
}

export function getPrefs(): AppPreferences {
  return cache
}

export function setPrefs(patch: Partial<AppPreferences>): AppPreferences {
  cache = { ...cache, ...patch }
  try {
    writeFileSync(prefsPath, JSON.stringify(cache, null, 2), 'utf-8')
  } catch {
    // Non-fatal — preferences are best-effort.
  }
  return cache
}
