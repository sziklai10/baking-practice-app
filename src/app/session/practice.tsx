import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Alert, BackHandler, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findChallenge } from '../../content/challenges';
import { formatClock, spokenDuration } from '../../domain/format';
import type { TimerStatus } from '../../domain/timer';
import { crossedMilestone, remainingMs, timerStatus } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Button, Notice, T } from '../../ui/components';
import { space, useColors } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: 'Not started',
  running: 'Running',
  paused: 'Paused',
  finished: "Time's up",
};

export default function PracticeSessionScreen() {
  useKeepAwake();
  const c = useColors();
  const { active, pause, resume, addTime, end, discard } = useAppData();
  const ticking = !!active && active.endedAt === null && active.timer.pausedAt === null;
  const now = useNow(ticking);

  const status = active ? timerStatus(active.timer, now) : 'idle';
  const remaining = active ? remainingMs(active.timer, now) : 0;
  const challenge = findChallenge(active?.challengeId);

  // Spoken and felt cues, so nothing depends on watching the screen or hearing a sound.
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

  // Android's back button asks first, rather than silently leaving a running timer.
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

  if (!active || active.endedAt !== null) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: c.background, padding: space.md, gap: space.lg }]}>
        <T variant="title">No timer running</T>
        <Button label="Back to challenges" variant="secondary" onPress={() => router.dismissTo('/')} />
      </SafeAreaView>
    );
  }

  const finished = status === 'finished';

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={[styles.fill, { padding: space.md, gap: space.md }]}>
        <View style={{ gap: space.xs }}>
          <T variant="heading">{challenge?.title ?? 'Practice'}</T>
          <T muted>{STATUS_LABELS[status]}</T>
        </View>

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

        {finished ? (
          <Notice>Time's up. Stop when it's safe to, then come back and tell us how it went.</Notice>
        ) : challenge ? (
          <T muted numberOfLines={4}>
            Goal: {challenge.goal}
          </T>
        ) : null}

        <View style={{ gap: space.sm }}>
          {finished ? (
            <Button label="Reflect now" onPress={goToReflection} />
          ) : (
            <>
              <Button
                label={status === 'paused' ? 'Resume' : 'Pause'}
                hint={status === 'paused' ? 'Starts the countdown again' : 'Stops the countdown until you resume'}
                onPress={status === 'paused' ? resume : pause}
              />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label="+5 min" variant="secondary" hint="Adds five minutes" onPress={() => addTime(5 * 60_000)} style={styles.fill} />
                <Button label="Stop" variant="secondary" hint="Asks before stopping" onPress={confirmStop} style={styles.fill} />
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  timerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm },
  timer: { fontSize: 96, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', alignSelf: 'stretch' },
});
