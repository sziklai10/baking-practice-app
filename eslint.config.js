// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // A web rule about HTML entities; React Native text renders apostrophes as written.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
