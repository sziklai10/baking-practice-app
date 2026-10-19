import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findChallenge } from '../../content/challenges';
import { remainingMs, timerStatus } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Button, Notice, T } from '../../ui/components';
import { STATUS_LABELS, TimerFace, sessionStyles, useSessionExit, useTimerCues } from '../../ui/session';
import { ColorsOverride, sessionColors, space, useColors } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

export default function PracticeSessionScreen() {
  return (
    <ColorsOverride value={sessionColors}>
      <StatusBar style="light" />
      <PracticeSession />
    </ColorsOverride>
  );
}

function PracticeSession() {
  useKeepAwake();
  const c = useColors();
  const { active, pause, resume, addTime } = useAppData();
  const ticking = !!active && active.endedAt === null && active.timer.pausedAt === null;
  const now = useNow(ticking);

  const status = active ? timerStatus(active.timer, now) : 'idle';
  const remaining = active ? remainingMs(active.timer, now) : 0;
  const challenge = findChallenge(active?.challengeId);
  useTimerCues(status, remaining);
  const { goToReflection, confirmStop } = useSessionExit(status);

  if (!active || active.endedAt !== null) {
    return (
      <SafeAreaView style={[sessionStyles.fill, { backgroundColor: c.background, padding: space.md, gap: space.lg }]}>
        <T variant="title">No timer running</T>
        <Button label="Back to challenges" variant="secondary" onPress={() => router.dismissTo('/')} />
      </SafeAreaView>
    );
  }

  const finished = status === 'finished';

  return (
    <SafeAreaView style={[sessionStyles.fill, { backgroundColor: c.background }]}>
      <View style={[sessionStyles.fill, { padding: space.md, gap: space.md }]}>
        <View style={{ gap: space.xs }}>
          <T variant="heading">{challenge?.title ?? 'Practice'}</T>
          <T muted>{STATUS_LABELS[status]}</T>
        </View>

        <TimerFace remaining={remaining} status={status} />

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
              <View style={sessionStyles.row}>
                <Button
                  label="+5 min"
                  variant="secondary"
                  hint="Adds five minutes"
                  onPress={() => addTime(5 * 60_000)}
                  style={sessionStyles.fill}
                />
                <Button label="Stop" variant="secondary" hint="Asks before stopping" onPress={confirmStop} style={sessionStyles.fill} />
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
