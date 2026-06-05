import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import type { AuthResult, User } from '@shared/types'
import { validatePassword } from '@shared/password'
import {
  clearLock,
  consumeResetToken,
  createResetToken,
  DEFAULTS,
  getUser,
  getUserRowByEmail,
  getUserRowById,
  markLogin,
  recentPasswordHashes,
  recordFailedAttempt,
  setPassword
} from './db'

const LOCK_MS = 15 * 60 * 1000 // 15 minutes (§2.4)
const RESET_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

let currentUserId: number | null = null

export function currentUser(): User | null {
  return currentUserId ? getUser(currentUserId) ?? null : null
}

export function logout(): void {
  currentUserId = null
}

export function login(email: string, password: string): AuthResult {
  const row = getUserRowByEmail(email)
  if (!row) return { ok: false, error: 'Incorrect email or password.' }
  if (!row.active) return { ok: false, error: 'This account has been deactivated. Contact your administrator.' }

  if (row.locked_until && row.locked_until > Date.now()) {
    const mins = Math.ceil((row.locked_until - Date.now()) / 60000)
    return { ok: false, error: `Account locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, lockMinutes: mins }
  }

  const match = bcrypt.compareSync(password, row.password_hash)
  if (!match) {
    recordFailedAttempt(row.id, LOCK_MS)
    const after = getUserRowById(row.id)!
    if (after.locked_until && after.locked_until > Date.now()) {
      return { ok: false, error: 'Too many failed attempts. Account locked for 15 minutes.', lockMinutes: 15 }
    }
    return { ok: false, error: 'Incorrect email or password.' }
  }

  markLogin(row.id)
  currentUserId = row.id
  return { ok: true, user: getUser(row.id)! }
}

export interface ChangePasswordResult {
  ok: boolean
  error?: string
}

export function changePassword(userId: number, current: string, next: string): ChangePasswordResult {
  const row = getUserRowById(userId)
  if (!row) return { ok: false, error: 'User not found.' }
  if (!bcrypt.compareSync(current, row.password_hash))
    return { ok: false, error: 'Your current password is incorrect.' }

  const policy = validatePassword(next)
  if (!policy.ok) return { ok: false, error: `Password must include: ${policy.errors.join(', ')}.` }

  // Cannot reuse the last 5 passwords (§2.4).
  for (const oldHash of recentPasswordHashes(userId, 5)) {
    if (bcrypt.compareSync(next, oldHash))
      return { ok: false, error: 'You cannot reuse one of your last 5 passwords.' }
  }

  setPassword(userId, bcrypt.hashSync(next, DEFAULTS.BCRYPT_COST), false)
  return { ok: true }
}

/** Admin resets another user's password to a temp value (forces change on next login). */
export function adminSetTempPassword(userId: number, temp: string): ChangePasswordResult {
  const policy = validatePassword(temp)
  if (!policy.ok) return { ok: false, error: `Temp password must include: ${policy.errors.join(', ')}.` }
  setPassword(userId, bcrypt.hashSync(temp, DEFAULTS.BCRYPT_COST), true)
  return { ok: true }
}

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, DEFAULTS.BCRYPT_COST)
}

export function unlockUser(userId: number): void {
  clearLock(userId)
}

export function forceLogout(userId: number): void {
  if (currentUserId === userId) currentUserId = null
}

/**
 * Begin a password reset. In production this token is emailed (§2.4); offline/desktop
 * we return it so the in-app reset screen can be reached. Requires the email to exist.
 */
export function requestReset(email: string): { ok: boolean; token?: string; error?: string } {
  const row = getUserRowByEmail(email)
  // Do not reveal whether an email exists — always report success to the user.
  if (!row || !row.active) return { ok: true }
  const token = randomBytes(24).toString('hex')
  createResetToken(row.id, token, RESET_TTL_MS)
  return { ok: true, token }
}

export function completeReset(token: string, next: string): ChangePasswordResult & { user?: User } {
  const userId = consumeResetToken(token)
  if (!userId) return { ok: false, error: 'This reset link is invalid or has expired.' }
  const policy = validatePassword(next)
  if (!policy.ok) return { ok: false, error: `Password must include: ${policy.errors.join(', ')}.` }
  setPassword(userId, bcrypt.hashSync(next, DEFAULTS.BCRYPT_COST), false)
  markLogin(userId)
  currentUserId = userId
  return { ok: true, user: getUser(userId)! }
}
