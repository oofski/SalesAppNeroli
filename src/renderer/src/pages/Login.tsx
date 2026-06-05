import { clsx } from 'clsx'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { validatePassword, passwordStrength } from '@shared/password'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { PasswordStrength } from '../components/PasswordStrength'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'

type View = 'login' | 'forgot' | 'reset'

export function Login(): JSX.Element {
  const setUser = useAuth((s) => s.setUser)
  const notify = useUi((s) => s.notify)

  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState(localStorage.getItem('neroli.lastUser') ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(!!localStorage.getItem('neroli.lastUser'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // reset flow
  const [resetToken, setResetToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const doLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await api.auth.login(email.trim(), password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Sign in failed.')
      return
    }
    if (remember) localStorage.setItem('neroli.lastUser', email.trim())
    else localStorage.removeItem('neroli.lastUser')
    setUser(res.user ?? null)
  }

  const doForgot = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    const res = await api.auth.requestReset(email.trim())
    setBusy(false)
    if (res.token) {
      // No mail server in a local-first desktop app — surface the secure token in-app (§12.5).
      setResetToken(res.token)
      setView('reset')
      notify('Reset link generated. Set your new password below.', 'info')
    } else {
      notify('If that email is registered, a reset link has been sent.', 'info')
      setView('login')
    }
  }

  const doReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    if (newPw !== confirmPw) {
      setError('Passwords do not match.')
      return
    }
    const check = validatePassword(newPw)
    if (!check.ok) {
      setError(`Password must include: ${check.errors.join(', ')}.`)
      return
    }
    setBusy(true)
    const res = await api.auth.completeReset(resetToken, newPw)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Reset failed.')
      return
    }
    notify('Password updated — you are now signed in.', 'success')
    setUser(res.user ?? null)
  }

  return (
    <div className="flex h-full items-center justify-center bg-brand-light p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-display text-brand-dark">Sales App</h1>
          <p className="mt-1 text-body text-text-secondary">
            {view === 'login' && 'Sign in to your leadership dashboard'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'reset' && 'Choose a new password'}
          </p>
        </div>

        <div className="rounded-modal border border-brand-stone bg-surface-white p-7 shadow-card">
          {view === 'login' && (
            <form onSubmit={doLogin} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass(!!error)}
                  placeholder="you@neroli.com"
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass(!!error)}
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-brand-dark"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              {error && <p className="text-body-sm text-status-red">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-body-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-brand-dark"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setView('forgot')
                  }}
                  className="text-body-sm font-medium text-brand-mid hover:text-brand-dark"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={busy || !email || !password} className="w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={doForgot} className="space-y-4">
              <p className="text-body-sm text-text-secondary">
                Enter your email and we’ll generate a secure reset link, valid for 24 hours.
              </p>
              <Field label="Email">
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass(false)}
                  placeholder="you@neroli.com"
                />
              </Field>
              <Button type="submit" disabled={busy || !email} className="w-full">
                Send reset link
              </Button>
              <BackLink onClick={() => setView('login')} />
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={doReset} className="space-y-4">
              <Field label="New password">
                <input
                  type="text"
                  autoFocus
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={inputClass(false)}
                  placeholder="At least 10 characters"
                />
              </Field>
              <PasswordStrength password={newPw} strength={passwordStrength(newPw)} />
              <Field label="Confirm password">
                <input
                  type="text"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={inputClass(false)}
                />
              </Field>
              {error && <p className="text-body-sm text-status-red">{error}</p>}
              <Button type="submit" disabled={busy || !newPw} className="w-full">
                Set password &amp; sign in
              </Button>
              <BackLink onClick={() => setView('login')} />
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-body-sm text-text-secondary">
          Demo sign-in · <span className="font-medium text-brand-dark">bonnie@neroli.com</span> ·{' '}
          <span className="font-mono text-[12px]">Neroli2026!</span>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label uppercase text-text-secondary">{label}</span>
      {children}
    </label>
  )
}

function BackLink({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 text-body-sm text-text-secondary hover:text-brand-dark"
    >
      <ArrowLeft size={14} /> Back to sign in
    </button>
  )
}

function inputClass(hasError: boolean): string {
  return clsx(
    'w-full rounded-lg border bg-surface-white px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors',
    'placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-mid/30',
    hasError ? 'border-status-red' : 'border-brand-stone focus:border-brand-mid'
  )
}
