# CLAUDE.md

@AGENTS.md

## Source of truth

Product decisions live in the PRD, which is kept in the Proof project's files
(not in this repo): `knowledge/Product Requirements Document (PRD) - PRE DISCOVERY.md`.
Section 9 sets the MVP scope; the decision log (section 18) records why.
Don't edit the PRD without asking the product owner; suggest changes instead.

## Agreed conventions (architecture approved 18 Oct 2026)

- Expo + TypeScript (strict) + Expo Router. Routes in `src/app/`, kept thin.
  Nothing but routes goes in `src/app/`: every file there is bundled as a screen,
  so tests live next to their code or in `src/flows/` (full-app flow tests).
- `src/domain/` is pure TypeScript with no React: timer, scheduling, formatting.
  Anything with rules or maths goes here and gets unit tests.
- Timers are derived from wall-clock timestamps (`src/domain/timer.ts`), never
  from counting ticks. Redraws only re-read the clock.
- Local storage only (AsyncStorage) via `src/storage/`. Every value has a
  `schemaVersion`; add a migration rather than changing a shape in place. All
  keys start with `app.` so "Delete all my data" catches them.
- Placeholder content (challenges, prompts, equipment) lives in `content/*.json`
  and is validated on load. No content in code.
- App name and IDs live only in `config/identity.json`. Bundle ID stays neutral.
  Never publish to a store.
- Minimal dependencies: add one only with a written reason, using `npx expo install`.
- Kitchen use: session controls at least 64pt (`KITCHEN_TAP_SIZE`), large text,
  respect system font size, nothing conveyed by colour alone, nothing that relies
  on sound. Prompts must never demand interaction; safety comes first in copy.
- Trust: coaching copy is labelled "General advice". No official rules, judging
  criteria or casting claims, and nothing that implies predicting success.
- Brand: never use the TV show's name, round names, catchphrases or branding,
  anywhere (code, files, comments, copy).
- Copy: natural, playful, British. No cheesy motivational lines.

## Checks before calling anything done

`npm run typecheck`, `npm run lint`, `npm test`. Report what was tested on a
real device separately from what only passed in Jest.
