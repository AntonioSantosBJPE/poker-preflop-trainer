import { create } from 'zustand'
import type { ApiUser } from '../env'

type AuthState = {
  user: ApiUser | null
  ready: boolean
  setUser: (u: ApiUser | null) => void
  setReady: (v: boolean) => void
  refresh: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
  refresh: async () => {
    const me = await window.api.auth.me()
    set({ user: me?.user ?? null, ready: true })
  }
}))
