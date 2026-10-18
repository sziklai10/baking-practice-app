import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider, useAppData } from '../state/AppData';
import { useColors } from '../ui/theme';

function Navigator() {
  const c = useColors();
  const { ready } = useAppData();
  // Saved data loads in a moment; render nothing rather than flash an empty state.
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="challenge/[id]" options={{ title: '' }} />
      {/* Sessions can't be swiped away by a wet thumb; leaving is always an explicit choice. */}
      <Stack.Screen
        name="session/practice"
        options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="session/reflect"
        options={{
          title: 'How did it go?',
          gestureEnabled: false,
          headerBackVisible: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <StatusBar style="auto" />
        <Navigator />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
