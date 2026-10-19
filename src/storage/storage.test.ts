import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession, SessionRecord } from '../domain/session';
import { createTimer } from '../domain/timer';
import {
  DEFAULT_TENT_SETTINGS,
  KEYS,
  loadTentSettings,
  loadProfile,
  saveProfile,
  saveTentSettings,
  deleteAllStoredData,
  loadActiveSession,
  loadSessions,
  saveActiveSession,
  saveSessions,
} from './storage';

const record: SessionRecord = {
  id: 's1',
  kind: 'practice',
  challengeId: 'even-shortbread',
  title: 'Shortbread',
  startedAt: 1,
  endedAt: 2,
  plannedMs: 60_000,
  activeMs: 60_000,
  ranToTime: true,
  wentWell: 'Even colour',
  improveNext: 'Thinner',
  feeling: 'calm',
};

const active: ActiveSession = {
  id: 'a1',
  kind: 'practice',
  challengeId: 'even-shortbread',
  timer: createTimer(60_000),
  endedAt: null,
  alertId: null,
};

beforeEach(() => AsyncStorage.clear());

describe('storage', () => {
  it('starts empty without reporting a problem', async () => {
    expect(await loadSessions()).toEqual({ value: [], problem: false });
    expect(await loadActiveSession()).toEqual({ value: null, problem: false });
  });

  it('round-trips sessions and the active session', async () => {
    await saveSessions([record]);
    await saveActiveSession(active);
    expect((await loadSessions()).value).toEqual([record]);
    expect((await loadActiveSession()).value).toEqual(active);
  });

  it('clears the active session when saved as null', async () => {
    await saveActiveSession(active);
    await saveActiveSession(null);
    expect(await AsyncStorage.getItem(KEYS.activeSession)).toBeNull();
  });

  it('reports a problem and falls back for corrupted data', async () => {
    await AsyncStorage.setItem(KEYS.sessions, '{not json');
    expect(await loadSessions()).toEqual({ value: [], problem: true });
  });

  it('reports a problem for data from a newer version instead of misreading it', async () => {
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify({ schemaVersion: 99, data: [record] }));
    expect(await loadSessions()).toEqual({ value: [], problem: true });
  });

  it('rejects data with the wrong shape', async () => {
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify({ schemaVersion: 1, data: [{ id: 3 }] }));
    expect((await loadSessions()).problem).toBe(true);
  });

  it('round-trips Tent Simulation settings and falls back to defaults', async () => {
    expect(await loadTentSettings()).toEqual({ value: DEFAULT_TENT_SETTINGS, problem: false });
    const custom = { durationMinutes: 45, frequency: 'medium' as const, pauseOnPrompt: true, vibrate: false };
    await saveTentSettings(custom);
    expect((await loadTentSettings()).value).toEqual(custom);
  });

  it('accepts a session with no challenge, as a Tent Simulation can have', async () => {
    await saveSessions([{ ...record, kind: 'tent', challengeId: null }]);
    expect((await loadSessions()).problem).toBe(false);
  });

  it('deletes all of its own data and leaves other keys alone', async () => {
    await saveSessions([record]);
    await saveActiveSession(active);
    await AsyncStorage.setItem('app.somethingOld', 'x');
    await AsyncStorage.setItem('other-library', 'keep');
    await deleteAllStoredData();
    expect(await AsyncStorage.getAllKeys()).toEqual(['other-library']);
  });

  it('round-trips the profile and rejects a malformed one', async () => {
    expect(await loadProfile()).toEqual({ value: null, problem: false });
    const state = {
      status: 'set' as const,
      updatedAt: 5,
      profile: { experience: 'beginner' as const, goal: 'tv' as const, sessionMinutes: 60, equipment: ['scales'], focus: [] },
    };
    await saveProfile(state);
    expect((await loadProfile()).value).toEqual(state);
    await saveProfile({ status: 'skipped' });
    expect((await loadProfile()).value).toEqual({ status: 'skipped' });
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify({ schemaVersion: 1, data: { status: 'set', profile: {} } }));
    expect(await loadProfile()).toEqual({ value: null, problem: true });
  });
});
