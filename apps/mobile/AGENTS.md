The repo-wide rules in the root `AGENTS.md` and `docs/` take precedence over this file.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This repo uses pnpm. Run these from `apps/mobile`.

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
pnpm lint                   # lint (expo lint)
pnpm typecheck              # typecheck
pnpm test                   # jest (jest-expo preset)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

Tests: Jest (`jest-expo`) + React Native Testing Library. Reanimated is replaced in Jest by `src/test/reanimatedMock.ts` (Reanimated 4's own mock needs native modules), so tests render final poses. Add any Reanimated function a component starts using to that file. Check motion itself on a device.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` (not `src/app/`, per docs/ARCHITECTURE.md) — every file there is a screen, `_layout.tsx` files define navigators. Routes stay thin and compose screens from `src/features/<feature>/`. Keep non-route code outside `app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Tab navigators only show screens declared in their layout (`<Tabs.Screen name="…" />`). A new tab route that isn't declared renders nothing.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
