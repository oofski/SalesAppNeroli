import { create } from 'zustand'
import type { User } from '@shared/types'
import { api } from '../lib/api'

interface AuthState {
  user: User | null
  ready: boolean
  setUser: (user: User | null) => void
  bootstrap: () => Promise<void>
  logout: () => Promise<void>
  isAdmin: () => boolean
  /** Locations this user is permitted to view (all five for admins). */
  allowedLocations: () => string[]
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  bootstrap: async () => {
    const user = await api.auth.current()
    set({ user, ready: true })
  },
  logout: async () => {
    await api.auth.logout()
    set({ user: null })
  },
  isAdmin: () => get().user?.role === 'admin',
  allowedLocations: () => get().user?.locations ?? []
}))
