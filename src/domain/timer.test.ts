import {
  activeElapsedMs,
  addTime,
  createTimer,
  crossedMilestone,
  endsAt,
  finishedAt,
  pause,
  remainingMs,
  resume,
  start,
  timerStatus,
} from './timer';

const MIN = 60_000;
const T0 = 1_760_000_000_000; // an arbitrary wall-clock start

describe('timer', () => {
  it('is idle until started and shows the full duration', () => {
    const t = createTimer(60 * MIN);
    expect(timerStatus(t, T0)).toBe('idle');
    expect(remainingMs(t, T0)).toBe(60 * MIN);
    expect(endsAt(t, T0)).toBeNull();
  });

  it('rejects zero, negative and non-numeric durations', () => {
    expect(() => createTimer(0)).toThrow();
    expect(() => createTimer(-5)).toThrow();
    expect(() => createTimer(NaN)).toThrow();
  });

  it('counts down from timestamps alone', () => {
    const t = start(createTimer(60 * MIN), T0);
    expect(remainingMs(t, T0 + 15 * MIN)).toBe(45 * MIN);
    expect(timerStatus(t, T0 + 15 * MIN)).toBe('running');
    expect(endsAt(t, T0)).toBe(T0 + 60 * MIN);
  });

  it('stays accurate across a long gap with no ticks, as when the screen is locked', () => {
    const t = start(createTimer(90 * MIN), T0);
    // Nothing happens for 47 minutes and 13 seconds, then the app wakes.
    expect(remainingMs(t, T0 + 47 * MIN + 13_000)).toBe(42 * MIN + 47_000);
  });

  it('finishes when time runs out and never goes negative', () => {
    const t = start(createTimer(10 * MIN), T0);
    expect(timerStatus(t, T0 + 10 * MIN)).toBe('finished');
    expect(remainingMs(t, T0 + 25 * MIN)).toBe(0);
    expect(activeElapsedMs(t, T0 + 25 * MIN)).toBe(10 * MIN);
    expect(finishedAt(t, T0 + 25 * MIN)).toBe(T0 + 10 * MIN);
    expect(endsAt(t, T0 + 25 * MIN)).toBeNull();
  });

  it('starting twice keeps the original start time', () => {
    const t = start(createTimer(MIN), T0);
    expect(start(t, T0 + 5000)).toBe(t);
  });

  it('freezes while paused and excludes the pause after resuming', () => {
    let t = start(createTimer(60 * MIN), T0);
    t = pause(t, T0 + 10 * MIN);
    expect(timerStatus(t, T0 + 30 * MIN)).toBe('paused');
    expect(remainingMs(t, T0 + 30 * MIN)).toBe(50 * MIN);
    expect(endsAt(t, T0 + 30 * MIN)).toBeNull();

    t = resume(t, T0 + 30 * MIN);
    expect(remainingMs(t, T0 + 40 * MIN)).toBe(40 * MIN);
    expect(endsAt(t, T0 + 40 * MIN)).toBe(T0 + 80 * MIN);
  });

  it('adds up several pauses', () => {
    let t = start(createTimer(30 * MIN), T0);
    t = pause(t, T0 + 5 * MIN);
    t = resume(t, T0 + 7 * MIN);
    t = pause(t, T0 + 10 * MIN);
    t = resume(t, T0 + 13 * MIN);
    expect(t.pausedTotalMs).toBe(5 * MIN);
    expect(remainingMs(t, T0 + 20 * MIN)).toBe(15 * MIN);
    expect(finishedAt(t, T0 + 40 * MIN)).toBe(T0 + 35 * MIN);
  });

  it('ignores pause and resume when they make no sense', () => {
    const idle = createTimer(MIN);
    expect(pause(idle, T0)).toBe(idle);
    expect(resume(idle, T0)).toBe(idle);

    const running = start(createTimer(MIN), T0);
    expect(resume(running, T0 + 1000)).toBe(running);

    const paused = pause(running, T0 + 1000);
    expect(pause(paused, T0 + 2000)).toBe(paused);

    expect(pause(running, T0 + 2 * MIN)).toBe(running); // already finished
  });

  it('adds time while running or paused, but not once finished', () => {
    let t = start(createTimer(20 * MIN), T0);
    t = addTime(t, 5 * MIN, T0 + 10 * MIN);
    expect(remainingMs(t, T0 + 10 * MIN)).toBe(15 * MIN);

    t = pause(t, T0 + 12 * MIN);
    t = addTime(t, 5 * MIN, T0 + 13 * MIN);
    expect(remainingMs(t, T0 + 13 * MIN)).toBe(18 * MIN);

    const done = start(createTimer(MIN), T0);
    expect(addTime(done, 5 * MIN, T0 + 2 * MIN)).toBe(done);
    expect(addTime(t, -MIN, T0)).toBe(t);
  });

  it('survives a save and reload as plain JSON', () => {
    let t = start(createTimer(45 * MIN), T0);
    t = pause(t, T0 + 5 * MIN);
    const restored = JSON.parse(JSON.stringify(t));
    expect(remainingMs(restored, T0 + 60 * MIN)).toBe(40 * MIN);
    expect(timerStatus(restored, T0 + 60 * MIN)).toBe('paused');
  });
});

describe('crossedMilestone', () => {
  it('reports a milestone once when it is passed', () => {
    expect(crossedMilestone(10 * MIN + 500, 10 * MIN - 500)).toBe(10 * MIN);
    expect(crossedMilestone(10 * MIN - 500, 10 * MIN - 1500)).toBeNull();
  });

  it('reports only the smallest milestone after a long gap', () => {
    expect(crossedMilestone(40 * MIN, 3 * MIN)).toBe(5 * MIN);
  });

  it('reports nothing between milestones', () => {
    expect(crossedMilestone(20 * MIN, 15 * MIN)).toBeNull();
  });
});
