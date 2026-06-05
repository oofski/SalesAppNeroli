import { useState } from 'react'
import { passwordStrength, validatePassword } from '@shared/password'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { PasswordStrength } from '../components/PasswordStrength'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'

// Shown after first login with a temp password (§11.3 onboarding).
export function ForcePasswordChange(): JSX.Element {
  const { user, setUser, logout } = useAuth()
  const notify = useUi((s) => s.notify)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    if (next !== confirm) return setError('New passwords do not match.')
    const check = validatePassword(next)
    if (!check.ok) return setError(`Password must include: ${check.errors.join(', ')}.`)
    setBusy(true)
    const res = await api.auth.changePassword(current, next)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? 'Could not change password.')
    notify('Password set. Welcome to Neroli.', 'success')
    const refreshed = await api.auth.current()
    setUser(refreshed)
  }

  return (
    <div className="flex h-full items-center justify-center bg-brand-light p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-h1 text-brand-dark">Set your password</h1>
          <p className="mt-1 text-body text-text-secondary">
            Welcome, {user?.name?.split(' ')[0]}. Please replace your temporary password to continue.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-modal border border-brand-stone bg-surface-white p-7 shadow-card">
          <Input label="Temporary password" value={current} onChange={setCurrent} />
          <div>
            <Input label="New password" value={next} onChange={setNext} />
            <div className="mt-2">
              <PasswordStrength password={next} strength={passwordStrength(next)} />
            </div>
          </div>
          <Input label="Confirm new password" value={confirm} onChange={setConfirm} />
          {error && <p className="text-body-sm text-status-red">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Save and continue'}
          </Button>
          <button type="button" onClick={() => logout()} className="w-full text-body-sm text-text-secondary hover:text-brand-dark">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label uppercase text-text-secondary">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-stone bg-surface-white px-3.5 py-2.5 text-body outline-none focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/30"
      />
    </label>
  )
}
