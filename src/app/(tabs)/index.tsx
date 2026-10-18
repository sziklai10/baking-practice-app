import { router } from 'expo-router';
import { View } from 'react-native';
import { LEVEL_LABELS, challenges, findChallenge } from '../../content/challenges';
import { durationLabel, formatClock } from '../../domain/format';
import { remainingMs, timerStatus } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Button, Card, Notice, Screen, T } from '../../ui/components';
import { space } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

export default function PractiseScreen() {
  const { active, sessions, loadProblem } = useAppData();
  const last = sessions[0];

  return (
    <Screen>
      <T variant="title">Practise</T>

      {loadProblem ? (
        <Notice>Some saved data couldn't be read, so it's been set aside. Everything else is fine.</Notice>
      ) : null}

      {active ? <ActiveSessionCard /> : null}

      {last && !active ? (
        <Card>
          <T variant="heading">Last time</T>
          <T>{last.title}</T>
          {last.improveNext ? <T muted>Next time: {last.improveNext}</T> : null}
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        <T variant="heading">Pick a challenge</T>
        <T muted>Practice ideas written as general advice. They aren't official challenges from any competition.</T>
      </View>

      {challenges.map((c) => (
        <Card
          key={c.id}
          label={`${c.title}. ${LEVEL_LABELS[c.level]}, ${durationLabel(c.durationMinutes)}.`}
          onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}
        >
          <T variant="heading">{c.title}</T>
          <T muted>
            {LEVEL_LABELS[c.level]} · {durationLabel(c.durationMinutes)}
          </T>
          <T>{c.summary}</T>
        </Card>
      ))}
    </Screen>
  );
}

function ActiveSessionCard() {
  const { active } = useAppData();
  const now = useNow(!!active && active.endedAt === null && active.timer.pausedAt === null, 1000);
  if (!active) return null;
  const title = findChallenge(active.challengeId)?.title ?? 'Your session';
  const status = timerStatus(active.timer, now);
  const waitingForReflection = active.endedAt !== null;
  const detail = waitingForReflection
    ? "You haven't reflected on this one yet."
    : status === 'finished'
      ? "Time's up."
      : status === 'paused'
        ? `Paused with ${formatClock(remainingMs(active.timer, now))} left.`
        : `Running, ${formatClock(remainingMs(active.timer, now))} left.`;
  return (
    <Card>
      <T variant="heading">{waitingForReflection ? 'Finish your reflection' : 'Session in progress'}</T>
      <T>{title}</T>
      <T muted>{detail}</T>
      <Button
        label={waitingForReflection ? 'Reflect now' : 'Back to the timer'}
        onPress={() => router.push(waitingForReflection ? '/session/reflect' : '/session/practice')}
      />
    </Card>
  );
}
