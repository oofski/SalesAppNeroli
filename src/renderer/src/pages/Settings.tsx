import { useEffect, useState } from 'react'
import { User as UserIcon, Shield, SlidersHorizontal, Users, MapPin, Info } from 'lucide-react'
import type { AboutInfo, AppPreferences, Role } from '@shared/types'
import { LOCATIONS, locationName } from '@shared/locations'
import { passwordStrength, validatePassword } from '@shared/password'
import { Card, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { PasswordStrength } from '../components/PasswordStrength'
import { initials } from '../lib/format'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'
import { UserManagement } from './settings/UserManagement'

type Section = 'profile' | 'security' | 'preferences' | 'users' | 'locations' | 'about'

const NAV: { id: Section; label: string; icon: JSX.Element; adminOnly?: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: <UserIcon size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal size={16} /> },
  { id: 'users', label: 'User Management', icon: <Users size={16} />, adminOnly: true },
  { id: 'locations', label: 'Locations', icon: <MapPin size={16} />, adminOnly: true },
  { id: 'about', label: 'About', icon: <Info size={16} /> }
]

export function Settings(): JSX.Element {
  const { user, isAdmin } = useAuth()
  const [section, setSection] = useState<Section>('profile')
  const nav = NAV.filter((n) => !n.adminOnly || isAdmin())

  return (
    <div className="space-y-6">
      <h1 className="text-display text-brand-dark">Settings</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-body transition-colors ${
                section === n.id ? 'bg-brand-dark text-white' : 'text-text-secondary hover:bg-surface-gray hover:text-brand-dark'
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <div>
          {section === 'profile' && <Profile />}
          {section === 'security' && <Security />}
          {section === 'preferences' && <Preferences />}
          {section === 'users' && isAdmin() && <UserManagement />}
          {section === 'locations' && isAdmin() && <Locations />}
          {section === 'about' && <About />}
        </div>
      </div>
    </div>
  )
}

function Profile(): JSX.Element {
  const user = useAuth((s) => s.user)
  if (!user) return <div />
  return (
    <Card>
      <CardTitle>Profile</CardTitle>
      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-warm text-h1 font-semibold text-white">
          {initials(user.name)}
        </div>
        <div>
          <p className="text-h2 text-brand-dark">{user.name}</p>
          <p className="text-body text-text-secondary">{user.email}</p>
          <Badge tone="neutral" className="mt-1">
            {user.role === 'admin' ? 'Administrator' : 'General Manager'}
          </Badge>
        </div>
      </div>
      <div className="mt-6 border-t border-brand-stone pt-4">
        <p className="kpi-label mb-2">Assigned Locations</p>
        <div className="flex flex-wrap gap-2">
          {user.locations.map((l) => (
            <span key={l} className="rounded-full bg-brand-light px-3 py-1 text-body-sm text-brand-mid">
              {locationName(l)}
            </span>
          ))}
        </div>
        <p className="mt-4 text-body-sm text-text-secondary">
          Display name and location assignments are managed by an administrator in User Management.
        </p>
      </div>
    </Card>
  )
}

function Security(): JSX.Element {
  const notify = useUi((s) => s.notify)
  const logout = useAuth((s) => s.logout)
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
    notify('Password changed. Please sign in again.', 'success')
    setTimeout(() => logout(), 1200) // §2.4: logged out after change
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Change Password</CardTitle>
        <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
          <Input label="Current password" type="password" value={current} onChange={setCurrent} />
          <div>
            <Input label="New password" type="password" value={next} onChange={setNext} />
            <div className="mt-2">
              <PasswordStrength password={next} strength={passwordStrength(next)} />
            </div>
          </div>
          <Input label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
          {error && <p className="text-body-sm text-status-red">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update Password'}
          </Button>
        </form>
      </Card>
      <Card>
        <CardTitle>Active Session</CardTitle>
        <p className="mt-2 text-body-sm text-text-secondary">
          Sessions expire after 8 hours of inactivity. Signing out here ends this session immediately.
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => logout()}>
          Sign out of this device
        </Button>
      </Card>
    </div>
  )
}

