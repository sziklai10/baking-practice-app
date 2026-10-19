// Visual tokens from the "Proving Room" concept: Flour, Cocoa, Crust, Jam,
// Herb and Parchment, with Fraunces for headings and Atkinson Hyperlegible
// for anything read mid-bake. Every text/background pair meets WCAG AA.
import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  background: '#FBF4E6', // Flour
  surface: '#FFFBF2', // Parchment
  text: '#3B2416', // Cocoa
  textMuted: '#6B4E3C',
  /** Outlines on options, chips and secondary buttons. */
  border: '#3B2416',
  /** Primary buttons. */
  accent: '#3B2416',
  onAccent: '#FBF4E6',
  /** Chosen options and the main action on dark panels. */
  highlight: '#D98A3D', // Crust
  onHighlight: '#3B2416',
  /** Small labels above headings, and links. */
  eyebrow: '#9C2F25', // Jam
  success: '#3E6B48', // Herb
  danger: '#9C2F25',
  onDanger: '#FFFBF2',
  notice: '#F3C98F',
  onNotice: '#3B2416',
  /** The dark "next up" card. */
  hero: '#3B2416',
  onHero: '#FBF4E6',
  heroEyebrow: '#D98A3D',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#1E120B',
  surface: '#2C1C12',
  text: '#FBF4E6',
  textMuted: '#D9C3AA',
  border: '#E8D5BE',
  accent: '#D98A3D',
  onAccent: '#3B2416',
  highlight: '#D98A3D',
  onHighlight: '#3B2416',
  eyebrow: '#F2A48F',
  success: '#8FC79B',
  danger: '#F2A48F',
  onDanger: '#3B2416',
  notice: '#4A2E1C',
  onNotice: '#E8D5BE',
  hero: '#3B2416',
  onHero: '#FBF4E6',
  heroEyebrow: '#D98A3D',
};

/** Timer screens are always dark Cocoa, light or dark mode: calmer to glance at, and clearly "a session". */
export const sessionColors: Colors = {
  ...dark,
  background: '#3B2416',
  surface: '#4A2E1C',
  textMuted: '#E8D5BE',
  border: '#FBF4E6',
  accent: '#FBF4E6',
  onAccent: '#3B2416',
  eyebrow: '#D98A3D',
  notice: '#D98A3D',
  onNotice: '#3B2416',
};

/** An interview question card on a timer screen: Crust with Cocoa text. */
export const promptColors: Colors = {
  ...sessionColors,
  background: '#D98A3D',
  surface: '#D98A3D',
  text: '#3B2416',
  textMuted: '#3B2416',
  border: '#3B2416',
  accent: '#3B2416',
  onAccent: '#FBF4E6',
  eyebrow: '#3B2416',
};

const Override = createContext<Colors | null>(null);

/** Gives everything inside it a fixed palette, e.g. the dark timer screens. */
export const ColorsOverride = Override.Provider;

export function useColors(): Colors {
  const override = useContext(Override);
  const scheme = useColorScheme();
  return override ?? (scheme === 'dark' ? dark : light);
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 14, md: 16, lg: 22, pill: 999 };

/** Minimum height for anything tapped during a bake. Above the 44/48pt platform minimums on purpose. */
export const KITCHEN_TAP_SIZE = 64;

/** Loaded in the root layout; text falls back to the system font until they're ready. */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  body: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
};

export const type = {
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 39 },
  heading: { fontFamily: fonts.display, fontSize: 23, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26 },
  small: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  button: { fontFamily: fonts.bold, fontSize: 19 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1.6, textTransform: 'uppercase' as const },
};
