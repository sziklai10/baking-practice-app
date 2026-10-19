import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { equipmentLabels, skillLabels } from '../content/challenges';
import type { Goal, Level, Profile } from '../domain/plan';
import { ASSUMED_EQUIPMENT } from '../domain/plan';
import { useAppData } from '../state/AppData';
import { Button, Checklist, Choices, Screen, T } from '../ui/components';
import type { Choice } from '../ui/components';
import { space } from '../ui/theme';

const EXPERIENCE: Choice<Level>[] = [
  { value: 'beginner', label: 'Fairly new to it' },
  { value: 'intermediate', label: 'A few years in' },
  { value: 'confident', label: 'I bake all the time' },
];

const GOALS: Choice<Goal>[] = [
  { value: 'tv', label: 'Applying to a TV baking competition', detail: 'Or thinking about it' },
  { value: 'local', label: 'A local show or fête' },
  { value: 'improve', label: 'Just getting better' },
];

const TIME: Choice<string>[] = [
  { value: '60', label: 'Up to an hour' },
  { value: '120', label: 'Up to two hours' },
  { value: '180', label: 'Up to three hours' },
  { value: '600', label: 'As long as it takes' },
];

const EQUIPMENT: Choice<string>[] = Object.entries(equipmentLabels)
  .filter(([id]) => !ASSUMED_EQUIPMENT.includes(id))
  .map(([value, label]) => ({ value, label }));

const SKILLS: Choice<string>[] = Object.entries(skillLabels).map(([value, label]) => ({ value, label }));

const STEPS = 5;

export default function OnboardingScreen() {
  const { profile: saved, saveProfile, skipProfile } = useAppData();
  const previous = saved?.status === 'set' ? saved.profile : null;
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<Level | null>(previous?.experience ?? null);
  const [goal, setGoal] = useState<Goal | null>(previous?.goal ?? null);
  const [minutes, setMinutes] = useState<string | null>(previous ? String(previous.sessionMinutes) : null);
  const [equipment, setEquipment] = useState<string[]>(previous?.equipment ?? []);
  const [focus, setFocus] = useState<string[]>(previous?.focus ?? []);

  const answered = [experience !== null, goal !== null, minutes !== null, true, true][step];
  const last = step === STEPS - 1;

  const finish = async () => {
    if (!experience || !goal || !minutes) return;
    const profile: Profile = { experience, goal, sessionMinutes: Number(minutes), equipment, focus };
    await saveProfile(profile);
    router.dismissTo('/');
  };

  const skip = async () => {
    await skipProfile();
    router.dismissTo('/');
  };

  const question = [
    {
      why: "So the first suggestions aren't too easy or too much.",
      body: <Choices label="How much baking have you done?" options={EXPERIENCE} value={experience} onChange={setExperience} />,
    },
    {
      why: "If it's TV, we'll suggest practising talking while you bake.",
      body: <Choices label="What are you practising for?" options={GOALS} value={goal} onChange={setGoal} />,
    },
    {
      why: 'So we only suggest bakes that fit.',
      body: (
        <Choices label="How long can you usually give one practice?" options={TIME} value={minutes} onChange={setMinutes} />
      ),
    },
    {
      why: "So we don't suggest a bake you can't do with what's in your kitchen. We'll assume you have an oven.",
      body: <Checklist label="What have you got?" options={EQUIPMENT} values={equipment} onChange={setEquipment} />,
    },
    {
      why: 'Suggestions lean towards these. Pick as many as you like, or none.',
      body: <Checklist label="What would you like to work on?" options={SKILLS} values={focus} onChange={setFocus} />,
    },
  ][step];

  return (
    <Screen>
      <T muted>
        Step {step + 1} of {STEPS}
      </T>
      {question.body}
      <T muted>Why we ask: {question.why}</T>
      <View style={{ gap: space.sm }}>
        <Button
          label={last ? 'See my plan' : 'Next'}
          disabled={!answered}
          onPress={last ? finish : () => setStep(step + 1)}
        />
        {step > 0 ? <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} /> : null}
        {saved?.status !== 'set' ? <Button label="Skip for now" variant="secondary" onPress={skip} /> : null}
      </View>
    </Screen>
  );
}
