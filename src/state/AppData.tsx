// App-wide data: the progress record and the session in progress. Every
// change is saved straight away, so a session survives the app being closed
// or killed by the system.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Challenge } from '../content/challenges';
import { sessionTitle } from '../content/challenges';
import { promptText, prompts } from '../content/prompts';
import type { ActiveSession, Feeling, SessionRecord } from '../domain/session';
import { newId, newSeed } from '../domain/session';
import * as tent from '../domain/tent';
import * as timer from '../domain/timer';
import { cancelAlert, cancelAllAlerts, ensureAlertPermission, scheduleTimeUp } from '../notifications/timerAlert';
import {
  deleteAllStoredData,
  DEFAULT_TENT_SETTINGS,
  loadActiveSession,
  loadSessions,
  loadTentSettings,
  saveActiveSession,
  saveSessions,
  saveTentSettings,
} from '../storage/storage';
import type { TentSettings } from '../storage/storage';

export type Reflection = { wentWell: string; improveNext: string; feeling: Feeling | null; promptNotes?: string };

export type TentSetup = TentSettings & { challengeId: string | null };

type AppData = {
  ready: boolean;
  /** True if some saved data couldn't be read and was set aside. */
  loadProblem: boolean;
  sessions: SessionRecord[];
  active: ActiveSession | null;
  /** The Tent Simulation setup used last time. */
  tentSettings: TentSettings;
  startPractice: (challenge: Challenge) => Promise<void>;
  startTent: (setup: TentSetup) => Promise<void>;
  /** Brings prompts up to date; returns the prompt that has just appeared, if any. */
  syncTent: () => Promise<string | null>;
  closePrompt: (outcome: 'answered' | 'skipped') => Promise<void>;
  setPromptsMuted: (muted: boolean) => Promise<void>;
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
  const [tentSettings, setTentSettings] = useState<TentSettings>(DEFAULT_TENT_SETTINGS);
  const activeRef = useRef<ActiveSession | null>(null);
  const sessionsRef = useRef<SessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSessions(), loadActiveSession(), loadTentSettings()]).then(([s, a, t]) => {
      if (cancelled) return;
      sessionsRef.current = s.value;
      activeRef.current = a.value;
      setSessions(s.value);
      setActive(a.value);
      setTentSettings(t.value);
      setLoadProblem(s.problem || a.problem || t.problem);
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
    const title = sessionTitle(s.kind, s.challengeId, s.timer.durationMs);
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

  /** Applies a change to the running session, saves it, and moves the alert if the clock changed. */
  const updateSession = useCallback(
    async (change: (s: ActiveSession, now: number) => ActiveSession): Promise<ActiveSession | null> => {
      const current = activeRef.current;
      if (!current || current.endedAt !== null) return null;
      const next = change(current, Date.now());
      if (next === current) return null;
      // Save first so the screen updates at once; the alert follows.
      await commitActive(next);
      if (next.timer !== current.timer) await attachAlert(next);
      return next;
    },
    [commitActive, attachAlert],
  );

  const updateTimer = useCallback(
    (change: (t: timer.TimerState, now: number) => timer.TimerState) =>
      updateSession((s, now) => {
        const t = change(s.timer, now);
        return t === s.timer ? s : { ...s, timer: t };
      }),
    [updateSession],
  );

  const resumeTimer = useCallback(
    () =>
      updateSession((s, now) => {
        const t = timer.resume(s.timer, now);
        if (t === s.timer) return s;
        // Resuming by hand during a prompt's automatic pause hands the clock back to the baker.
        return { ...s, timer: t, tent: s.tent ? tent.releaseAutoPause(s.tent) : undefined };
      }),
    [updateSession],
  );

  const applyTentStep = useCallback(
    (step: (t: tent.TentState, tm: timer.TimerState, now: number) => { tent: tent.TentState; timer: timer.TimerState; shown: string | null }) => {
      let shown: string | null = null;
      return updateSession((s, now) => {
        if (!s.tent) return s;
        const r = step(s.tent, s.timer, now);
        if (r.tent === s.tent && r.timer === s.timer) return s;
        shown = r.shown;
        return { ...s, tent: r.tent, timer: r.timer };
      }).then(() => shown);
    },
    [updateSession],
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

  const startTent = useCallback(
    async (setup: TentSetup) => {
      if (activeRef.current) return;
      const { challengeId, ...settings } = setup;
      setTentSettings(settings);
      await saveTentSettings(settings);
      const durationMs = setup.durationMinutes * 60_000;
      const session: ActiveSession = {
        id: newId(),
        kind: 'tent',
        challengeId,
        timer: timer.start(timer.createTimer(durationMs), Date.now()),
        tent: tent.createTent(
          { frequency: setup.frequency, pauseOnPrompt: setup.pauseOnPrompt, vibrate: setup.vibrate },
          durationMs,
          prompts.map((p) => p.id),
          newSeed(),
        ),
        endedAt: null,
        alertId: null,
      };
      await commitActive(session);
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
    // A prompt still on screen when the session ends just counts as let pass.
    const t = current.tent ? tent.closePrompt(current.tent, current.timer, endedAt, 'faded').tent : undefined;
    await commitActive({ ...current, tent: t, endedAt, alertId: null });
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
        title: sessionTitle(s.kind, s.challengeId, s.timer.durationMs),
        startedAt: s.timer.startedAt,
        endedAt: s.endedAt,
        plannedMs: s.timer.durationMs,
        activeMs: timer.activeElapsedMs(s.timer, s.endedAt),
        ranToTime: timer.timerStatus(s.timer, s.endedAt) === 'finished',
        wentWell: r.wentWell.trim(),
        improveNext: r.improveNext.trim(),
        feeling: r.feeling,
        ...(s.tent
          ? {
              prompts: s.tent.log.map((l) => ({ promptId: l.promptId, text: promptText(l.promptId), outcome: l.outcome })),
              promptNotes: (r.promptNotes ?? '').trim(),
            }
          : {}),
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
    setTentSettings(DEFAULT_TENT_SETTINGS);
    setLoadProblem(false);
  }, []);

  const value = useMemo<AppData>(
    () => ({
      ready,
      loadProblem,
      sessions,
      active,
      tentSettings,
      startPractice,
      startTent,
      syncTent: () => applyTentStep(tent.advanceTent),
      closePrompt: (outcome) => applyTentStep((tn, tm, now) => tent.closePrompt(tn, tm, now, outcome)).then(() => {}),
      setPromptsMuted: (muted) => applyTentStep((tn, tm, now) => tent.setMuted(tn, tm, now, muted)).then(() => {}),
      pause: () => updateTimer(timer.pause).then(() => {}),
      resume: () => resumeTimer().then(() => {}),
      addTime: (ms) => updateTimer((t, now) => timer.addTime(t, ms, now)).then(() => {}),
      end,
      discard,
      saveReflection,
      deleteAllData,
    }),
    [
      ready,
      loadProblem,
      sessions,
      active,
      tentSettings,
      startPractice,
      startTent,
      applyTentStep,
      updateTimer,
      resumeTimer,
      end,
      discard,
      saveReflection,
      deleteAllData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside AppDataProvider');
  return v;
}
