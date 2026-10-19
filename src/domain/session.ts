import type { PromptOutcome, TentState } from './tent';
import type { TimerState } from './timer';

export type SessionKind = 'practice' | 'tent';

/** A session that is running, paused, or ended and waiting for its reflection. */
export type ActiveSession = {
  id: string;
  kind: SessionKind;
  /** Practice sessions always have a challenge; a Tent Simulation may not. */
  challengeId: string | null;
  timer: TimerState;
  /** Only for Tent Simulations. */
  tent?: TentState;
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

export const PROMPT_OUTCOME_LABELS: Record<PromptOutcome, string> = {
  answered: 'Answered',
  skipped: 'Skipped',
  faded: 'Let it pass',
  muted: 'Muted',
  missed: 'Missed while away',
};

export type PromptRecord = { promptId: string; text: string; outcome: PromptOutcome };

/** A finished session as it appears in the progress record. */
export type SessionRecord = {
  id: string;
  kind: SessionKind;
  challengeId: string | null;
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
  /** Tent Simulation only: the prompts that came up and what happened to each. */
  prompts?: PromptRecord[];
  promptNotes?: string;
};

export function newId(now: number = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A random 32-bit seed for a session's prompt schedule. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
