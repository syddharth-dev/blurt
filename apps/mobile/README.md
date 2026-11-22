# Blurt! mobile app

Expo SDK 58 + Expo Router. Spec: the repo's `docs/SCREENS.md`, `docs/BRAND.md`, `docs/MASCOT.md`.

```bash
cp .env.example .env.local
pnpm --filter mobile start
```

`expo-speech-recognition`, Reanimated, react-native-svg, MMKV and SecureStore are native modules,
so test on a development build (`pnpm build:dev:android`), not Expo Go. Rebuild after adding any
native module (Phase 3 added `react-native-mmkv`, `react-native-nitro-modules`, `expo-secure-store`,
`expo-crypto`).

For online play, fill in `.env.local` (see `.env.example`) and run the API on your computer
(`pnpm --filter api start:dev`); `EXPO_PUBLIC_API_URL` must be your computer's network address,
not `localhost`, so the phone can reach it.
