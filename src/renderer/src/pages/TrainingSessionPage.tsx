import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { FeedbackMode } from '../env'
import { PlayingCard } from '../components/PlayingCard'

type Card = { rank: string; suit: string }
type Act = { id: number; name: string; colorHex: string }

export function TrainingSessionPage(): React.ReactElement {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation() as {
    state?: { totalHands: number; timerSeconds: number; feedbackMode: FeedbackMode }
  }

  const [totalHands, setTotalHands] = useState(location.state?.totalHands ?? 10)
  const [timerSeconds, setTimerSeconds] = useState(location.state?.timerSeconds ?? 0)
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(location.state?.feedbackMode ?? 'IMMEDIATE')
  const [index, setIndex] = useState(0)

  const [hand, setHand] = useState<{
    situationId: number
    card1: Card
    card2: Card
    actions: Act[]
  } | null>(null)
  const [situationName, setSituationName] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; ms: number } | null>(null)
  const [showAbandonDialog, setShowAbandonDialog] = useState(false)

  const deadlineRef = useRef<number | null>(null)
  const pausedRemainingMsRef = useRef<number | null>(null)
  const [tick, setTick] = useState(0)
  const answeredRef = useRef(false)
  const timerSecondsRef = useRef(timerSeconds)
  const feedbackRef = useRef(feedback)
  const handRef = useRef(hand)
  const showAbandonDialogRef = useRef(showAbandonDialog)

  useEffect(() => {
    timerSecondsRef.current = timerSeconds
  }, [timerSeconds])

  useEffect(() => {
    feedbackRef.current = feedback
  }, [feedback])

  useEffect(() => {
    handRef.current = hand
  }, [hand])

  useEffect(() => {
    showAbandonDialogRef.current = showAbandonDialog
  }, [showAbandonDialog])

  const dealNextHand = useCallback(async () => {
    answeredRef.current = false
    const sid = Number(sessionId)
    const h = (await window.api.training.dealHand(sid)) as {
      situationId: number
      card1: Card
      card2: Card
      actions: Act[]
    }
    setHand(h)
    const detail = (await window.api.situations.get(h.situationId)) as { name: string }
    setSituationName(detail.name)
    setFeedback(null)
    feedbackRef.current = null
    deadlineRef.current = timerSecondsRef.current > 0 ? Date.now() + timerSecondsRef.current * 1000 : null
  }, [sessionId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const meta = await window.api.training.getSession(Number(sessionId))
        if (cancelled) return
        if (meta.finished) {
          navigate(`/training/${sessionId}/result`, { replace: true })
          return
        }
        setTotalHands(meta.totalHands)
        setTimerSeconds(meta.timerSeconds)
        timerSecondsRef.current = meta.timerSeconds
        setFeedbackMode(meta.feedbackMode as FeedbackMode)
        setIndex(meta.handsPlayed)
        await dealNextHand()
      } catch {
        if (!cancelled) {
          navigate('/training', { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, navigate, dealNextHand])

  // Tick interval: pauses when abandon dialog is open or there is no hand
  useEffect(() => {
    if (!hand || showAbandonDialog) return
    const t = setInterval(() => setTick((x) => x + 1), 200)
    return () => clearInterval(t)
  }, [hand, showAbandonDialog])

  // Compute remaining seconds from deadline ref on every tick
  const remainingSec =
    timerSecondsRef.current && deadlineRef.current
      ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      : null

  async function finishSession(): Promise<void> {
    await window.api.training.finishSession(Number(sessionId))
    navigate(`/training/${sessionId}/result`)
  }

  async function proceedAfterHand(): Promise<void> {
    const next = index + 1
    if (next >= totalHands) {
      await finishSession()
      return
    }
    setIndex(next)
    await dealNextHand()
  }

  async function submit(actionId: number | null, timedOut: boolean): Promise<void> {
    if (answeredRef.current) return
    answeredRef.current = true
    const res = await window.api.training.submitAnswer({
      sessionId: Number(sessionId),
      chosenActionId: actionId,
      timedOut
    })
    if (feedbackMode === 'IMMEDIATE') {
      setFeedback({ ok: res.isCorrect, ms: res.responseMs })
    } else {
      await proceedAfterHand()
    }
  }

  // Fire timeout submit using refs to avoid unnecessary effect recreations
  useEffect(() => {
    if (
      !timerSecondsRef.current ||
      !handRef.current ||
      feedbackRef.current ||
      answeredRef.current ||
      showAbandonDialogRef.current
    )
      return
    if (remainingSec === 0) {
      void submit(null, true)
    }
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAbandonDialog(): void {
    // Freeze the deadline: store remaining ms and clear the deadline so the display stops
    if (deadlineRef.current !== null) {
      pausedRemainingMsRef.current = Math.max(0, deadlineRef.current - Date.now())
      deadlineRef.current = null
    }
    setShowAbandonDialog(true)
  }

  function closeAbandonDialog(): void {
    // Restore the deadline from the paused remaining time
    if (pausedRemainingMsRef.current !== null) {
      deadlineRef.current = Date.now() + pausedRemainingMsRef.current
      pausedRemainingMsRef.current = null
    }
    setShowAbandonDialog(false)
  }

  async function onNextHand(): Promise<void> {
    setFeedback(null)
    await proceedAfterHand()
  }

  if (!hand) {
    return <p className="text-slate-400">Carregando mão…</p>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center text-sm text-slate-400">
        <span>
          Mão {index + 1} / {totalHands}
        </span>
        <div className="flex items-center gap-4">
          {remainingSec !== null && (
            <span className="text-emerald-400 font-mono">{remainingSec}s</span>
          )}
          <button
            type="button"
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"
            onClick={() => openAbandonDialog()}
          >
            Abandonar
          </button>
        </div>
      </div>

      {showAbandonDialog && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 space-y-4 max-w-sm w-full mx-4">
            <p id="abandon-title" className="text-lg font-semibold text-white">
              Abandonar sessão?
            </p>
            <p className="text-slate-400 text-sm">
              O progresso desta sessão será perdido.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                onClick={() => closeAbandonDialog()}
              >
                Continuar treinando
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => void finishSession()}
              >
                Confirmar abandono
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-2">
        <p className="text-slate-400 text-sm">{situationName}</p>
        <div className="flex gap-4">
          <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
          <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {hand.actions.map((a) => (
          <button
            key={a.id}
            type="button"
            style={{ borderColor: a.colorHex }}
            className="rounded-lg border-2 bg-slate-950 px-4 py-3 font-medium min-w-[120px]"
            disabled={Boolean(feedback)}
            onClick={() => void submit(a.id, false)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {feedback && feedbackMode === 'IMMEDIATE' && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4 space-y-3">
          <p className={feedback.ok ? 'text-emerald-400' : 'text-red-400'}>
            {feedback.ok ? 'Correto' : 'Incorreto'} — {feedback.ms} ms
          </p>
          <button type="button" className="rounded bg-emerald-600 px-4 py-2 text-sm" onClick={() => void onNextHand()}>
            Próxima mão
          </button>
        </div>
      )}
    </div>
  )
}
