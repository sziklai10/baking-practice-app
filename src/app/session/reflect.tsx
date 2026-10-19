import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { findChallenge, sessionTitle } from '../../content/challenges';
import { promptText } from '../../content/prompts';
import { spokenDuration } from '../../domain/format';
import type { Feeling } from '../../domain/session';
import { FEELING_LABELS, PROMPT_OUTCOME_LABELS } from '../../domain/session';
import { activeElapsedMs, remainingMs } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Bullets, Button, Choices, Screen, Section, T } from '../../ui/components';
import { space, type, useColors } from '../../ui/theme';

export default function ReflectScreen() {
  const { active, saveReflection, discard } = useAppData();
  const [wentWell, setWentWell] = useState('');
  const [improveNext, setImproveNext] = useState('');
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [promptNotes, setPromptNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!active || active.endedAt === null) return <Redirect href="/" />;

  const challenge = findChallenge(active.challengeId);
  const baked = activeElapsedMs(active.timer, active.endedAt);
  const left = remainingMs(active.timer, active.endedAt);

  const save = async () => {
    setSaving(true);
    await saveReflection({ wentWell, improveNext, feeling, promptNotes });
    router.dismissTo('/');
  };

  const confirmDiscard = () =>
    Alert.alert("Don't save this session?", "It won't appear in your progress.", [
      { text: 'Keep it', style: 'cancel' },
      {
        text: "Don't save",
        style: 'destructive',
        onPress: async () => {
          await discard();
          router.dismissTo('/');
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <T variant="heading">{sessionTitle(active.kind, active.challengeId, active.timer.durationMs)}</T>
        <T muted>
          {left > 0
            ? `You stopped with ${spokenDuration(left)} to spare, after ${spokenDuration(baked)}.`
            : `You went the full ${spokenDuration(baked)}.`}
        </T>
      </View>

      <Field label="What went well?" value={wentWell} onChangeText={setWentWell} />
      <Field label="What would you change next time?" value={improveNext} onChangeText={setImproveNext} />

      {active.tent && active.tent.frequency !== 'off' ? <PromptRecap log={active.tent.log} /> : null}
      {active.tent && active.tent.log.some((l) => l.outcome === 'answered' || l.outcome === 'faded' || l.outcome === 'skipped') ? (
        <Field label="Anything to say better next time?" value={promptNotes} onChangeText={setPromptNotes} />
      ) : null}

      {challenge?.reflectionHints.length ? (
        <Section title="Worth thinking about" tag="General advice">
          <Bullets items={challenge.reflectionHints} />
        </Section>
      ) : null}

      <Choices
        label="How did it feel?"
        options={(Object.keys(FEELING_LABELS) as Feeling[]).map((f) => ({ value: f, label: FEELING_LABELS[f] }))}
        value={feeling}
        onChange={setFeeling}
        allowNone
      />

      <T muted>Only you see this. It's saved on this phone and nowhere else.</T>

      <View style={{ gap: space.sm }}>
        <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
        <Button label="Don't save this one" variant="secondary" onPress={confirmDiscard} disabled={saving} />
      </View>
    </Screen>
  );
}

function PromptRecap({ log }: { log: { promptId: string; outcome: keyof typeof PROMPT_OUTCOME_LABELS }[] }) {
  const seen = log.filter((l) => l.outcome !== 'missed' && l.outcome !== 'muted');
  const heldBack = log.length - seen.length;
  return (
    <Section title="Questions you got">
      {seen.length === 0 ? <T>No questions came up this time.</T> : null}
      {seen.map((l) => (
        <View key={l.promptId} style={{ gap: space.xs }}>
          <T>{promptText(l.promptId)}</T>
          <T muted>{PROMPT_OUTCOME_LABELS[l.outcome]}</T>
        </View>
      ))}
      {heldBack > 0 ? (
        <T muted>
          {heldBack} more {heldBack === 1 ? 'was' : 'were'} held back while muted or while the app was closed.
        </T>
      ) : null}
      <T muted>Letting a question pass is fine. The point is practice, not a score.</T>
    </Section>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <T variant="heading" nativeID={label}>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        aria-labelledby={label}
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholder="Optional"
        placeholderTextColor={c.textMuted}
        style={[styles.input, type.body, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 96, borderWidth: 1, borderRadius: 12, padding: space.md, textAlignVertical: 'top' },
});
