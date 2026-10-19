import { router } from 'expo-router';
import { View } from 'react-native';
import identity from '../../config/identity.json';
import { useAppData } from '../state/AppData';
import { Bullets, Button, Screen, T } from '../ui/components';
import { space } from '../ui/theme';

export default function WelcomeScreen() {
  const { skipProfile } = useAppData();
  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <T variant="title">Welcome to {identity.displayName}</T>
        <T>Practice for baking competitions, at home and against the clock.</T>
      </View>
      <Bullets
        items={[
          'Timed practice bakes with a short reflection afterwards.',
          'A Tent Simulation that throws in interview questions while you work.',
          'Everything stays on this phone. No account, nothing sent anywhere.',
        ]}
      />
      <T muted>
        {identity.displayName} is independent and isn't connected to any TV show or competition. Tips are general
        advice, not official rules.
      </T>
      <View style={{ gap: space.sm }}>
        <T>Answer five quick questions and we'll suggest what to practise first.</T>
        <Button label="Set up my plan" onPress={() => router.push('/onboarding')} />
        <Button
          label="Skip for now"
          variant="secondary"
          onPress={async () => {
            await skipProfile();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}
