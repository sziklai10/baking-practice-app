import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession, SessionRecord } from '../domain/session';
import { createTimer } from '../domain/timer';
import {
  KEYS,
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

  it('deletes all of its own data and leaves other keys alone', async () => {
    await saveSessions([record]);
    await saveActiveSession(active);
    await AsyncStorage.setItem('app.somethingOld', 'x');
    await AsyncStorage.setItem('other-library', 'keep');
    await deleteAllStoredData();
    expect(await AsyncStorage.getAllKeys()).toEqual(['other-library']);
  });
});
