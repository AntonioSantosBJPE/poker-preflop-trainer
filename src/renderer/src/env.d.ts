export type FeedbackMode = 'IMMEDIATE' | 'END_OF_SESSION'

export type ApiUser = { id: number; name: string; email: string }

export type Api = {
  auth: {
    register: (name: string, email: string, password: string) => Promise<{ userId: number; name: string; email: string }>
    login: (email: string, password: string) => Promise<{ token: string; user: ApiUser }>
    logout: () => Promise<void>
    me: () => Promise<{ user: ApiUser } | null>
  }
  situations: {
    list: () => Promise<unknown[]>
    get: (id: number) => Promise<unknown>
    create: (payload: unknown) => Promise<number>
    update: (id: number, payload: unknown) => Promise<number>
    delete: (id: number) => Promise<void>
    duplicate: (id: number) => Promise<number>
  }
  training: {
    startSession: (config: {
      situationIds: number[]
      totalHands: number
      timerSeconds: number
      feedbackMode: FeedbackMode
    }) => Promise<number>
    getSession: (sessionId: number) => Promise<{
      id: number
      totalHands: number
      timerSeconds: number
      feedbackMode: FeedbackMode
      handsPlayed: number
      finished: boolean
    }>
    dealHand: (sessionId: number) => Promise<unknown>
    submitAnswer: (data: {
      sessionId: number
      chosenActionId: number | null
      timedOut?: boolean
    }) => Promise<{ isCorrect: boolean; correctActions: number[]; responseMs: number }>
    finishSession: (sessionId: number) => Promise<unknown>
    getSessionResult: (sessionId: number) => Promise<unknown>
  }
  stats: {
    overview: (filters?: unknown) => Promise<unknown>
    bySituation: (filters?: unknown) => Promise<unknown>
    timeline: (filters?: unknown) => Promise<unknown>
    worstHands: (filters: unknown, limit: number) => Promise<unknown>
  }
}

declare global {
  interface Window {
    api: Api
  }
}

export {}
