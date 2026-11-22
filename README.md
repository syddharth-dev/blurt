# Blurt! — See it. Say it. Know it.

A mobile game for high school students, plus a web dashboard where teachers add the pictures and words. The app shows a science diagram with one part highlighted, and the student **says** the term out loud. Speech-to-text checks the answer, and Pip, the mascot, reacts. Terms follow the school science curriculum (Chemistry, Biology, Physics, Earth & Space).

This folder is the project's design and engineering spec. Put it in the root of your repository.

## What's in here

| File | What it covers |
|---|---|
| `AGENTS.md` | Short rules for AI coding assistants (Claude Code, Copilot, Cursor). Read automatically by most of them. |
| `docs/BRAND.md` | Name, voice, colours, type, spacing, components, motion: the design system as tokens. |
| `docs/MASCOT.md` | Pip: anatomy, the five moods, when each mood shows, and the complete Reanimated component code. |
| `docs/SCREENS.md` | Every screen and every game state, element by element. |
| `docs/TECH_STACK.md` | Frontend, backend, infrastructure and tooling choices, and why. |
| `docs/ARCHITECTURE.md` | System architecture, folder structure, design patterns, the game state machine. |
| `docs/TEACHER_DASHBOARD.md` | The teacher web app: roles, pages, the term editor, picture uploads, classes and reports. |
| `docs/DATA_AND_API.md` | Database schema (schools, classes, pictures, terms), REST API for the app and the dashboard. |
| `docs/SPEECH_AND_MATCHING.md` | Speech recognition setup and the answer-matching algorithm. |
| `docs/DEPLOYMENT.md` | Putting the API online (Railway), environments, secrets, and the cheaper no-server option. |
| `docs/ROADMAP.md` | Build order, from first prototype to launch. |
| `assets/pip/*.svg` | Pip in all five moods: visual reference (they animate in a browser; the app redraws them in code). |
| `assets/scenes/*.svg` | The day and night background illustrations. |

## Using this in VS Code

1. Create your project (see `docs/TECH_STACK.md` → "Getting started"), then copy this whole folder into its root so you have `AGENTS.md`, `docs/` and `assets/` next to `package.json`.
2. Install the **Markdown Preview Mermaid Support** extension so the architecture diagrams in the docs render (`Ctrl/Cmd + Shift + V` opens a preview).
3. Hook the docs up to your AI assistant:
   - **Claude Code**: it reads `CLAUDE.md`. Copy or rename `AGENTS.md` to `CLAUDE.md` (or create a `CLAUDE.md` containing the line `@AGENTS.md`).
   - **GitHub Copilot**: copy `AGENTS.md` to `.github/copilot-instructions.md`.
   - **Cursor** and most other agents read `AGENTS.md` directly.
4. When you ask the assistant for a feature, point it at the right doc, for example: *"Build the Play screen's idle state following docs/SCREENS.md and docs/BRAND.md."* Working one screen or one module at a time gives much better results than "build the app".
5. Keep the docs current. When a decision changes, update the doc first, then the code.

## The design file

The interactive mockups and brand kit live on the Claude design canvas this spec was made from. Use it as the visual reference. These docs are the written source of truth, including exact values.
