# Speech recognition and answer matching

This is the heart of the app. Science vocabulary is hard for generic speech-to-text, so it needs two things: help the recognizer *hear* the right words, and judge the answer *strictly where it matters*.

## 1. Recognizer setup (expo-speech-recognition)
- **Language:** from the user's setting (e.g. `en-US`, `en-PH`, `en-GB`). Match the curriculum's language.
- **`interimResults: true`** → drives the live "Heard: nucle…" chip.
- **`maxAlternatives: 5`** → send *all* alternatives to the server. The right word is often the 2nd or 3rd guess.
- **`contextualStrings`** → pass every term in the current topic, plus its variants and confusables. This biases the recognizer towards science words ("mitochondria" instead of "mighty Kandria").
- **On-device when available** (`requiresOnDeviceRecognition` where supported) for speed and privacy, falling back to the platform's network recognizer.
- **Auto-stop** on silence. Students tap to start and don't need to hold.
- Handle `no-speech`, `network`, `not-allowed` and `audio-capture` errors with friendly Pip messages, and always offer **Type it instead**.

Wrap it all behind a port so the engine can change:
```ts
// apps/mobile/src/shared/speech/types.ts
export interface SpeechRecognizer {
  isAvailable(): boolean;
  getPermission(): Promise<PermissionState>;      // 'granted' | 'denied' | 'undetermined'
  requestPermission(): Promise<PermissionState>;
  start(opts: { lang: string; hints: string[]; onDevice?: boolean; androidModel?: 'free_form' | 'web_search' }): void;
  stop(): void;    // emits the final result if there is one
  abort(): void;   // discards it
  onPartial(cb: (text: string) => void): Unsubscribe;
  onFinal(cb: (alternatives: string[]) => void): Unsubscribe;
  onError(cb: (e: SpeechError) => void): Unsubscribe;
  onEnd(cb: () => void): Unsubscribe;   // always last, also after errors
}
```
Adapters: `createNativeSpeechAdapter()` (expo-speech-recognition) and `createMockSpeechAdapter(script)`. `createSpeechRecognizer()` picks the mock when `EXPO_PUBLIC_SPEECH=mock`. A `nomatch` from the phone, or a session that ends with no result, counts as `no-speech`.

Defaults chosen in the Phase 1 spike (tune them in the Speech lab): `maxAlternatives: 5`, on-device when supported, iOS `iosTaskHint: 'confirmation'` and Android `EXTRA_LANGUAGE_MODEL: 'web_search'` (both help single-word answers).

## 2. Answer matching (shared package, run on the server)
Input: a list of alternatives (or typed text). Output: `correct | close | wrong`, plus feedback.

```
for each alternative (in recognizer order):
  t = normalize(alt)        // lowercase, trim, strip punctuation, remove fillers
                            // ("um", "uh", "the", "a", "an", "it's", "is it")
  1. CONFUSABLE GUARD  t equals a confusable of this term     → WRONG (use its feedback)
  2. EXACT             t equals canonical or an ACCEPT variant → CORRECT
  3. WORD FAMILY       t equals a CLOSE variant                → CLOSE (use its reason)
  4. PHONETIC          same Double Metaphone code as canonical
                       AND edit similarity ≥ 0.8
                       AND t is not nearer to any confusable  → CORRECT (accent / spelling slip)
  5. NEAR              edit similarity ≥ 0.6, same safety check → CLOSE ("Almost — check the ending")
return the best verdict across all alternatives (CORRECT > CLOSE > WRONG)
```

Implementation: `packages/shared/src/matcher` → `matchAnswer(term, alternatives, { inputMode })` returns `{ verdict, matched, strategy, feedback }`. `feedback` is ready-to-show copy: a CLOSE variant's reason becomes "Close — that's the adjective.", NEAR gives "Almost — check the ending.", and a confusable gives its own feedback. Comparisons use a key with spaces removed, so "cell membrane" = "cellmembrane".

How the safety check works: the fuzzy steps (4 and 5) compare the input with every form of the term (canonical + ACCEPT), every CLOSE variant and every confusable. If a confusable is **at least as near** as the term (ties included), the answer is wrong. If a CLOSE variant is nearer than the term, it's CLOSE with that variant's reason ("nucleer" → "that's the adjective"). Only then can steps 4 and 5 reward the term. NEAR threshold: 0.6 by voice, 0.7 typed.

Rules:
- **The confusable guard always runs first.** "neutron" must never be accepted for "proton", however similar they sound.
- Typed answers use the same matcher with a slightly stricter NEAR threshold (spelling is part of learning).
- Multi-word terms ("cell membrane", "Newton's first law"): match the whole phrase after normalizing, and allow small filler words.
- Plurals and spellings go in ACCEPT variants (nuclei, sulfur/sulphur). Don't guess them with stemming. Explicit is safer.
- Log every `close` and `wrong` input (text only). The teacher dashboard's Reports page shows these per term, so teachers can add a missing variant in one click.
- Teachers add terms themselves, so the dashboard runs the **same matcher** in "Test with my voice" and **suggests confusables** (terms in the same topic within a small phonetic distance) when a term is saved.

### Unit tests you must have
- `proton` ✗ `neutron`, `mitosis` ✗ `meiosis`, `anion` ✗ `cation`, `nucleus` ✗ `nucleolus`
- `nuclear` → CLOSE for `nucleus`
- `nuclei` → CORRECT for `nucleus`
- `um the nucleus` → CORRECT
- Alternatives `["new clears", "nucleus"]` → CORRECT (second alternative wins)

- Every term set also gets a whole-set test: no term's answer (or ACCEPT variant) may be accepted for any other term in the set (`packages/shared/src/content/grade8.test.ts`).

## 3. Pronunciation help
- Pre-generate one clip per term with a cloud text-to-speech service at content-creation time, store it on the CDN, and play it with `expo-audio` from the "nu·cle·us" button.
- Optional later: pronunciation *scoring* with Azure AI Speech's pronunciation assessment for a "Say it like a scientist" practice mode.

## 4. Testing speech without talking
Use `MockSpeechAdapter` in development and in Maestro end-to-end tests. It emits scripted partials and finals, e.g. `["nu", "nucle"] → ["nuclear"]`, then `["nucleus"]`, which is exactly the prototype flow on the design canvas.
