# SwarmLadder brand and visual rules

SwarmLadder (working campus name: Swarm Campus) is an open engineering campus: serious enough
for engineering education and approachable for a first program. The visual language is
editorial and technical: paper and ink, one controlled accent, real code as the illustration.

## Mark

`src/components/Brand.tsx` (`LadderMark`) and `public/brand/*.svg`.

A ladder rising to the right, drawn on a 64-unit grid. Three rungs: the top rung reaches past
the rail to a node, the next learner on the climb (progression, the swarm). The back rail is
lighter to give depth without perspective tricks.

- Strokes are 4.5 units with round caps; never thinner, so the mark survives 16 px.
- Colours: rails `#e6f2ef`, rungs and node `#3fe0b0`, tile `#0c1729` (light theme) or
  `#13233d` (dark theme and footer, so the tile stays visible on navy).
- Tile-less versions: `mark-light.svg` (navy rails, teal rungs, for light backgrounds) and
  `mark-dark.svg` (for dark backgrounds).
- Minimum size 16 px (favicon); clear space of a quarter of the mark on every side.
- Do not rotate, recolour the rungs, add gradients or outline the mark.

## Wordmark

"Swarm" in ink plus "Ladder" in the accent, Instrument Sans 700 at −0.025 em tracking, with the
mark to its left (`Wordmark`). The product label ("Lab") is set in small caps behind a hairline
rule, never inside a pill. `public/brand/wordmark-light.svg` and `wordmark-dark.svg` are the
standalone lockups. `public/og.png` and `public/apple-touch-icon.png` are rendered from
`scripts/brand-assets.html` by `node scripts/brand-assets.mjs`.

## Colour tokens (`src/styles/field.css`, `lesson.css`)

| Role | Light | Dark |
|---|---|---|
| Page (`--paper`) | warm paper `#f6f4ee` | deep navy `#0b1526` |
| Sunken (`--paper-2`) | `#eceae2` | `#0f1b30` |
| Raised (`--sheet`) | `#fdfcf9` | `#111f37` |
| Text (`--ink`, `--ink-2`, `--muted`) | navy ink | soft white |
| Accent (`--signal`, `--blue`) | teal `#0b7a6c` | mint `#4fe1b6` |
| Success / warning / error | `--moss`, `--warning`, `--danger` with `-soft` fills | same roles |
| Code (`--code-*`) | light editor, blue keywords, green strings | navy editor, pastel tokens |
| IDE chrome (`--ide-chrome`, `--ide-panel`, `--ide-border`, `--ide-hover`) | warm greys | navy steps |

Components use tokens, never literal colours, except the brand marks and technology logos.
Light mode is designed on paper, not inverted from dark: warm neutrals, ink text, teal accent.
The primary button is solid navy on light and solid mint on dark (no gradients).

## Typography

- **Fraunces**: display and section headings only (page titles, course and project names).
- **Instrument Sans**: all interface and reading text, labels in small caps with letter spacing.
- **JetBrains Mono**: code, console output, counts that line up (`tabular-nums`).

## Shape and space

Radii `--r-sm` 6 px (controls), `--r-md` 10 px (panels), `--r-lg` 14 px (feature surfaces).
Prefer rules and whitespace to boxes: lists, tables and editorial columns before cards.
Shadows only on raised, interactive surfaces (`--raised-shadow`).

## Technology logos (`src/components/TechLogo.tsx`)

Paths from [Simple Icons](https://simpleicons.org) 16.38.1 (the project is CC0-1.0; individual
marks keep their owners' terms), bundled locally. They are used only to refer to the technology
each course teaches.

| Course | Mark | Source and terms |
|---|---|---|
| Python | Python logo | python.org/community/logos; PSF trademark usage policy (referential use) |
| Rust | Rust logo | rust-lang.org media guide; CC BY-SA 4.0 (licence recorded by Simple Icons); referential use under the Rust Foundation trademark policy |
| Git | Git logo | git-scm.com/community/logos, by Jason Long, CC BY 3.0 |
| Linux | Tux silhouette | linuxfoundation.org/the-linux-mark; Linux is a trademark of Linus Torvalds |
| C | C language logo | Wikimedia Commons "The C Programming Language logo"; no licence recorded by Simple Icons |
| Java | OpenJDK "Duke" | OpenJDK duke repository, BSD-3-Clause. The Java coffee-cup logo is an Oracle trademark and is not used |
| JavaScript | JS logo | github.com/voodootikigod/logo.js, MIT |
| SQL | original glyph | SQL has no single official logo; a database cylinder with a check |
| DSA | original glyph | a small rooted tree; not a brand |

Brand colours are kept where they read on both themes; monochrome marks (Rust, Linux, Duke)
follow the ink colour, and the C mark darkens on light backgrounds for contrast.
