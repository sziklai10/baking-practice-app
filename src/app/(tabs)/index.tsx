import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { LEVEL_LABELS, challenges, equipmentLabels, findChallenge, sessionTitle, skillLabels } from '../../content/challenges';
import { durationLabel, formatClock } from '../../domain/format';
import type { Profile, Suggestion } from '../../domain/plan';
import { suggest } from '../../domain/plan';
import { remainingMs, timerStatus } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Button, Card, Notice, Screen, Section, T } from '../../ui/components';
import { sessionRoute } from '../../ui/session';
import { space } from '../../ui/theme';
import { useNow } from '../../ui/useNow';

export default function PractiseScreen() {
  const { active, sessions, loadProblem, profile } = useAppData();
  const last = sessions[0];

  // First visit: say hello and offer the plan questions before anything else.
  if (profile === null) return <Redirect href="/welcome" />;

  return (
    <Screen>
      <T variant="title">Practise</T>

      {loadProblem ? (
        <Notice>Some saved data couldn't be read, so it's been set aside. Everything else is fine.</Notice>
      ) : null}

      {active ? <ActiveSessionCard /> : null}

      {!active && profile.status === 'set' ? <PlanCard profile={profile.profile} /> : null}

      {!active && profile.status === 'skipped' ? (
        <Card>
          <T variant="heading">Not sure where to start?</T>
          <T>Answer five quick questions and we'll suggest what to practise next.</T>
          <Button label="Get a plan" variant="secondary" onPress={() => router.push('/onboarding')} />
        </Card>
      ) : null}

      {last && !active ? (
        <Card>
          <T variant="heading">Last time</T>
          <T>{last.title}</T>
          {last.improveNext ? <T muted>Next time: {last.improveNext}</T> : null}
        </Card>
      ) : null}

      {!active ? (
        <Card>
          <T variant="heading">Tent Simulation</T>
          <T>A timed bake with surprise interview questions, so you can practise talking while you work.</T>
          <Button label="Set one up" onPress={() => router.push('/session/tent-setup')} />
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
          <T variant="eyebrow">
            {LEVEL_LABELS[c.level]} · {durationLabel(c.durationMinutes)}
          </T>
          <T variant="heading">{c.title}</T>
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
  const title = sessionTitle(active.kind, active.challengeId, active.timer.durationMs);
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
        onPress={() => router.push(sessionRoute(active))}
      />
    </Card>
  );
}

const SKILL_LABEL = (id: string) => skillLabels[id] ?? id;

function PlanCard({ profile }: { profile: Profile }) {
  const { sessions } = useAppData();
  const suggestions = useMemo(
    () => suggest(profile, challenges, sessions, { skillLabel: SKILL_LABEL, durationLabel }),
    [profile, sessions],
  );
  const [top] = suggestions;

  if (!top) {
    return (
      <Card>
        <T variant="heading">Your next practice</T>
        <T>Nothing here fits your answers yet. Giving yourself a bit more time per practice opens up more bakes.</T>
        <Button label="Change my answers" variant="secondary" onPress={() => router.push('/onboarding')} />
      </Card>
    );
  }

  const others = suggestions.filter((s) => s.challengeId !== top.challengeId).slice(0, 2);
  return (
    <Section title="Your next practice" tag="General advice">
      <Card hero>
        <T variant="eyebrow">Next up · {durationLabel(findChallenge(top.challengeId)?.durationMinutes ?? 0)}</T>
        <T variant="heading">{suggestionTitle(top)}</T>
        <T>{top.reason}</T>
        {top.missing.length ? (
          <T muted>You'd need: {top.missing.map((e) => equipmentLabels[e] ?? e).join(', ')}.</T>
        ) : null}
        <Button
          label={top.kind === 'tent' ? 'Set it up' : 'Have a look'}
          hint={suggestionTitle(top)}
          onPress={() => openSuggestion(top)}
        />
      </Card>
      {others.length ? <T muted>Or try</T> : null}
      {others.map((s) => (
        <Card key={s.challengeId} label={`${suggestionTitle(s)}. ${s.reason}`} onPress={() => openSuggestion(s)}>
          <T variant="heading">{suggestionTitle(s)}</T>
          <T muted>{s.reason}</T>
        </Card>
      ))}
    </Section>
  );
}

function suggestionTitle(s: Suggestion): string {
  const title = findChallenge(s.challengeId)?.title ?? '';
  return s.kind === 'tent' ? `Tent Simulation: ${title}` : title;
}

function openSuggestion(s: Suggestion) {
  if (s.kind === 'tent') router.push({ pathname: '/session/tent-setup', params: { challengeId: s.challengeId } });
  else router.push({ pathname: '/challenge/[id]', params: { id: s.challengeId } });
}
