import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { LEVEL_LABELS, equipmentLabels, findChallenge } from '../../content/challenges';
import { durationLabel } from '../../domain/format';
import { useAppData } from '../../state/AppData';
import { Bullets, Button, Notice, Screen, Section, T, Tag } from '../../ui/components';
import { space } from '../../ui/theme';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = findChallenge(id);
  const { active, startPractice } = useAppData();

  if (!challenge) {
    return (
      <Screen>
        <T variant="title">Challenge not found</T>
        <T>It may have been removed in an update.</T>
        <Button label="Back to challenges" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const begin = async () => {
    await startPractice(challenge);
    router.push('/session/practice');
  };

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <T variant="title">{challenge.title}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Tag label={LEVEL_LABELS[challenge.level]} />
          <Tag label={durationLabel(challenge.durationMinutes)} />
        </View>
        <T>{challenge.summary}</T>
      </View>

      <Section title="The goal">
        <T>{challenge.goal}</T>
      </Section>

      <Section title="Before you start" tag="General advice">
        <Bullets items={challenge.prepNotes} />
      </Section>

      <Section title="You'll need">
        <Bullets items={challenge.equipment.map((e) => equipmentLabels[e] ?? e)} />
      </Section>

      <Section title="Safety first">
        <Bullets items={[...challenge.safetyNotes, 'You can pause or stop the timer at any point. The bake can wait; your fingers come first.']} />
      </Section>

      {active ? (
        <View style={{ gap: space.sm }}>
          <Notice>You've already got a session on the go. Finish that one first.</Notice>
          <Button label="Go to my session" variant="secondary" onPress={() => router.push(active.endedAt === null ? '/session/practice' : '/session/reflect')} />
        </View>
      ) : (
        <Button
          label={`Start the ${durationLabel(challenge.durationMinutes)} timer`}
          hint="Starts the countdown straight away"
          onPress={begin}
        />
      )}
    </Screen>
  );
}
