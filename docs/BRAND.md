# Brand and design system

## Identity
- **Name:** Blurt! (wordmark: lowercase `blurt` + a yellow `!` that wiggles)
- **Tagline:** See it. Say it. Know it.
- **Mascot:** Pip, your lab partner (see `MASCOT.md`)
- **Personality:** playful but smart. It feels like a game, but it respects that high schoolers aren't kids.
- **Voice:** a smart older classmate. Short sentences, encouraging, specific. Never babyish, never mocking.

| Situation | Say | Don't say |
|---|---|---|
| Near miss | "Close — that's the adjective." | "Wrong!" |
| Confusable term | "That's the proton. This one has no charge." | "Incorrect answer." |
| Correct | "Nucleus. Nailed it." | "Yay!! Good job buddy!!" |
| Idle | "Name the glowing part." | "Can you guess what this is?" |

## Colour tokens

The code copy of every token in this file is `packages/shared/src/theme` (`colors.ts`, `typography.ts`, `layout.ts`, `motion.ts`). Change a value here and there in the same commit. Where this doc gives a range, the code picks one default inside it.

| Token | Hex | Use |
|---|---|---|
| `violet` | `#5B2EFF` | Brand, electrons, links on light, progress fills on white |
| `night` | `#160C3A` | Text on light surfaces, dark stage, icons on yellow |
| `sunny` | `#FFC93C` | Primary actions, mic button, wins, tiles on correct |
| `sunnyShadow` | `#C98F00` | 3D bottom edge of yellow buttons |
| `coral` | `#FF6B4A` | Live mic, lives, protons, "missed" markers |
| `coralShadow` | `#C2410C` | 3D bottom edge of coral buttons |
| `mint` | `#7FE0C0` | Gems, Physics topic |
| `lilac` | `#EFE9FF` | Picture card background |
| `lilacLine` | `#E4DCFF` | Neutrons, light dividers |
| `ink2` | `#4B4370` | Secondary text on white |
| `white` | `#FFFFFF` | Cards, bubbles |
| `glass` | `rgba(255,255,255,0.12–0.16)` + 14–18 px blur | Controls on scenes |
| `scrim` | `rgba(22,12,58,0.35–0.6)` + blur | Chips and fact card on scenes |

### Pip colours
Used only by the mascot (`pipColors` in code, anatomy in `MASCOT.md`).

| Token | Hex | Use |
|---|---|---|
| `body` | `#FFC93C` | Body, ears (same as `sunny`) |
| `belly` | `#FFE59A` | Belly |
| `limb` | `#F5B21E` | Arms, feet |
| `inner` | `#FF7A59` | Inner ears, cheeks |
| `ink` | `#160C3A` | Outlines, pupils, mouth (same as `night`) |
| `lens` | `#8FD8FF` | Goggle lenses, sweat drop |
| `white` | `#FFFFFF` | Eyes, sparkles |
| `shadow` | `#0B0424` | Ground shadow (at 22 %) |

Rules:
- Right/close/wrong are told apart by **icon and text as well as colour**, and the colours also differ in lightness (yellow vs coral vs violet). Never rely on red/green.
- Yellow buttons always carry **night** text, never white.
- Background scenes: `assets/scenes/scene-day.svg` (Home, Summary) and `scene-lab-night.svg` (gameplay).

## Typography

| Role | Font | Weight | Size / line height |
|---|---|---|---|
| Wordmark | Bricolage Grotesque | 800 | 52–64 / 1.0, tracking −3% |
| Display (scores) | Bricolage Grotesque | 800 | 40–56 / 1.0 |
| Title (bubble, card titles) | Bricolage Grotesque | 800 | 20–23 / 1.1 |
| Button | Bricolage Grotesque | 800 | 17–20 |
| Letter tile | Bricolage Grotesque | 800 | 24 |
| Body | DM Sans | 400/500 | 14–16 / 1.4 |
| Label / chip | DM Sans | 700 | 11–13, uppercase labels +6–8% tracking |

Both fonts are free on Google Fonts. Load them with `expo-font` (the `@expo-google-fonts/*` packages or bundled TTFs).

## Spacing, radius, elevation
- Spacing scale: `4, 6, 8, 10, 12, 14, 16, 20, 24`. Screen side padding is 20.
- Radius: chip 12–16 · tile 12 · button 20–24 · card 22–28 · picture card 34 · mic is a full circle.
- 3D button: `box-shadow 0 6px 0 <shadowToken>`. Pressing moves it down 4 px and shrinks the shadow to 2 px.
- Card shadow: `0 10–18px 24–40px rgba(22,12,58,0.3)`.

## Components (reference: design canvas)
- **Primary button**: sunny, 56–64 tall, radius 20–24, 3D shadow, breathing scale 1→1.04 every 1.6–2 s when it's the main next step.
- **Mic button**: 92 circle. Idle is sunny with a night mic icon. Listening is coral with a 5-bar waveform and two expanding coral rings.
- **Glass dock**: Hint, Mic, Skip in a glass panel, radius 32. Side buttons are 56 squares, radius 20, with a sunny count badge.
- **Letter tiles**: 40×48. Hidden: glass with a 2 px white border at 28% opacity. Revealed: white with a lilac shadow. Correct: sunny, popping in one by one.
- **Pip speech bubble**: white, radius 22, tail pointing at Pip. Holds a title, then the clue chip or sub-text, then a "Heard" chip.
- **Topic card**: 136 wide, white. Coloured 76 px illustration panel, then name, subject and progress. Today's topic gets a 3 px sunny ring and a "Today" tag. Locked topics get a lilac panel with a lock and "Unlocks at level N".
- **Fact card**: scrim glass, atom icon, "QUICK FACT" label in sunny, one sentence.

## Motion

| Name | Spec | Where |
|---|---|---|
| Drift | translateX −120 → +460, 36–56 s linear, infinite | Background atoms |
| Spin | 360°, 9–14 s (atoms), 28–40 s (sunburst) | Atoms, sunburst |
| Twinkle | opacity 0.15↔1 + scale, 2–3 s | Stars |
| Float | translateY 0↔−8, rotate −2°↔−1°, 4 s | Picture card |
| Listen ring | scale 1→1.75, opacity 0.6→0, 1.3 s, two rings offset 0.45 s | Mic while listening |
| Shake | ±6 px, 0.4 s ×2 | Tiles on a near miss |
| Pop | scale 0.4→1.18→1 with rotation, 0.5 s, 60 ms stagger | Tiles on correct |
| Rise | "+100" moves up 60 px and fades, 1.6 s | Score gain |
| Confetti | 22 pieces, 2.2–3.4 s falls | Correct, summary |

Rules: ambient motion is slow and quiet, and reactive motion is quick and clear. When the OS **Reduce Motion** setting is on, turn off drift, spin, float and confetti, and replace shakes and pops with simple fades.
