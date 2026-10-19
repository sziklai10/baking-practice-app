import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible/400Regular';
import { AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible/700Bold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider, useAppData } from '../state/AppData';
import { fonts, useColors } from '../ui/theme';

function Navigator() {
  const c = useColors();
  const { ready } = useAppData();
  // Only the three weights the app uses, imported one by one so the rest aren't bundled.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: Fraunces_600SemiBold,
    [fonts.body]: AtkinsonHyperlegible_400Regular,
    [fonts.bold]: AtkinsonHyperlegible_700Bold,
  });
  // Saved data and fonts load in a moment; render nothing rather than flash an unstyled screen.
  // A font that fails to load falls back to the system font rather than blocking the app.
  if (!ready || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ title: 'Your plan' }} />
      <Stack.Screen name="challenge/[id]" options={{ title: '' }} />
      {/* Sessions can't be swiped away by a wet thumb; leaving is always an explicit choice. */}
      <Stack.Screen
        name="session/practice"
        options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="session/tent-setup" options={{ title: '' }} />
      <Stack.Screen
        name="session/tent"
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
