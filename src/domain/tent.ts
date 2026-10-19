// Tent Simulation: when interview prompts appear, and what happens to them.
// Pure functions over plain data, like the timer, so they can be saved,
// restored and tested with a fake clock.
//
// Prompt times are measured in *active* session time, so pausing the timer
// also holds back the next prompt.
import type { TimerState } from './timer';
import { activeElapsedMs, pause, resume, timerStatus } from './timer';

const MIN = 60_000;

export type PromptFrequency = 'off' | 'low' | 'medium';

/** The tunable rules in one place. Guesses to test with real bakers, not research. */
export const PROMPT_RULES = {
  /** No prompts while people are getting started. */
  quietStartMs: 5 * MIN,
  /** No prompts while people are finishing and presenting. */
  quietEndMs: 10 * MIN,
  /** Range of the gap between prompts, per frequency. */
  gapMs: {
    low: [20 * MIN, 30 * MIN],
    medium: [10 * MIN, 15 * MIN],
  } as Record<Exclude<PromptFrequency, 'off'>, [number, number]>,
  /** A prompt more overdue than this (e.g. while the app was in the background) is skipped, not shown late. */
  graceMs: 30_000,
  /** How long a prompt stays on screen before fading away by itself (wall-clock time). */
  visibleMs: 60_000,
};

export type PromptOutcome = 'answered' | 'skipped' | 'faded' | 'muted' | 'missed';

export type PromptLogEntry = { promptId: string; outcome: PromptOutcome; atActiveMs: number };

export type TentOptions = {
  frequency: PromptFrequency;
  /** Pause the countdown while a prompt is on screen. */
  pauseOnPrompt: boolean;
  /** Short vibration when a prompt arrives. */
  vibrate: boolean;
};

export type TentState = TentOptions & {
  seed: number;
  /** Active-time offsets at which prompts are due, ascending. */
  schedule: number[];
  /** The order prompts are drawn in, shuffled once per session. */
  promptOrder: string[];
  /** Index of the next schedule slot not yet handled. */
  nextSlot: number;
  /** How many prompts have been drawn from promptOrder. */
  drawn: number;
  muted: boolean;
  current: { promptId: string; shownAt: number; atActiveMs: number; autoPaused: boolean } | null;
  log: PromptLogEntry[];
};

/** Small, fast seeded random number generator (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSchedule(durationMs: number, frequency: PromptFrequency, seed: number): number[] {
  if (frequency === 'off') return [];
  const windowStart = PROMPT_RULES.quietStartMs;
  const windowEnd = durationMs - PROMPT_RULES.quietEndMs;
  if (windowEnd <= windowStart) return [];

  const rand = seededRandom(seed);
  const [minGap, maxGap] = PROMPT_RULES.gapMs[frequency];
  const times: number[] = [];
  // The first prompt lands somewhere within one minimum gap of the window opening.
  let t = windowStart + rand() * minGap;
  while (t <= windowEnd) {
    times.push(Math.round(t));
    t += minGap + rand() * (maxGap - minGap);
  }
  // A short session still gets one prompt if there's any room for it.
  if (times.length === 0) times.push(Math.round(windowStart + rand() * (windowEnd - windowStart)));
  return times;
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const rand = seededRandom(seed ^ 0x9e3779b9);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createTent(options: TentOptions, durationMs: number, promptIds: string[], seed: number): TentState {
  return {
    ...options,
    seed,
    schedule: promptIds.length ? buildSchedule(durationMs, options.frequency, seed) : [],
    promptOrder: shuffled(promptIds, seed),
    nextSlot: 0,
    drawn: 0,
    muted: false,
    current: null,
    log: [],
  };
}

type Step = { tent: TentState; timer: TimerState; shown: string | null };

/** Takes the current prompt off screen, recording what happened, and undoes an automatic pause. */
export function closePrompt(tent: TentState, t: TimerState, now: number, outcome: PromptOutcome): Step {
  const c = tent.current;
  if (!c) return { tent, timer: t, shown: null };
  const timerNext = c.autoPaused && timerStatus(t, now) === 'paused' ? resume(t, now) : t;
  return {
    tent: { ...tent, current: null, log: [...tent.log, { promptId: c.promptId, outcome, atActiveMs: c.atActiveMs }] },
    timer: timerNext,
    shown: null,
  };
}

/**
 * Brings the simulation up to date at `now`: fades an expired prompt, then
 * shows the prompt that has just come due. Prompts that came due while muted,
 * while the app wasn't looking, or while another prompt was showing are
 * recorded and dropped, never queued up.
 */
export function advanceTent(tent: TentState, t: TimerState, now: number): Step {
  let step: Step = { tent, timer: t, shown: null };

  if (step.tent.current && now - step.tent.current.shownAt >= PROMPT_RULES.visibleMs) {
    step = closePrompt(step.tent, step.timer, now, 'faded');
  }
  if (timerStatus(step.timer, now) !== 'running') return step;

  const activeMs = activeElapsedMs(step.timer, now);
  let { nextSlot, drawn, log, current } = step.tent;
  const { schedule, promptOrder, muted } = step.tent;
  let timerNext = step.timer;
  let shown: string | null = null;

  while (nextSlot < schedule.length && schedule[nextSlot] <= activeMs) {
    const dueAt = schedule[nextSlot];
    const isLatestDue = nextSlot + 1 >= schedule.length || schedule[nextSlot + 1] > activeMs;
    const promptId = promptOrder[drawn % promptOrder.length];
    drawn += 1;
    nextSlot += 1;
    const canShow = isLatestDue && !muted && current === null && activeMs - dueAt <= PROMPT_RULES.graceMs;
    if (!canShow) {
      log = [...log, { promptId, outcome: muted ? 'muted' : 'missed', atActiveMs: dueAt }];
      continue;
    }
    const autoPaused = step.tent.pauseOnPrompt;
    if (autoPaused) timerNext = pause(timerNext, now);
    current = { promptId, shownAt: now, atActiveMs: activeMs, autoPaused };
    shown = promptId;
  }

  if (nextSlot === step.tent.nextSlot) return step;
  return { tent: { ...step.tent, nextSlot, drawn, log, current }, timer: timerNext, shown };
}

export function setMuted(tent: TentState, t: TimerState, now: number, muted: boolean): Step {
  const step = muted ? closePrompt(tent, t, now, 'muted') : { tent, timer: t, shown: null };
  return { ...step, tent: { ...step.tent, muted } };
}

/** The baker took control of the clock, so a prompt closing shouldn't resume it for them. */
export function releaseAutoPause(tent: TentState): TentState {
  if (!tent.current?.autoPaused) return tent;
  return { ...tent, current: { ...tent.current, autoPaused: false } };
}
