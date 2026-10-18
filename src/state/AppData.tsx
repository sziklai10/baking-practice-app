// App-wide data: the progress record and the session in progress. Every
// change is saved straight away, so a session survives the app being closed
// or killed by the system.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Challenge } from '../content/challenges';
import { findChallenge } from '../content/challenges';
import type { ActiveSession, Feeling, SessionRecord } from '../domain/session';
import { newId } from '../domain/session';
import * as timer from '../domain/timer';
import { cancelAlert, cancelAllAlerts, ensureAlertPermission, scheduleTimeUp } from '../notifications/timerAlert';
import {
  deleteAllStoredData,
  loadActiveSession,
  loadSessions,
  saveActiveSession,
  saveSessions,
} from '../storage/storage';

export type Reflection = { wentWell: string; improveNext: string; feeling: Feeling | null };

type AppData = {
  ready: boolean;
  /** True if some saved data couldn't be read and was set aside. */
  loadProblem: boolean;
  sessions: SessionRecord[];
  active: ActiveSession | null;
  startPractice: (challenge: Challenge) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addTime: (ms: number) => Promise<void>;
  /** Stops the clock and moves on to the reflection. */
  end: () => Promise<void>;
  discard: () => Promise<void>;
  saveReflection: (r: Reflection) => Promise<void>;
  deleteAllData: () => Promise<void>;
};

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadProblem, setLoadProblem] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const activeRef = useRef<ActiveSession | null>(null);
  const sessionsRef = useRef<SessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSessions(), loadActiveSession()]).then(([s, a]) => {
      if (cancelled) return;
      sessionsRef.current = s.value;
      activeRef.current = a.value;
      setSessions(s.value);
      setActive(a.value);
      setLoadProblem(s.problem || a.problem);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commitActive = useCallback(async (next: ActiveSession | null) => {
    activeRef.current = next;
    setActive(next);
    await saveActiveSession(next);
  }, []);

  /** Cancels the old alert and, if the timer is running, schedules one for its new end time. */
  const rescheduleAlert = useCallback(async (s: ActiveSession): Promise<ActiveSession> => {
    await cancelAlert(s.alertId);
    const at = s.endedAt === null ? timer.endsAt(s.timer, Date.now()) : null;
    const title = findChallenge(s.challengeId)?.title ?? 'Practice';
    const alertId = at === null ? null : await scheduleTimeUp(at, title);
    return { ...s, alertId };
  }, []);

  // Scheduling is async, so the session may have changed by the time it
  // returns (a quick pause, say). Only keep the alert if nothing has moved on.
  const attachAlert = useCallback(
    async (basis: ActiveSession) => {
      const { alertId } = await rescheduleAlert(basis);
      const latest = activeRef.current;
      const unchanged =
        latest !== null &&
        latest.id === basis.id &&
        latest.timer === basis.timer &&
        latest.endedAt === basis.endedAt;
      if (unchanged) await commitActive({ ...latest, alertId });
      else await cancelAlert(alertId);
    },
    [commitActive, rescheduleAlert],
  );

  const updateTimer = useCallback(
    async (change: (t: timer.TimerState, now: number) => timer.TimerState) => {
      const current = activeRef.current;
      if (!current || current.endedAt !== null) return;
      const next = { ...current, timer: change(current.timer, Date.now()) };
      if (next.timer === current.timer) return;
      // Save the new timer first so the screen updates at once; the alert follows.
      await commitActive(next);
      await attachAlert(next);
    },
    [commitActive, attachAlert],
  );

  const startPractice = useCallback(
    async (challenge: Challenge) => {
      if (activeRef.current) return;
      const session: ActiveSession = {
        id: newId(),
        kind: 'practice',
        challengeId: challenge.id,
        timer: timer.start(timer.createTimer(challenge.durationMinutes * 60_000), Date.now()),
        endedAt: null,
        alertId: null,
      };
      await commitActive(session);
      // Ask for notification permission in context, the first time it matters.
      // Not awaited, so the timer screen opens while the prompt is showing.
      void ensureAlertPermission().then(() => attachAlert(session));
    },
    [commitActive, attachAlert],
  );

  const end = useCallback(async () => {
    const current = activeRef.current;
    if (!current || current.endedAt !== null) return;
    const now = Date.now();
    await cancelAlert(current.alertId);
    const endedAt = timer.finishedAt(current.timer, now) ?? now;
    await commitActive({ ...current, endedAt, alertId: null });
  }, [commitActive]);

  const discard = useCallback(async () => {
    await cancelAlert(activeRef.current?.alertId ?? null);
    await commitActive(null);
  }, [commitActive]);

  const saveReflection = useCallback(
    async (r: Reflection) => {
      const s = activeRef.current;
      if (!s || s.endedAt === null || s.timer.startedAt === null) return;
      const record: SessionRecord = {
        id: s.id,
        kind: s.kind,
        challengeId: s.challengeId,
        title: findChallenge(s.challengeId)?.title ?? 'Practice session',
        startedAt: s.timer.startedAt,
        endedAt: s.endedAt,
        plannedMs: s.timer.durationMs,
        activeMs: timer.activeElapsedMs(s.timer, s.endedAt),
        ranToTime: timer.timerStatus(s.timer, s.endedAt) === 'finished',
        wentWell: r.wentWell.trim(),
        improveNext: r.improveNext.trim(),
        feeling: r.feeling,
      };
      const next = [record, ...sessionsRef.current];
      sessionsRef.current = next;
      setSessions(next);
      await saveSessions(next);
      await commitActive(null);
    },
    [commitActive],
  );

  const deleteAllData = useCallback(async () => {
    await cancelAllAlerts();
    await deleteAllStoredData();
    activeRef.current = null;
    sessionsRef.current = [];
    setActive(null);
    setSessions([]);
    setLoadProblem(false);
  }, []);

  const value = useMemo<AppData>(
    () => ({
      ready,
      loadProblem,
      sessions,
      active,
      startPractice,
      pause: () => updateTimer(timer.pause),
      resume: () => updateTimer(timer.resume),
      addTime: (ms) => updateTimer((t, now) => timer.addTime(t, ms, now)),
      end,
      discard,
      saveReflection,
      deleteAllData,
    }),
    [ready, loadProblem, sessions, active, startPractice, updateTimer, end, discard, saveReflection, deleteAllData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside AppDataProvider');
  return v;
}
