// Pieces shared by the practice timer and the Tent Simulation screens.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Alert, BackHandler, StyleSheet, Text, Vibration, View } from 'react-native';
import { formatClock, spokenDuration } from '../domain/format';
import type { ActiveSession } from '../domain/session';
import type { TimerStatus } from '../domain/timer';
import { crossedMilestone } from '../domain/timer';
import { useAppData } from '../state/AppData';
import { T } from './components';
import { fonts, space, useColors } from './theme';

export const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: 'Not started',
  running: 'Running',
  paused: 'Paused',
  finished: "Time's up",
};

/** Where to send someone returning to a session in progress. */
export function sessionRoute(s: ActiveSession) {
  if (s.endedAt !== null) return '/session/reflect' as const;
  return s.kind === 'tent' ? ('/session/tent' as const) : ('/session/practice' as const);
}

/** Spoken and felt cues, so nothing depends on watching the screen or hearing a sound. */
export function useTimerCues(status: TimerStatus, remaining: number) {
  const prev = useRef<{ status: TimerStatus; remaining: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = { status, remaining };
    if (!before) return;
    if (status === 'finished' && before.status !== 'finished') {
      Vibration.vibrate([0, 500, 250, 500]);
      AccessibilityInfo.announceForAccessibility("Time's up. Stop when it's safe.");
      return;
    }
    if (status === 'running') {
      const milestone = crossedMilestone(before.remaining, remaining);
      if (milestone) AccessibilityInfo.announceForAccessibility(`${spokenDuration(milestone)} left`);
    }
  }, [status, remaining]);
}

export function TimerFace({ remaining, status }: { remaining: number; status: TimerStatus }) {
  const c = useColors();
  const finished = status === 'finished';
  return (
    <View style={styles.timerBox}>
      <Text
        accessibilityRole="timer"
        accessibilityLabel={finished ? "Time's up" : `${spokenDuration(remaining)} left, ${STATUS_LABELS[status]}`}
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.timer, { color: c.text }]}
      >
        {formatClock(remaining)}
      </Text>
      {status === 'paused' ? <T variant="heading">Paused</T> : null}
    </View>
  );
}

/**
 * Leaving a session is always a deliberate choice: Stop asks first, and so
 * does Android's back button, rather than silently abandoning a running timer.
 */
export function useSessionExit(status: TimerStatus) {
  const { end, discard } = useAppData();

  const goToReflection = useCallback(async () => {
    await end();
    router.replace('/session/reflect');
  }, [end]);

  const confirmStop = useCallback(() => {
    Alert.alert('Stop this session?', 'You can still reflect on what you managed, or bin the session entirely.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Stop and reflect', onPress: goToReflection },
      {
        text: 'Discard it',
        style: 'destructive',
        onPress: async () => {
          await discard();
          router.dismissTo('/');
        },
      },
    ]);
  }, [discard, goToReflection]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (status === 'finished') router.dismissTo('/');
        else confirmStop();
        return true;
      });
      return () => sub.remove();
    }, [confirmStop, status]),
  );

  return { goToReflection, confirmStop };
}

export const sessionStyles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
});

const styles = StyleSheet.create({
  timerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm, minHeight: 120 },
  timer: { fontFamily: fonts.bold, fontSize: 96, letterSpacing: -2, fontVariant: ['tabular-nums'], textAlign: 'center', alignSelf: 'stretch' },
});
