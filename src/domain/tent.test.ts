import {
  PROMPT_RULES,
  advanceTent,
  buildSchedule,
  closePrompt,
  createTent,
  releaseAutoPause,
  seededRandom,
  setMuted,
  shuffled,
} from './tent';
import type { TentOptions, TentState } from './tent';
import type { TimerState } from './timer';
import { createTimer, pause, remainingMs, resume, start, timerStatus } from './timer';

const MIN = 60_000;
const T0 = 1_760_000_000_000;
const IDS = ['a', 'b', 'c', 'd', 'e'];
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

describe('seededRandom', () => {
  it('repeats exactly for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('buildSchedule', () => {
  it('is empty when prompts are off', () => {
    expect(buildSchedule(120 * MIN, 'off', 1)).toEqual([]);
  });

  it('is the same for the same seed, so a restored session keeps its prompts', () => {
    expect(buildSchedule(120 * MIN, 'medium', 99)).toEqual(buildSchedule(120 * MIN, 'medium', 99));
  });

  it.each(['low', 'medium'] as const)('keeps %s prompts inside the quiet windows with the right gaps', (freq) => {
    const [minGap, maxGap] = PROMPT_RULES.gapMs[freq];
    for (const seed of SEEDS) {
      const s = buildSchedule(180 * MIN, freq, seed);
      expect(s.length).toBeGreaterThan(0);
      expect(s[0]).toBeGreaterThanOrEqual(PROMPT_RULES.quietStartMs);
      expect(s[0]).toBeLessThanOrEqual(PROMPT_RULES.quietStartMs + minGap);
      expect(s[s.length - 1]).toBeLessThanOrEqual(170 * MIN);
      for (let i = 1; i < s.length; i++) {
        const gap = s[i] - s[i - 1];
        expect(gap).toBeGreaterThanOrEqual(minGap - 1);
        expect(gap).toBeLessThanOrEqual(maxGap + 1);
      }
    }
  });

  it('gives medium roughly twice as many prompts as low over a long bake', () => {
    const count = (f: 'low' | 'medium') =>
      SEEDS.reduce((n, seed) => n + buildSchedule(180 * MIN, f, seed).length, 0) / SEEDS.length;
    expect(count('low')).toBeGreaterThanOrEqual(5);
    expect(count('low')).toBeLessThanOrEqual(7);
    expect(count('medium')).toBeGreaterThanOrEqual(11);
    expect(count('medium')).toBeLessThanOrEqual(14);
  });

  it('still gives a short session one prompt when there is room', () => {
    for (const seed of SEEDS) {
      const s = buildSchedule(20 * MIN, 'low', seed);
      expect(s).toHaveLength(1);
      expect(s[0]).toBeGreaterThanOrEqual(5 * MIN);
      expect(s[0]).toBeLessThanOrEqual(10 * MIN);
    }
  });

  it('gives no prompts when the session is too short for any', () => {
    expect(buildSchedule(15 * MIN, 'medium', 3)).toEqual([]);
  });
});

describe('shuffled', () => {
  it('keeps every item exactly once and is repeatable', () => {
    const s = shuffled(IDS, 5);
    expect([...s].sort()).toEqual(IDS);
    expect(shuffled(IDS, 5)).toEqual(s);
  });
});

// A hand-built simulation with prompts due at 10 and 30 minutes.
function setup(options: Partial<TentOptions> = {}): { tent: TentState; timer: TimerState } {
  const tent: TentState = {
    ...createTent({ frequency: 'medium', pauseOnPrompt: false, vibrate: true, ...options }, 60 * MIN, IDS, 1),
    schedule: [10 * MIN, 30 * MIN],
    promptOrder: IDS,
  };
  return { tent, timer: start(createTimer(60 * MIN), T0) };
}

describe('advanceTent', () => {
  it('does nothing before a prompt is due', () => {
    const { tent, timer } = setup();
    const step = advanceTent(tent, timer, T0 + 9 * MIN);
    expect(step.tent).toBe(tent);
    expect(step.shown).toBeNull();
  });

  it('shows a prompt when it comes due, without touching the timer by default', () => {
    const { tent, timer } = setup();
    const step = advanceTent(tent, timer, T0 + 10 * MIN + 1000);
    expect(step.shown).toBe('a');
    expect(step.tent.current?.promptId).toBe('a');
    expect(step.timer).toBe(timer);
  });

  it('fades a prompt that has been ignored, which counts as a fine outcome', () => {
    const { tent, timer } = setup();
    let step = advanceTent(tent, timer, T0 + 10 * MIN);
    step = advanceTent(step.tent, step.timer, T0 + 10 * MIN + PROMPT_RULES.visibleMs);
    expect(step.tent.current).toBeNull();
    expect(step.tent.log).toEqual([{ promptId: 'a', outcome: 'faded', atActiveMs: 10 * MIN }]);
  });

  it('pauses the timer while a prompt shows if asked to, and resumes when it fades', () => {
    const { tent, timer } = setup({ pauseOnPrompt: true });
    let step = advanceTent(tent, timer, T0 + 10 * MIN);
    expect(timerStatus(step.timer, T0 + 10 * MIN + 30_000)).toBe('paused');
    expect(remainingMs(step.timer, T0 + 10 * MIN + 30_000)).toBe(50 * MIN);

    step = advanceTent(step.tent, step.timer, T0 + 11 * MIN);
    expect(timerStatus(step.timer, T0 + 11 * MIN)).toBe('running');
    expect(remainingMs(step.timer, T0 + 11 * MIN)).toBe(50 * MIN);
  });

  it('resumes after an automatic pause when the baker skips or answers', () => {
    const { tent, timer } = setup({ pauseOnPrompt: true });
    const shown = advanceTent(tent, timer, T0 + 10 * MIN);
    const closed = closePrompt(shown.tent, shown.timer, T0 + 10 * MIN + 5000, 'skipped');
    expect(timerStatus(closed.timer, T0 + 10 * MIN + 5000)).toBe('running');
    expect(closed.tent.log[0].outcome).toBe('skipped');
  });

  it("doesn't resume a clock the baker paused themselves", () => {
    const { tent, timer } = setup();
    const shown = advanceTent(tent, timer, T0 + 10 * MIN);
    const paused = pause(shown.timer, T0 + 10 * MIN + 1000);
    const closed = closePrompt(shown.tent, paused, T0 + 10 * MIN + 2000, 'answered');
    expect(timerStatus(closed.timer, T0 + 10 * MIN + 2000)).toBe('paused');
  });

  it("doesn't resume after the baker took over the clock during an automatic pause", () => {
    const { tent, timer } = setup({ pauseOnPrompt: true });
    const shown = advanceTent(tent, timer, T0 + 10 * MIN);
    // They resume, then pause again for their own reasons.
    const taken = releaseAutoPause(shown.tent);
    const t = pause(resume(shown.timer, T0 + 10 * MIN + 1000), T0 + 10 * MIN + 2000);
    const closed = closePrompt(taken, t, T0 + 10 * MIN + 3000, 'answered');
    expect(timerStatus(closed.timer, T0 + 10 * MIN + 3000)).toBe('paused');
  });

  it('holds prompts back while the timer is paused, because they run on active time', () => {
    const { tent } = setup();
    const t = pause(start(createTimer(60 * MIN), T0), T0 + 5 * MIN);
    expect(advanceTent(tent, t, T0 + 40 * MIN).shown).toBeNull();
    const resumed = resume(t, T0 + 40 * MIN);
    expect(advanceTent(tent, resumed, T0 + 44 * MIN).shown).toBeNull();
    expect(advanceTent(tent, resumed, T0 + 45 * MIN).shown).toBe('a');
  });

  it('skips prompts that came due while the app was away instead of showing them late', () => {
    const { tent, timer } = setup();
    const step = advanceTent(tent, timer, T0 + 35 * MIN);
    expect(step.shown).toBeNull();
    expect(step.tent.log.map((l) => l.outcome)).toEqual(['missed', 'missed']);
    expect(step.tent.nextSlot).toBe(2);
  });

  it('shows only the latest prompt after a short gap, never a backlog', () => {
    const { tent, timer } = setup();
    const step = advanceTent({ ...tent, schedule: [10 * MIN, 10 * MIN + 10_000] }, timer, T0 + 10 * MIN + 15_000);
    expect(step.shown).toBe('b');
    expect(step.tent.log).toEqual([{ promptId: 'a', outcome: 'missed', atActiveMs: 10 * MIN }]);
  });

  it('drops prompts while muted, and closes one already showing when muting', () => {
    const { tent, timer } = setup();
    const shown = advanceTent(tent, timer, T0 + 10 * MIN);
    const muted = setMuted(shown.tent, shown.timer, T0 + 10 * MIN + 1000, true);
    expect(muted.tent.current).toBeNull();
    expect(muted.tent.log[0].outcome).toBe('muted');

    const later = advanceTent(muted.tent, muted.timer, T0 + 30 * MIN);
    expect(later.shown).toBeNull();
    expect(later.tent.log[1]).toEqual({ promptId: 'b', outcome: 'muted', atActiveMs: 30 * MIN });

    const unmuted = setMuted(later.tent, later.timer, T0 + 31 * MIN, false);
    expect(unmuted.tent.muted).toBe(false);
  });

  it('never shows the same prompt twice in a session', () => {
    const { tent, timer } = setup();
    let step = advanceTent(tent, timer, T0 + 10 * MIN);
    step = closePrompt(step.tent, step.timer, T0 + 10 * MIN + 1000, 'answered');
    step = advanceTent(step.tent, step.timer, T0 + 30 * MIN);
    expect(step.shown).toBe('b');
  });

  it('does nothing once time is up', () => {
    const { tent } = setup();
    const t = start(createTimer(20 * MIN), T0);
    expect(advanceTent({ ...tent, schedule: [25 * MIN] }, t, T0 + 30 * MIN).shown).toBeNull();
  });

  it('has no prompts when there is no prompt content', () => {
    expect(createTent({ frequency: 'medium', pauseOnPrompt: false, vibrate: false }, 60 * MIN, [], 1).schedule).toEqual(
      [],
    );
  });

  it('survives a save and reload as plain JSON', () => {
    const { tent, timer } = setup({ pauseOnPrompt: true });
    const shown = advanceTent(tent, timer, T0 + 10 * MIN);
    const restored = JSON.parse(JSON.stringify(shown));
    const faded = advanceTent(restored.tent, restored.timer, T0 + 12 * MIN);
    expect(faded.tent.current).toBeNull();
    expect(timerStatus(faded.timer, T0 + 12 * MIN)).toBe('running');
  });
});
