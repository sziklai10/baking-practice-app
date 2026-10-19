import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { challenges, findChallenge } from '../../content/challenges';
import { durationLabel } from '../../domain/format';
import type { PromptFrequency } from '../../domain/tent';
import { useAppData } from '../../state/AppData';
import { Button, Choices, Notice, Screen, T, Toggle } from '../../ui/components';
import { space } from '../../ui/theme';

const DURATIONS = [30, 45, 60, 90, 120, 180];
const NO_CHALLENGE = 'none';

const FREQUENCIES: { value: PromptFrequency; label: string; detail: string }[] = [
  { value: 'off', label: 'Off', detail: 'Just the clock, no questions' },
  { value: 'low', label: 'Low', detail: 'Roughly every 20 to 30 minutes' },
  { value: 'medium', label: 'Medium', detail: 'Roughly every 10 to 15 minutes' },
];

export default function TentSetupScreen() {
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const { tentSettings, active, startTent } = useAppData();
  const initialChallenge = findChallenge(params.challengeId);

  const [challengeId, setChallengeId] = useState<string>(initialChallenge?.id ?? NO_CHALLENGE);
  const [duration, setDuration] = useState(initialChallenge?.durationMinutes ?? tentSettings.durationMinutes);
  const [frequency, setFrequency] = useState<PromptFrequency>(tentSettings.frequency);
  const [pauseOnPrompt, setPauseOnPrompt] = useState(tentSettings.pauseOnPrompt);
  const [vibrate, setVibrate] = useState(tentSettings.vibrate);
  const [starting, setStarting] = useState(false);

  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  const pickChallenge = (id: string | null) => {
    const value = id ?? NO_CHALLENGE;
    setChallengeId(value);
    const c = findChallenge(value);
    if (c) setDuration(c.durationMinutes);
  };

  const begin = async () => {
    setStarting(true);
    await startTent({
      challengeId: challengeId === NO_CHALLENGE ? null : challengeId,
      durationMinutes: duration,
      frequency,
      pauseOnPrompt,
      vibrate,
    });
    router.replace('/session/tent');
  };

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <T variant="title">Tent Simulation</T>
        <T>
          A timed bake with surprise questions, so you can practise talking about your baking while you work. Answer
          out loud if you can. If not, ignore it and it'll fade away on its own.
        </T>
      </View>

      <Notice>
        Safety first. Never reach for your phone with something hot or sharp in your hands. Ignoring a question is always
        fine.
      </Notice>

      <Choices
        label="Bake"
        options={[
          { value: NO_CHALLENGE, label: 'My own bake', detail: 'Bring your own recipe' },
          ...challenges.map((c) => ({ value: c.id, label: c.title, detail: durationLabel(c.durationMinutes) })),
        ]}
        value={challengeId}
        onChange={pickChallenge}
      />

      <Choices
        label="How long?"
        options={durations.map((d) => ({ value: String(d), label: durationLabel(d) }))}
        value={String(duration)}
        onChange={(v) => v && setDuration(Number(v))}
      />

      <View style={{ gap: space.sm }}>
        <Choices label="Interview questions" options={FREQUENCIES} value={frequency} onChange={(v) => v && setFrequency(v)} />
        <T muted>General practice questions, not real questions from any competition. None in the first 5 or last 10 minutes.</T>
      </View>

      {frequency !== 'off' ? (
        <View style={{ gap: space.sm }}>
          <Toggle
            label="Pause the clock during a question"
            detail="Off is closer to the real thing. On gives you breathing room."
            value={pauseOnPrompt}
            onChange={setPauseOnPrompt}
          />
          <Toggle label="Buzz when a question arrives" detail="A short vibration. Never a sound." value={vibrate} onChange={setVibrate} />
        </View>
      ) : null}

      {active ? (
        <Notice>You've already got a session on the go. Finish that one first.</Notice>
      ) : (
        <Button
          label={starting ? 'Starting…' : `Start the ${durationLabel(duration)} clock`}
          hint="Starts the countdown straight away"
          onPress={begin}
          disabled={starting}
        />
      )}
    </Screen>
  );
}
