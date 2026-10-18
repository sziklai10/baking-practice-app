import { durationLabel, formatClock, spokenDuration } from './format';

describe('formatClock', () => {
  it('shows minutes and seconds under an hour', () => {
    expect(formatClock(4 * 60_000 + 59_000)).toBe('4:59');
  });
  it('shows hours when needed', () => {
    expect(formatClock(3_909_000)).toBe('1:05:09');
  });
  it('rounds up so it only reads 0:00 at the very end', () => {
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-500)).toBe('0:00');
  });
});

describe('spokenDuration', () => {
  it('reads hours and minutes', () => {
    expect(spokenDuration(65 * 60_000)).toBe('1 hour 5 minutes');
    expect(spokenDuration(120 * 60_000)).toBe('2 hours');
    expect(spokenDuration(60_000)).toBe('1 minute');
  });
  it('rounds part minutes up', () => {
    expect(spokenDuration(4 * 60_000 + 1000)).toBe('5 minutes');
  });
  it('counts seconds in the last minute', () => {
    expect(spokenDuration(42_000)).toBe('42 seconds');
    expect(spokenDuration(1000)).toBe('1 second');
  });
});

describe('durationLabel', () => {
  it('formats minutes', () => {
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(60)).toBe('1 hr');
    expect(durationLabel(90)).toBe('1 hr 30 min');
  });
});
