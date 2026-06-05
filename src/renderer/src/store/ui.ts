import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface UiState {
  toasts: Toast[]
  notify: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

let seq = 1

export const useUi = create<UiState>((set) => ({
  toasts: [],
  notify: (message, kind = 'info') => {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))
