# Blurt! mobile app

Expo SDK 58 + Expo Router. Spec: the repo's `docs/SCREENS.md`, `docs/BRAND.md`, `docs/MASCOT.md`.

```bash
cp .env.example .env.local
pnpm --filter mobile start
```

`expo-speech-recognition`, Reanimated and react-native-svg are native modules, so test on a
development build (`npx expo run:ios|android` or `eas build --profile development`), not Expo Go.
