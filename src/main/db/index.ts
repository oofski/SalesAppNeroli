import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { LOCATION_IDS } from '@shared/locations'
import type { EmployeeGoals, Role, User } from '@shared/types'

const BCRYPT_COST = 12 // §10.3
const DEFAULT_PASSWORD = 'Neroli2026!' // seeded default — documented in README, change on first use

let db: Database.Database

export function initDb(filePath: string): void {
  db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate()
  seed()
}

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin','gm')),
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      last_login TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_locations (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      location_id TEXT NOT NULL,
      PRIMARY KEY (user_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS password_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      employee_code TEXT NOT NULL,
      location_id TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT 'current',
      service_revenue_goal REAL,
      product_sales_goal REAL,
      rebook_goal REAL,
      request_goal REAL,
      addon_goal REAL,
      PRIMARY KEY (employee_code, location_id, period)
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
  `)
}

interface SeedUser {
  name: string
  email: string
  role: Role
  locations: string[]
}

const SEED_USERS: SeedUser[] = [
  { name: 'Admin Account', email: 'admin@neroli.com', role: 'admin', locations: LOCATION_IDS },
  { name: 'Bonnie Zeutzius', email: 'bonnie@neroli.com', role: 'admin', locations: LOCATION_IDS },
  { name: 'Jazmine Rivera', email: 'jazmine@neroli.com', role: 'gm', locations: ['brookfield', 'downtown'] },
  { name: 'Lesley Stone', email: 'lesley@neroli.com', role: 'gm', locations: ['mequon', 'north-shore'] },
  { name: 'Taylor Colby', email: 'taylor@neroli.com', role: 'gm', locations: ['east-side'] }
]

function seed(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
  if (count > 0) return
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, BCRYPT_COST)
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, role, password_hash, must_change_password) VALUES (?, ?, ?, ?, 0)`
  )
  const insertLoc = db.prepare(`INSERT INTO user_locations (user_id, location_id) VALUES (?, ?)`)
  const insertHist = db.prepare(`INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)`)
  const tx = db.transaction(() => {
    for (const u of SEED_USERS) {
      const res = insertUser.run(u.name, u.email, u.role, hash)
      const id = Number(res.lastInsertRowid)
      for (const loc of u.locations) insertLoc.run(id, loc)
      insertHist.run(id, hash)
    }
  })
  tx()
}

// ---- Row mapping ----

interface UserRow {
  id: number
  name: string
  email: string
  role: Role
  password_hash: string
  active: number
  failed_attempts: number
  locked_until: number | null
  last_login: string | null
  must_change_password: number
}

function toUser(row: UserRow): User {
  const locs = db
    .prepare('SELECT location_id FROM user_locations WHERE user_id = ? ORDER BY location_id')
    .all(row.id) as { location_id: string }[]
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    locations: locs.map((l) => l.location_id),
    active: !!row.active,
    locked: !!(row.locked_until && row.locked_until > Date.now()),
    lastLogin: row.last_login,
    mustChangePassword: !!row.must_change_password
  }
}

export function getUserRowByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as
    | UserRow
    | undefined
}

export function getUserRowById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function getUser(id: number): User | undefined {
  const row = getUserRowById(id)
  return row ? toUser(row) : undefined
}

export function listUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY role, name').all() as UserRow[]
  return rows.map(toUser)
}

export function recordFailedAttempt(id: number, lockMs: number): void {
  const row = getUserRowById(id)
  if (!row) return
  const attempts = row.failed_attempts + 1
  const lockUntil = attempts >= 5 ? Date.now() + lockMs : null
  db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
    attempts >= 5 ? 0 : attempts,
    lockUntil,
    id
  )
}

export function clearLock(id: number): void {
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(id)
}

export function markLogin(id: number): void {
  db.prepare(
    "UPDATE users SET last_login = datetime('now'), failed_attempts = 0, locked_until = NULL WHERE id = ?"
  ).run(id)
}

