// Placeholder visual tokens, kept deliberately plain until the branding
// workshop. Text/background pairs are chosen to meet WCAG AA contrast.
import { useColorScheme } from 'react-native';

const light = {
  background: '#FBF7F0',
  surface: '#FFFFFF',
  text: '#1F1A17',
  textMuted: '#5A514A',
  border: '#D9CFC3',
  accent: '#8A2B4A',
  onAccent: '#FFFFFF',
  danger: '#9E1C1C',
  onDanger: '#FFFFFF',
  notice: '#F3E6C8',
  onNotice: '#3D2E0A',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#171412',
  surface: '#221E1B',
  text: '#F5EFE6',
  textMuted: '#C2B8AC',
  border: '#4A423B',
  accent: '#F2A3BC',
  onAccent: '#2A0B16',
  danger: '#FF9C9C',
  onDanger: '#330606',
  notice: '#3D3218',
  onNotice: '#F7E9C4',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

/** Minimum height for anything tapped during a bake. Above the 44/48pt platform minimums on purpose. */
export const KITCHEN_TAP_SIZE = 64;

export const type = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 18, lineHeight: 26 },
  small: { fontSize: 16, lineHeight: 22 },
  button: { fontSize: 20, fontWeight: '700' as const },
};
