import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSessionTimerOptions {
  timerSeconds: number;
  active: boolean;
  onTimeout?: () => void;
}

export interface UseSessionTimerReturn {
  remainingSec: number | null;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useSessionTimer({
  timerSeconds,
  active,
  onTimeout,
}: UseSessionTimerOptions): UseSessionTimerReturn {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const pausedRemaining = useRef<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const timeoutFiredRef = useRef(false);

  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!active) return;
    if (timerSeconds > 0) {
      setDeadline(Date.now() + timerSeconds * 1000);
    } else {
      setDeadline(null);
      setRemainingSec(null);
    }
  }, [timerSeconds, active]);

  useEffect(() => {
    if (deadline === null) return;
    timeoutFiredRef.current = false;
    let rafId: number;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        onTimeoutRef.current?.();
        return;
      }
      if (remaining > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [deadline]);

  const pause = useCallback(() => {
    if (deadline !== null) {
      pausedRemaining.current = Math.max(0, deadline - Date.now());
      setDeadline(null);
    }
    setIsPaused(true);
  }, [deadline]);

  const resume = useCallback(() => {
    if (pausedRemaining.current !== null) {
      setDeadline(Date.now() + pausedRemaining.current);
      pausedRemaining.current = null;
    }
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setDeadline(null);
    setRemainingSec(null);
    setIsPaused(false);
    pausedRemaining.current = null;
    timeoutFiredRef.current = false;
  }, []);

  return { remainingSec, isPaused, pause, resume, reset };
}
