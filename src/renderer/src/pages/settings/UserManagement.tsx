import { useEffect, useState } from 'react'
import { UserPlus, KeyRound, LogOut, Unlock } from 'lucide-react'
import type { Role, User } from '@shared/types'
import { LOCATIONS, locationName } from '@shared/locations'
import { validatePassword } from '@shared/password'
import { Card, CardTitle } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useUi } from '../../store/ui'

export function UserManagement(): JSX.Element {
  const notify = useUi((s) => s.notify)
  const [users, setUsers] = useState<User[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [adding, setAdding] = useState(false)

  const refresh = async (): Promise<void> => setUsers(await api.users.list())
  useEffect(() => {
    refresh()
  }, [])

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setAdding(true)}>
          Add User
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-brand-stone">
        <table className="w-full text-body">
          <thead className="bg-brand-dark text-white">
            <tr>
              <th className="px-4 py-2.5 text-left text-label uppercase">Name</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Role</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Locations</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Last Login</th>
              <th className="px-4 py-2.5 text-left text-label uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                onClick={() => setEditing(u)}
                className={`cursor-pointer transition-colors hover:bg-brand-light ${i % 2 ? 'bg-surface-gray' : 'bg-surface-white'}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-text-primary">{u.name}</div>
                  <div className="text-[11px] text-text-secondary">{u.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.role === 'admin' ? 'green' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'GM'}</Badge>
                </td>
                <td className="px-4 py-2.5 text-body-sm text-text-secondary">
                  {u.locations.length >= 5 ? 'All locations' : u.locations.map(locationName).join(', ')}
                </td>
                <td className="px-4 py-2.5 text-body-sm text-text-secondary">{u.lastLogin ? formatDate(u.lastLogin.slice(0, 10)) : 'Never'}</td>
                <td className="px-4 py-2.5">
                  {!u.active ? <Badge tone="neutral">Deactivated</Badge> : u.locked ? <Badge tone="red">Locked</Badge> : <Badge tone="green">Active</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <UserForm onClose={() => setAdding(false)} onSaved={refresh} />}
      {editing && <UserForm user={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </Card>
  )
}

interface FormProps {
  user?: User
  onClose: () => void
  onSaved: () => Promise<void>
}

function UserForm({ user, onClose, onSaved }: FormProps): JSX.Element {
  const notify = useUi((s) => s.notify)
  const editing = !!user
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'gm')
  const [locations, setLocations] = useState<string[]>(user?.locations ?? [])
  const [tempPassword, setTempPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggleLoc = (id: string): void =>
    setLocations((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const save = async (): Promise<void> => {
    setError('')
    if (!name.trim() || !email.trim()) return setError('Name and email are required.')
    if (role === 'gm' && locations.length === 0) return setError('Assign at least one location to a GM.')
    const effectiveLocs = role === 'admin' ? LOCATIONS.map((l) => l.id) : locations

    setBusy(true)
    if (editing) {
      const res = await api.users.update(user!.id, { name, email, role, locations: effectiveLocs })
      setBusy(false)
      if (!res.ok) return setError(res.error ?? 'Update failed.')
      notify('User updated.', 'success')
    } else {
      const check = validatePassword(tempPassword)
      if (!check.ok) {
        setBusy(false)
        return setError(`Temp password must include: ${check.errors.join(', ')}.`)
      }
      const res = await api.users.create({ name, email, role, locations: effectiveLocs, tempPassword })
      setBusy(false)
      if (!res.ok) return setError(res.error ?? 'Could not create user.')
      notify('User created. Share the temporary password securely — they’ll be prompted to change it.', 'success')
    }
    await onSaved()
    onClose()
  }

  const doReset = async (): Promise<void> => {
    const temp = 'Neroli' + Math.floor(1000 + Math.random() * 9000) + '!'
    const res = await api.users.resetPassword(user!.id, temp)
    if (res.ok) notify(`Temp password set to: ${temp} (share securely)`, 'success')
    else notify(res.error ?? 'Reset failed.', 'error')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${user!.name}` : 'Add User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Work email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Role">
          <div className="flex gap-2">
            {(['gm', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-body-sm font-medium transition-colors ${
                  role === r ? 'border-brand-mid bg-brand-light text-brand-dark' : 'border-brand-stone text-text-secondary'
                }`}
              >
                {r === 'admin' ? 'Administrator (all locations)' : 'General Manager'}
              </button>
            ))}
          </div>
        </Field>
        {role === 'gm' && (
          <Field label="Assigned locations">
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-stone px-3 py-2 text-body-sm">
                  <input type="checkbox" checked={locations.includes(l.id)} onChange={() => toggleLoc(l.id)} className="accent-brand-dark" />
                  {l.name}
                </label>
              ))}
            </div>
          </Field>
        )}
        {!editing && (
          <Field label="Temporary password">
            <input value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className={inputCls} placeholder="They’ll change this on first login" />
          </Field>
        )}

        {error && <p className="text-body-sm text-status-red">{error}</p>}

        {editing && (
          <div className="flex flex-wrap gap-2 border-t border-brand-stone pt-4">
            <Button variant="secondary" size="sm" icon={<KeyRound size={14} />} onClick={doReset}>
              Reset Password
            </Button>
            {user!.locked && (
              <Button variant="secondary" size="sm" icon={<Unlock size={14} />} onClick={async () => { await api.users.unlock(user!.id); notify('Account unlocked.', 'success'); await onSaved() }}>
                Unlock
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<LogOut size={14} />} onClick={async () => { await api.users.forceLogout(user!.id); notify('User signed out everywhere.', 'success') }}>
              Force Logout
            </Button>
            <Button variant="destructive" size="sm" onClick={async () => { await api.users.deactivate(user!.id); notify('User deactivated.', 'success'); await onSaved(); onClose() }}>
              Deactivate
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

const inputCls =
  'w-full rounded-lg border border-brand-stone bg-surface-white px-3.5 py-2.5 text-body outline-none focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/30'

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label uppercase text-text-secondary">{label}</span>
      {children}
    </label>
  )
}
