import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { fonts, type, useColors } from '../../ui/theme';

function TabLabel({ focused, color, children }: { focused: boolean; color: ColorValue; children: string }) {
  // The selected tab gets a bar above it and bold text, so it never relies on colour alone.
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center', borderTopWidth: 4, borderTopColor: focused ? color : 'transparent', paddingTop: 10 }}>
      <Text style={[type.small, { color, fontFamily: focused ? fonts.bold : fonts.body }]}>{children}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 2, minHeight: 72 },
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
