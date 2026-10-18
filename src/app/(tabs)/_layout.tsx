import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { type, useColors } from '../../ui/theme';

function TabLabel({ focused, color, children }: { focused: boolean; color: ColorValue; children: string }) {
  // The selected tab is bold and underlined as well as coloured, so it never relies on colour alone.
  return (
    <Text
      style={{
        fontSize: type.small.fontSize,
        color,
        fontWeight: focused ? '700' : '400',
        textDecorationLine: focused ? 'underline' : 'none',
      }}
    >
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64 },
        // Text-only tabs until there's a visual identity to draw icons from.
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabel: ({ focused, color, children }) => (
          <TabLabel focused={focused} color={color}>
            {children}
          </TabLabel>
        ),
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Practise' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
