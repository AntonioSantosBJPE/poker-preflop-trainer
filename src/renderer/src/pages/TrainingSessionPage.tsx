import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { FeedbackMode } from '../env'

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
  const deadlineRef = useRef<number | null>(null)
  const [tick, setTick] = useState(0)
  const answeredRef = useRef(false)
  const timerSecondsRef = useRef(timerSeconds)

  useEffect(() => {
    timerSecondsRef.current = timerSeconds
  }, [timerSeconds])

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
    const ts = timerSecondsRef.current
    deadlineRef.current = ts > 0 ? Date.now() + ts * 1000 : null
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

  useEffect(() => {
    if (!timerSeconds || !deadlineRef.current || feedback) return
    const t = setInterval(() => setTick((x) => x + 1), 200)
    return () => clearInterval(t)
  }, [timerSeconds, hand, feedback])

  const remainingSec =
    timerSeconds && deadlineRef.current ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)) : null

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

  useEffect(() => {
    if (!timerSeconds || !hand || feedback || answeredRef.current) return
    if (remainingSec === 0) {
      void submit(null, true)
    }
  }, [tick, timerSeconds, hand, feedback, remainingSec])

  async function onNextHand(): Promise<void> {
    setFeedback(null)
    await proceedAfterHand()
  }

  if (!hand) {
    return <p className="text-slate-400">Carregando mão…</p>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between text-sm text-slate-400">
        <span>
          Mão {index + 1} / {totalHands}
        </span>
        {remainingSec !== null && <span className="text-emerald-400 font-mono">{remainingSec}s</span>}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-2">
        <p className="text-slate-400 text-sm">{situationName}</p>
        <div className="flex gap-4 text-4xl font-bold tracking-widest">
          <span className="rounded-lg bg-white text-slate-900 px-4 py-3">
            {hand.card1.rank}
            {hand.card1.suit.toUpperCase()}
          </span>
          <span className="rounded-lg bg-white text-slate-900 px-4 py-3">
            {hand.card2.rank}
            {hand.card2.suit.toUpperCase()}
          </span>
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
