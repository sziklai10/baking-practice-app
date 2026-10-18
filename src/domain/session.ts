import type { TimerState } from './timer';

/** A session that is running, paused, or ended and waiting for its reflection. */
export type ActiveSession = {
  id: string;
  kind: 'practice';
  challengeId: string;
  timer: TimerState;
  /** Set when the baker stops or time runs out; the reflection screen comes next. */
  endedAt: number | null;
  /** Scheduled "time's up" notification, so it can be cancelled on pause or exit. */
  alertId: string | null;
};

export type Feeling = 'calm' | 'flustered' | 'chaos';

export const FEELING_LABELS: Record<Feeling, string> = {
  calm: 'Cool as a cucumber',
  flustered: 'A bit flustered',
  chaos: 'Utter chaos',
};

/** A finished session as it appears in the progress record. */
export type SessionRecord = {
  id: string;
  kind: 'practice';
  challengeId: string;
  title: string;
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  activeMs: number;
  /** True if the timer ran out, false if the baker stopped early. */
  ranToTime: boolean;
  wentWell: string;
  improveNext: string;
  feeling: Feeling | null;
};

export function newId(now: number = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
