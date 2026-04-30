import { contextBridge, ipcRenderer } from 'electron'

const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:register', name, email, password),
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    me: () => ipcRenderer.invoke('auth:me') as Promise<{ user: { id: number; name: string; email: string } } | null>
  },
  situations: {
    list: () => ipcRenderer.invoke('situations:list'),
    get: (id: number) => ipcRenderer.invoke('situations:get', id),
    create: (payload: unknown) => ipcRenderer.invoke('situations:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('situations:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('situations:delete', id),
    duplicate: (id: number) => ipcRenderer.invoke('situations:duplicate', id)
  },
  training: {
    startSession: (config: unknown) => ipcRenderer.invoke('training:startSession', config),
    getSession: (sessionId: number) => ipcRenderer.invoke('training:getSession', sessionId),
    dealHand: (sessionId: number) => ipcRenderer.invoke('training:dealHand', sessionId),
    submitAnswer: (data: unknown) => ipcRenderer.invoke('training:submitAnswer', data),
    finishSession: (sessionId: number) => ipcRenderer.invoke('training:finishSession', sessionId),
    getSessionResult: (sessionId: number) => ipcRenderer.invoke('training:getSessionResult', sessionId)
  },
  stats: {
    overview: (filters?: unknown) => ipcRenderer.invoke('stats:overview', filters),
    bySituation: (filters?: unknown) => ipcRenderer.invoke('stats:bySituation', filters),
    timeline: (filters?: unknown) => ipcRenderer.invoke('stats:timeline', filters),
    worstHands: (filters: unknown, limit: number) => ipcRenderer.invoke('stats:worstHands', filters, limit)
  }
}

contextBridge.exposeInMainWorld('api', api)
