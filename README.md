# 4e-kit

Shared D&D 4e code for [4e DM Dashboard] and [4ecb]:

- `src/vocab.ts`: closed vocabularies (action types, usage, ranges, defenses,
  damage types, conditions, durations, roles, sizes) with labels and glyphs.
- `src/schema.ts`: the content schema for monsters, powers, effect clauses,
  items, traps, diseases, monster templates and themes.
- `src/character-snapshot.ts`: an evaluated player character, exported by
  4ecb and imported by 4e DM Dashboard.
- `src/theme.ts`: the theme preference (`system`, `light`, `dark`) and
  `resolveTheme`, which picks the theme to show.
- `styles/tokens.css`: the shared design tokens (4ecb's light and dark color
  sets, power tones, fonts, radius, shadow). Custom properties only. An app
  imports the file by path and sets `data-theme="light"` or `"dark"` on
  `<html>`; with no attribute the OS color scheme decides. Display text uses
  EB Garamond, which each app loads itself (`@fontsource/eb-garamond`).

- `src/power-card.ts`: what a power card shows, independent of drawing: the
  icon name (Lucide, kebab-case) for each action type, usage chip labels,
  short defense names, sustain lines, and body lines in book order. Icons are
  names only; each app draws them with its own icon component.

Planned: content validators.

## Using it

Each app includes this repo as a git submodule and imports the TypeScript
source directly through a path alias; there is no build step. The submodule
commit is the pinned version.

The code must type-check under the strictest settings either app uses (see
`tsconfig.json`: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) and
must not depend on Node, Electron, React or the DOM.

## Development

Run tooling inside a devcontainer, not on the host:

    npm run typecheck
    npm test

## License

GPL-3.0-or-later. See `LICENSE`.
