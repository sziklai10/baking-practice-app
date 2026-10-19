import type { PastSession, PlanChallenge, Profile } from './plan';
import { suggest } from './plan';

const c = (id: string, over: Partial<PlanChallenge> = {}): PlanChallenge => ({
  id,
  title: id,
  level: 'beginner',
  durationMinutes: 60,
  skills: [],
  equipment: ['oven'],
  ...over,
});

const profile = (over: Partial<Profile> = {}): Profile => ({
  experience: 'beginner',
  goal: 'improve',
  sessionMinutes: 120,
  equipment: [],
  focus: [],
  ...over,
});

const helpers = { skillLabel: (id: string) => id.toUpperCase(), durationLabel: (m: number) => `${m} min` };
const ids = (s: { challengeId: string; kind: string }[]) => s.map((x) => `${x.kind}:${x.challengeId}`);
const done = (challengeId: string, endedAt: number, kind: 'practice' | 'tent' = 'practice'): PastSession => ({
  kind,
  challengeId,
  endedAt,
});

describe('suggest', () => {
  it('leaves out challenges two levels above the baker', () => {
    const out = suggest(profile(), [c('easy'), c('mid', { level: 'intermediate' }), c('hard', { level: 'confident' })], [], helpers);
    expect(ids(out)).toEqual(['practice:easy', 'practice:mid']);
  });

  it('prefers the baker’s own level, then a step up', () => {
    const out = suggest(
      profile({ experience: 'intermediate' }),
      [c('easy'), c('mid', { level: 'intermediate' }), c('hard', { level: 'confident' })],
      [],
      helpers,
    );
    expect(out[0].challengeId).toBe('mid');
  });

  it('leaves out challenges longer than the time they have', () => {
    const out = suggest(profile({ sessionMinutes: 60 }), [c('short'), c('long', { durationMinutes: 90 })], [], helpers);
    expect(ids(out)).toEqual(['practice:short']);
  });

  it('ranks challenges that match their focus higher', () => {
    const out = suggest(
      profile({ focus: ['pastry'] }),
      [c('plain', { durationMinutes: 30 }), c('pastry', { skills: ['pastry'] })],
      [],
      helpers,
    );
    expect(out[0].challengeId).toBe('pastry');
    expect(out[0].reason).toBe('Works on pastry, suits where you are now, and fits in 60 min.');
  });

  it('breaks ties with the shortest bake', () => {
    const out = suggest(profile(), [c('long', { durationMinutes: 90 }), c('short', { durationMinutes: 45 })], [], helpers);
    expect(out[0].challengeId).toBe('short');
  });

  it('moves recently done challenges down for variety', () => {
    const out = suggest(profile(), [c('a', { durationMinutes: 30 }), c('b')], [done('a', 1)], helpers);
    expect(ids(out)).toEqual(['practice:b', 'practice:a']);
  });

  it('only counts the last three sessions as recent', () => {
    const history = [done('a', 1), done('x', 2), done('y', 3), done('z', 4)];
    const out = suggest(profile(), [c('a', { durationMinutes: 30 }), c('b')], history, helpers);
    // a was done four sessions ago, so it isn't recent, but it has been tried.
    expect(out[0].challengeId).toBe('b');
    expect(out[1].challengeId).toBe('a');
    expect(out[1].reason).not.toContain("haven't tried");
  });

  it('mentions when they have not tried a challenge yet', () => {
    const [first] = suggest(profile(), [c('a')], [], helpers);
    expect(first.reason).toBe("Suits where you are now, you haven't tried it yet, and fits in 60 min.");
  });

  it('hides challenges that need equipment they lack, while others fit', () => {
    const out = suggest(profile(), [c('tin', { equipment: ['oven', 'tart-tin'] }), c('plain')], [], helpers);
    expect(ids(out)).toEqual(['practice:plain']);
  });

  it('falls back to challenges needing equipment, and says what is missing', () => {
    const out = suggest(profile({ equipment: ['scales'] }), [c('tin', { equipment: ['oven', 'scales', 'tart-tin'] })], [], helpers);
    expect(out[0].missing).toEqual(['tart-tin']);
  });

  it('suggests a Tent Simulation first for someone heading for a TV competition', () => {
    const out = suggest(profile({ goal: 'tv' }), [c('a')], [], helpers);
    expect(ids(out)).toEqual(['tent:a', 'practice:a']);
    expect(out[0].reason).toContain('surprise interview questions');
  });

  it('suggests a Tent Simulation to someone who wants to practise talking', () => {
    const out = suggest(profile({ focus: ['talking'] }), [c('a')], [], helpers);
    expect(out[0].kind).toBe('tent');
    expect(out[0].reason).toMatch(/^You want to get better at talking/);
  });

  it('skips the Tent Simulation suggestion after a recent one', () => {
    const out = suggest(profile({ goal: 'tv' }), [c('a'), c('b')], [done('b', 1, 'tent')], helpers);
    expect(out[0].kind).toBe('practice');
  });

  it('returns nothing when nothing fits', () => {
    expect(suggest(profile({ sessionMinutes: 30, goal: 'tv' }), [c('a')], [], helpers)).toEqual([]);
  });
});
