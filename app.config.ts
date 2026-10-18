import type { ExpoConfig } from 'expo/config';
import identity from './config/identity.json';

const config: ExpoConfig = {
  name: identity.displayName,
  slug: identity.slug,
  scheme: identity.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: identity.iosBundleIdentifier,
  },
  android: {
    package: identity.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#FBF7F0',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router', 'expo-notifications'],
};

export default config;