export function recentPasswordHashes(id: number, limit = 5): string[] {
  const rows = db
    .prepare('SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(id, limit) as { password_hash: string }[]
  return rows.map((r) => r.password_hash)
}

export function setPassword(id: number, hash: string, mustChange = false): void {
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?').run(
      hash,
      mustChange ? 1 : 0,
      id
    )
    db.prepare('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)').run(id, hash)
    // Trim history to the last 5 (§2.4 — cannot reuse last 5).
    db.prepare(
      `DELETE FROM password_history WHERE user_id = ? AND id NOT IN (
         SELECT id FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT 5)`
    ).run(id, id)
  })
  tx()
}

export interface CreateUserInput {
  name: string
  email: string
  role: Role
  locations: string[]
  tempPasswordHash: string
}

export function createUser(input: CreateUserInput): User {
  const tx = db.transaction(() => {
    const res = db
      .prepare(
        'INSERT INTO users (name, email, role, password_hash, must_change_password) VALUES (?, ?, ?, ?, 1)'
      )
      .run(input.name, input.email, input.role, input.tempPasswordHash)
    const id = Number(res.lastInsertRowid)
    for (const loc of input.locations)
      db.prepare('INSERT INTO user_locations (user_id, location_id) VALUES (?, ?)').run(id, loc)
    db.prepare('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)').run(
      id,
      input.tempPasswordHash
    )
    return id
  })
  const id = tx()
  return getUser(id)!
}

export function updateUser(
  id: number,
  patch: { name?: string; email?: string; role?: Role; locations?: string[]; active?: boolean }
): User | undefined {
  const tx = db.transaction(() => {
    if (patch.name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(patch.name, id)
    if (patch.email !== undefined) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(patch.email, id)
    if (patch.role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(patch.role, id)
    if (patch.active !== undefined)
      db.prepare('UPDATE users SET active = ? WHERE id = ?').run(patch.active ? 1 : 0, id)
    if (patch.locations !== undefined) {
      db.prepare('DELETE FROM user_locations WHERE user_id = ?').run(id)
      for (const loc of patch.locations)
        db.prepare('INSERT INTO user_locations (user_id, location_id) VALUES (?, ?)').run(id, loc)
    }
  })
  tx()
  return getUser(id)
}

// ---- Goals ----

export function getGoals(locationId: string, period = 'current'): EmployeeGoals[] {
  const rows = db
    .prepare('SELECT * FROM goals WHERE location_id = ? AND period = ?')
    .all(locationId, period) as Record<string, number | string | null>[]
  return rows.map((r) => ({
    code: String(r.employee_code),
    serviceRevenueGoal: (r.service_revenue_goal as number) ?? null,
    productSalesGoal: (r.product_sales_goal as number) ?? null,
    rebookGoal: (r.rebook_goal as number) ?? null,
    requestGoal: (r.request_goal as number) ?? null,
    addonGoal: (r.addon_goal as number) ?? null
  }))
}

export function saveGoals(locationId: string, goals: EmployeeGoals[], period = 'current'): void {
  const upsert = db.prepare(`
    INSERT INTO goals (employee_code, location_id, period, service_revenue_goal, product_sales_goal, rebook_goal, request_goal, addon_goal)
    VALUES (@code, @loc, @period, @sr, @ps, @rb, @rq, @ad)
    ON CONFLICT(employee_code, location_id, period) DO UPDATE SET
      service_revenue_goal = @sr, product_sales_goal = @ps, rebook_goal = @rb, request_goal = @rq, addon_goal = @ad
  `)
  const tx = db.transaction(() => {
    for (const g of goals) {
      upsert.run({
        code: g.code,
        loc: locationId,
        period,
        sr: g.serviceRevenueGoal,
        ps: g.productSalesGoal,
        rb: g.rebookGoal,
        rq: g.requestGoal,
        ad: g.addonGoal
      })
    }
  })
  tx()
}

// ---- Reset tokens ----

export function createResetToken(userId: number, token: string, ttlMs: number): void {
  db.prepare('INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    Date.now() + ttlMs
  )
}

export function consumeResetToken(token: string): number | null {
  const row = db.prepare('SELECT * FROM reset_tokens WHERE token = ? AND used = 0').get(token) as
    | { user_id: number; expires_at: number }
    | undefined
  if (!row || row.expires_at < Date.now()) return null
  db.prepare('UPDATE reset_tokens SET used = 1 WHERE token = ?').run(token)
  return row.user_id
}

export const DEFAULTS = { DEFAULT_PASSWORD, BCRYPT_COST }
