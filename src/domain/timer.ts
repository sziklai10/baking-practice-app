// Countdown timer as plain data plus pure functions. Everything is derived
// from wall-clock timestamps, never from counting ticks, so the result stays
// correct after the app is backgrounded, the screen locks or JS is suspended.

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TimerState = {
  durationMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
};

export function createTimer(durationMs: number): TimerState {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Timer duration must be a positive number of milliseconds');
  }
  return { durationMs, startedAt: null, pausedAt: null, pausedTotalMs: 0 };
}

/** Time the timer has actually been counting, excluding pauses. */
export function activeElapsedMs(t: TimerState, now: number): number {
  if (t.startedAt === null) return 0;
  const until = t.pausedAt ?? now;
  const elapsed = until - t.startedAt - t.pausedTotalMs;
  return Math.min(Math.max(0, elapsed), t.durationMs);
}

export function remainingMs(t: TimerState, now: number): number {
  return t.durationMs - activeElapsedMs(t, now);
}

export function timerStatus(t: TimerState, now: number): TimerStatus {
  if (t.startedAt === null) return 'idle';
  if (remainingMs(t, now) <= 0) return 'finished';
  return t.pausedAt === null ? 'running' : 'paused';
}

/** The wall-clock moment the timer will hit zero, or null if it isn't running. */
export function endsAt(t: TimerState, now: number): number | null {
  if (timerStatus(t, now) !== 'running' || t.startedAt === null) return null;
  return t.startedAt + t.pausedTotalMs + t.durationMs;
}

/** When the timer reached zero, or null if it hasn't. */
export function finishedAt(t: TimerState, now: number): number | null {
  if (timerStatus(t, now) !== 'finished' || t.startedAt === null) return null;
  return t.startedAt + t.pausedTotalMs + t.durationMs;
}

export function start(t: TimerState, now: number): TimerState {
  if (t.startedAt !== null) return t;
  return { ...t, startedAt: now };
}

export function pause(t: TimerState, now: number): TimerState {
  if (timerStatus(t, now) !== 'running') return t;
  return { ...t, pausedAt: now };
}

export function resume(t: TimerState, now: number): TimerState {
  if (timerStatus(t, now) !== 'paused' || t.pausedAt === null) return t;
  return { ...t, pausedAt: null, pausedTotalMs: t.pausedTotalMs + (now - t.pausedAt) };
}

/** Adds time to a timer that is still going. A finished timer stays finished. */
export function addTime(t: TimerState, ms: number, now: number): TimerState {
  const status = timerStatus(t, now);
  if (ms <= 0 || status === 'finished') return t;
  return { ...t, durationMs: t.durationMs + ms };
}

const MINUTE = 60_000;

/** Remaining-time points at which a screen reader hears an update. */
export const ANNOUNCE_AT_MS = [30 * MINUTE, 10 * MINUTE, 5 * MINUTE, 1 * MINUTE];

/**
 * The milestone passed between two readings, if any. Only the smallest one
 * is returned, so coming back from the background doesn't read out a burst.
 */
export function crossedMilestone(prevRemaining: number, nextRemaining: number): number | null {
  const crossed = ANNOUNCE_AT_MS.filter((m) => prevRemaining > m && nextRemaining <= m);
  return crossed.length ? Math.min(...crossed) : null;
}
