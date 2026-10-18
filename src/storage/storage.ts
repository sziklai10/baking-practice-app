// Everything the app saves lives on the device, under keys starting with
// KEY_PREFIX. Each value is wrapped with a schema version so later builds
// can migrate old data instead of losing it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession, SessionRecord } from '../domain/session';

export const KEY_PREFIX = 'app.';
export const KEYS = {
  sessions: `${KEY_PREFIX}sessions`,
  activeSession: `${KEY_PREFIX}activeSession`,
} as const;

export const SCHEMA_VERSION = 1;

type Envelope = { schemaVersion: number; data: unknown };

// Migrations from version N to N + 1, per key. Empty until the shape changes.
const migrations: Record<string, Record<number, (data: unknown) => unknown>> = {};

export type Loaded<T> = { value: T; problem: boolean };

async function read<T>(
  key: string,
  fallback: T,
  isValid: (data: unknown) => data is T,
): Promise<Loaded<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return { value: fallback, problem: true };
  }
  if (raw === null) return { value: fallback, problem: false };
  try {
    const env = JSON.parse(raw) as Envelope;
    let { schemaVersion: version, data } = env;
    if (typeof version !== 'number' || version > SCHEMA_VERSION) {
      return { value: fallback, problem: true };
    }
    while (version < SCHEMA_VERSION) {
      const step = migrations[key]?.[version];
      if (!step) return { value: fallback, problem: true };
      data = step(data);
      version += 1;
    }
    return isValid(data) ? { value: data, problem: false } : { value: fallback, problem: true };
  } catch {
    return { value: fallback, problem: true };
  }
}

async function write(key: string, data: unknown): Promise<void> {
  const env: Envelope = { schemaVersion: SCHEMA_VERSION, data };
  await AsyncStorage.setItem(key, JSON.stringify(env));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isSessionRecord(v: unknown): v is SessionRecord {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.challengeId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.startedAt === 'number' &&
    typeof v.endedAt === 'number'
  );
}

function isSessionList(v: unknown): v is SessionRecord[] {
  return Array.isArray(v) && v.every(isSessionRecord);
}

function isActiveSession(v: unknown): v is ActiveSession | null {
  if (v === null) return true;
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.challengeId === 'string' &&
    isObject(v.timer) &&
    typeof v.timer.durationMs === 'number' &&
    typeof v.timer.pausedTotalMs === 'number'
  );
}

export const loadSessions = () => read(KEYS.sessions, [] as SessionRecord[], isSessionList);
export const saveSessions = (sessions: SessionRecord[]) => write(KEYS.sessions, sessions);

export const loadActiveSession = () => read(KEYS.activeSession, null, isActiveSession);
export async function saveActiveSession(session: ActiveSession | null): Promise<void> {
  if (session === null) await AsyncStorage.removeItem(KEYS.activeSession);
  else await write(KEYS.activeSession, session);
}

/** Removes every key this app owns, including ones from older versions. */
export async function deleteAllStoredData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(KEY_PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}
