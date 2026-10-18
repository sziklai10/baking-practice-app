import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { findChallenge } from '../../content/challenges';
import { spokenDuration } from '../../domain/format';
import type { Feeling } from '../../domain/session';
import { FEELING_LABELS } from '../../domain/session';
import { activeElapsedMs, remainingMs } from '../../domain/timer';
import { useAppData } from '../../state/AppData';
import { Bullets, Button, Screen, Section, T } from '../../ui/components';
import { KITCHEN_TAP_SIZE, space, type, useColors } from '../../ui/theme';

export default function ReflectScreen() {
  const { active, saveReflection, discard } = useAppData();
  const [wentWell, setWentWell] = useState('');
  const [improveNext, setImproveNext] = useState('');
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [saving, setSaving] = useState(false);

  if (!active || active.endedAt === null) return <Redirect href="/" />;

  const challenge = findChallenge(active.challengeId);
  const baked = activeElapsedMs(active.timer, active.endedAt);
  const left = remainingMs(active.timer, active.endedAt);

  const save = async () => {
    setSaving(true);
    await saveReflection({ wentWell, improveNext, feeling });
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
        <T variant="heading">{challenge?.title ?? 'Practice session'}</T>
        <T muted>
          {left > 0
            ? `You stopped with ${spokenDuration(left)} to spare, after ${spokenDuration(baked)}.`
            : `You went the full ${spokenDuration(baked)}.`}
        </T>
      </View>

      <Field label="What went well?" value={wentWell} onChangeText={setWentWell} />
      <Field label="What would you change next time?" value={improveNext} onChangeText={setImproveNext} />

      {challenge?.reflectionHints.length ? (
        <Section title="Worth thinking about" tag="General advice">
          <Bullets items={challenge.reflectionHints} />
        </Section>
      ) : null}

      <FeelingPicker value={feeling} onChange={setFeeling} />

      <T muted>Only you see this. It's saved on this phone and nowhere else.</T>

      <View style={{ gap: space.sm }}>
        <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
        <Button label="Don't save this one" variant="secondary" onPress={confirmDiscard} disabled={saving} />
      </View>
    </Screen>
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

function FeelingPicker({ value, onChange }: { value: Feeling | null; onChange: (f: Feeling | null) => void }) {
  const c = useColors();
  const options = Object.keys(FEELING_LABELS) as Feeling[];
  return (
    <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel="How did it feel? Optional">
      <T variant="heading">How did it feel?</T>
      {options.map((f) => {
        const selected = value === f;
        return (
          <Pressable
            key={f}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={FEELING_LABELS[f]}
            onPress={() => onChange(selected ? null : f)}
            style={[
              styles.option,
              { borderColor: selected ? c.accent : c.border, backgroundColor: c.surface, borderWidth: selected ? 3 : 1 },
            ]}
          >
            {/* The tick shows the choice without relying on colour. */}
            <Text style={[type.body, { color: c.text, width: 28 }]}>{selected ? '✓' : ''}</Text>
            <Text style={[type.body, { color: c.text, flex: 1, fontWeight: selected ? '700' : '400' }]}>
              {FEELING_LABELS[f]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 96, borderWidth: 1, borderRadius: 12, padding: space.md, textAlignVertical: 'top' },
  option: {
    minHeight: KITCHEN_TAP_SIZE,
    borderRadius: 12,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
