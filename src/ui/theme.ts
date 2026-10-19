// Placeholder visual tokens (soft and warm) until the branding workshop.
// Text/background pairs are chosen to meet WCAG AA contrast.
import { useColorScheme } from 'react-native';

const light = {
  background: '#FAF6F1',
  surface: '#FFFFFF',
  text: '#2B2320',
  textMuted: '#6B5F57',
  border: '#E8DED3',
  accent: '#A84A22',
  onAccent: '#FFFFFF',
  /** Tinted fill for tags and chosen options; text on it stays `text`. */
  accentSoft: '#F6E3D8',
  danger: '#A61B1B',
  onDanger: '#FFFFFF',
  notice: '#FBEBC8',
  onNotice: '#4A3608',
  shadow: '#5A3A28',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#1A1614',
  surface: '#26201D',
  text: '#F7F0E8',
  textMuted: '#C9BDB2',
  border: '#3A322D',
  accent: '#F0A27E',
  onAccent: '#2B1206',
  accentSoft: '#3D2A20',
  danger: '#FF9C9C',
  onDanger: '#330606',
  notice: '#3D3218',
  onNotice: '#F7E9C4',
  shadow: '#000000',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };

/** Minimum height for anything tapped during a bake. Above the 44/48pt platform minimums on purpose. */
export const KITCHEN_TAP_SIZE = 64;

export const type = {
  title: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 18, lineHeight: 26 },
  small: { fontSize: 16, lineHeight: 22 },
  button: { fontSize: 19, fontWeight: '700' as const },
};
