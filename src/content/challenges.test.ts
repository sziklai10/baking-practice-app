import { challenges, validateChallenges } from './challenges';

const equipment = new Set(['oven']);
const valid = {
  id: 'a',
  title: 'T',
  summary: 'S',
  level: 'beginner',
  durationMinutes: 30,
  skills: ['x'],
  equipment: ['oven'],
  goal: 'G',
  prepNotes: ['p'],
  safetyNotes: [],
  reflectionHints: [],
};

describe('challenge content', () => {
  it('ships content that passes validation', () => {
    expect(challenges.length).toBeGreaterThan(0);
  });

  it('accepts a valid challenge', () => {
    expect(validateChallenges({ challenges: [valid] }, equipment)).toHaveLength(1);
  });

  it.each([
    ['missing list', {}],
    ['empty title', { challenges: [{ ...valid, title: ' ' }] }],
    ['bad level', { challenges: [{ ...valid, level: 'expert' }] }],
    ['fractional duration', { challenges: [{ ...valid, durationMinutes: 12.5 }] }],
    ['unknown equipment', { challenges: [{ ...valid, equipment: ['blowtorch'] }] }],
    ['duplicate id', { challenges: [valid, valid] }],
    ['unknown skill', { challenges: [{ ...valid, skills: ['juggling'] }] }],
  ])('rejects %s', (_label, raw) => {
    expect(() => validateChallenges(raw, equipment, new Set(['x']))).toThrow();
  });
});
