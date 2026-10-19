# Baking practice app (working name: Steady On)

A mobile-first practice app for home bakers preparing for baking competitions.
MVP scope and decisions: see `CLAUDE.md`.

## Try it on your phone

You need a computer with [Node.js](https://nodejs.org) (version 20 or later)
and the free **Expo Go** app on your phone (App Store or Google Play). The
phone and computer should be on the same Wi-Fi.

```bash
git clone <this repo>
cd <repo folder>
npm install
npx expo start
```

A QR code appears in the terminal. On iPhone, scan it with the Camera app; on
Android, scan it from inside Expo Go. The app opens in Expo Go. Nothing is
published to any app store.

If Expo Go says the project needs a newer or older version of Expo Go, tell
us: the app's Expo SDK has to match what Expo Go supports.

If the phone can't connect (work or public Wi-Fi often blocks it), run
`npx expo start --tunnel` instead.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