function Preferences(): JSX.Element {
  const notify = useUi((s) => s.notify)
  const allowed = useAuth((s) => s.user?.locations ?? [])
  const [prefs, setPrefs] = useState<AppPreferences | null>(null)

  useEffect(() => {
    api.prefs.get().then(setPrefs)
  }, [])

  const update = async (patch: Partial<AppPreferences>): Promise<void> => {
    const updated = await api.prefs.set(patch)
    setPrefs(updated)
    notify('Preference saved.', 'success')
  }

  if (!prefs) return <Card><p className="text-body-sm text-text-secondary">Loading…</p></Card>

  return (
    <Card>
      <CardTitle>Preferences</CardTitle>
      <div className="mt-5 max-w-md space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-label uppercase text-text-secondary">Default location view</span>
          <select
            value={prefs.defaultLocationView ?? ''}
            onChange={(e) => update({ defaultLocationView: e.target.value || null })}
            className="w-full rounded-lg border border-brand-stone bg-surface-white px-3 py-2.5 text-body outline-none focus:border-brand-mid"
          >
            <option value="">All assigned locations</option>
            {LOCATIONS.filter((l) => allowed.includes(l.id)).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-label uppercase text-text-secondary">Date format</span>
          <select
            value={prefs.dateFormat}
            onChange={(e) => update({ dateFormat: e.target.value as 'us' | 'iso' })}
            className="w-full rounded-lg border border-brand-stone bg-surface-white px-3 py-2.5 text-body outline-none focus:border-brand-mid"
          >
            <option value="us">US — Jun 5, 2026</option>
            <option value="iso">ISO — 2026-06-05</option>
          </select>
        </label>
      </div>
    </Card>
  )
}

function Locations(): JSX.Element {
  return (
    <Card>
      <CardTitle>Locations</CardTitle>
      <p className="mt-1 text-body-sm text-text-secondary">The five Neroli locations. East Side hides spa categories throughout the app.</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-brand-stone">
        <table className="w-full text-body">
          <thead className="bg-brand-dark text-white">
            <tr>
              <th className="px-4 py-2.5 text-left text-label uppercase">Location</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Code</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Spa</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Notes</th>
            </tr>
          </thead>
          <tbody>
            {LOCATIONS.map((l, i) => (
              <tr key={l.id} className={i % 2 ? 'bg-surface-gray' : 'bg-surface-white'}>
                <td className="px-4 py-2.5 font-medium">{l.name}</td>
                <td className="px-4 py-2.5 font-mono text-[13px]">{l.shortCode}</td>
                <td className="px-4 py-2.5">{l.hasSpa ? <Badge tone="green">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                <td className="px-4 py-2.5 text-text-secondary">{l.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function About(): JSX.Element {
  const notify = useUi((s) => s.notify)
  const [about, setAbout] = useState<AboutInfo | null>(null)

  useEffect(() => {
    api.about.get().then(setAbout)
  }, [])

  return (
    <Card>
      <CardTitle>About</CardTitle>
      <div className="mt-4 space-y-3">
        <Row label="Application" value="Neroli Sales App" />
        <Row label="Version" value={about?.version ?? '—'} />
        <Row label="Last update check" value={about?.lastUpdateCheck ? new Date(about.lastUpdateCheck).toLocaleString() : '—'} />
        <Button
          variant="secondary"
          onClick={async () => {
            await api.about.checkUpdate()
            notify('You’re running the latest version.', 'success')
          }}
        >
          Check for Updates
        </Button>
      </div>
      <div className="mt-6 border-t border-brand-stone pt-4">
        <p className="kpi-label mb-2">Release History</p>
        {about?.releaseNotes.map((r) => (
          <div key={r.version} className="mb-2">
            <p className="text-body font-medium text-brand-dark">v{r.version}</p>
            <p className="text-body-sm text-text-secondary">{r.notes}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-text-secondary">Confidential — Internal Use Only · Neroli Salon &amp; Spa</p>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between border-b border-brand-stone/60 pb-2">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span className="text-body font-medium text-text-primary">{value}</span>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label uppercase text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-stone bg-surface-white px-3.5 py-2.5 text-body outline-none focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/30"
      />
    </label>
  )
}

export type { Role }
