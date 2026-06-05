// Password policy (Build Plan §2.4) — shared so the renderer can show a live strength
// indicator and the main process can enforce the same rules.

export interface PasswordCheck {
  ok: boolean
  errors: string[]
}

export function validatePassword(pw: string): PasswordCheck {
  const errors: string[] = []
  if (pw.length < 10) errors.push('At least 10 characters')
  if (!/[A-Z]/.test(pw)) errors.push('One uppercase letter')
  if (!/[0-9]/.test(pw)) errors.push('One number')
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('One special character')
  return { ok: errors.length === 0, errors }
}

export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export interface StrengthResult {
  score: number // 0..4
  level: StrengthLevel
  label: string
}

/** Lightweight strength estimate for the real-time indicator. */
export function passwordStrength(pw: string): StrengthResult {
  let score = 0
  if (pw.length >= 10) score++
  if (pw.length >= 14) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  score = Math.min(4, score)
  const levels: StrengthLevel[] = ['weak', 'weak', 'fair', 'good', 'strong']
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, level: levels[score], label: labels[score] }
}
