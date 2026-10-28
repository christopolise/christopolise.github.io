---
name: kitras.dev
description: The one-page academic site of Christopher Kitras, played straight, where every piece of work is a row with a live figure that opens in place.
colors:
  bg: "oklch(0.988 0.003 250)"
  bg-sunk: "oklch(0.965 0.005 250)"
  ink: "oklch(0.23 0.02 258)"
  ink-2: "oklch(0.43 0.018 258)"
  ink-3: "oklch(0.56 0.014 258)"
  line: "oklch(0.9 0.006 255)"
  line-strong: "oklch(0.8 0.01 255)"
  accent: "oklch(0.5 0.17 258)"
  accent-ink: "oklch(0.99 0 0)"
  accent-soft: "oklch(0.94 0.03 258)"
  signal: "oklch(0.64 0.17 48)"
  signal-soft: "oklch(0.95 0.035 60)"
  good: "oklch(0.56 0.13 155)"
  bad: "oklch(0.56 0.18 25)"
  award: "oklch(0.6 0.12 85)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.75rem, 1.9rem + 4vw, 5.25rem)"
    fontWeight: 620
    lineHeight: 1
    letterSpacing: "-0.035em"
  hero-name:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.2vw, 2.5rem)"
    fontWeight: 620
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.5rem, 1.32rem + 0.8vw, 1.9rem)"
    fontWeight: 620
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.2rem, 1.12rem + 0.35vw, 1.375rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.2rem, 1.12rem + 0.35vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1rem, 0.97rem + 0.15vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: '"ss01", "cv11"'
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(0.82rem, 0.8rem + 0.1vw, 0.875rem)"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(0.82rem, 0.8rem + 0.1vw, 0.875rem)"
    fontWeight: 560
  data:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8rem"
    fontWeight: 450
    lineHeight: 1.6
  course-code:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.85rem"
    fontWeight: 500
rounded:
  radius: "6px"
  tight: "4px"
  pill: "999px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  space-8: "4.5rem"
  space-9: "7rem"
  gutter: "clamp(1rem, 0.5rem + 2.5vw, 2.5rem)"
  page: "72rem"
  thumb: "13rem"
  thumb-phone: "7rem"
  row-label: "9rem"
  cv-label: "12rem"
  text-measure: "46rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, var(--accent) 88%, var(--ink))"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 1rem"
    height: "2.5rem"
  button-secondary-hover:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink}"
  button-small:
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0 0.75rem"
    height: "2.1rem"
  icon-button:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.radius}"
    size: "2.25rem"
  icon-button-hover:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink}"
  figure-control:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.radius}"
    size: "2.1rem"
  home-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
  home-link-hover:
    textColor: "{colors.ink}"
  panel-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.button}"
    padding: "0"
  badge-award:
    backgroundColor: "color-mix(in oklch, var(--award) 10%, transparent)"
    textColor: "{colors.award}"
    rounded: "{rounded.pill}"
    padding: "0.1em 0.55em"
  skill-chip:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.2em 0.7em"
  work-thumb:
    backgroundColor: "{colors.bg-sunk}"
    rounded: "{rounded.radius}"
    width: "{spacing.thumb}"
  figure-frame:
    backgroundColor: "{colors.bg-sunk}"
    rounded: "{rounded.radius}"
  inline-code:
    backgroundColor: "{colors.bg-sunk}"
    typography: "{typography.data}"
    rounded: "{rounded.tight}"
    padding: "0.05em 0.3em"
---

# Design System: kitras.dev

## Overview

**Creative North Star: "The Canon, Played Straight"**

This is the academic personal site done the way the best of the category does it, without a gimmick. The original kitras.dev and Philip Lundrigan's page supply the structure: one page, a portrait beside the name, then plain titled sections of work and history. Distill supplies the one thing that sets the work apart: a live figure that carries each paper's mechanism. Josh Montierth's site supplies the finish: tight sans headings, hairline structure, nothing ornamental. The work is the interest. No theme ties unrelated papers together; a radon study and a stadium Wi-Fi paper share a row format, a type system and a figure runtime, and nothing else.

The surface is quiet so the figures can be loud. Tinted cool neutrals carry everything, one cobalt accent marks what you can act on, and one warm orange appears only inside figures as the second actor in an explanation. There is no chrome: no top bar, no navigation, just a theme toggle in the corner. Density is moderate and scannable: each section is a heading with a trailing hairline over a stack of hairline-divided rows. The site is flat. There are no shadows and no cards; depth comes from a sunk fill and 1px lines.

Every work reads at two depths without leaving the page: the row (a still figure thumbnail, citation, venue, links) is the skim, and "Abstract" or "Summary" opens the verbatim text and the full, playing figure in place for the careful read.

**Key Characteristics:**
- Cool tinted neutrals (hue 250 to 258) in OKLCH, with full light and dark sets on the same token names.
- One cobalt accent for action and current state; one orange reserved for the second signal inside figures.
- Geist for everything, Geist Mono for data and course codes only.
- Hairline rows instead of cards; zero shadows; no sticky or translucent chrome.
- Live canvas figures that read their colors from the CSS tokens: still thumbnails that move only on hover or focus, full figures that autoplay with pause and replay once opened, and a single still frame under reduced motion.

## Colors

A cool-neutral palette with a single cobalt voice and a reserved warm signal; every value is OKLCH and every token has a dark counterpart under the same name.

### Primary
- **Cobalt** (`accent`): links, the "Abstract ▾" / "Summary ▾" toggles and every other link in a work row, the contact list on hover, the primary button (the CV PDF on the CV page), focus outlines, text selection, range inputs, and the first actor inside a figure. Dark mode lifts it to oklch(0.74 0.13 256).
- **Cobalt Ink** (`accent-ink`): text on a cobalt fill and on text selection. Near-white in light mode, deep navy oklch(0.18 0.02 258) in dark.
- **Cobalt Wash** (`accent-soft`): a soft fill behind cobalt marks inside figures (exposed to the kit as `f.c.accentSoft`). Dark: oklch(0.27 0.05 258).

### Secondary
- **Second Signal Orange** (`signal`): the second actor inside a live figure (the sensor next to the phone, the relayed path next to the direct one), and the "Illustrative." marker that opens the caption of any figure drawn from synthetic data. Dark: oklch(0.76 0.15 58).
- **Signal Wash** (`signal-soft`): a soft fill behind signal-colored marks inside figures. Dark: oklch(0.3 0.05 58).

### Tertiary
- **Verdict Green** (`good`) and **Verdict Red** (`bad`): pass and fail states inside figures only (registration accepted or rejected, a threshold met or missed). Dark: oklch(0.74 0.13 155) and oklch(0.7 0.16 25).
- **Award Gold** (`award`): the award badge text, its 45% gold border and 10% gold fill, for the verified awards on a work's venue line and on the CV. Nowhere else. Dark: oklch(0.8 0.12 88).

### Neutral
- **Cool Paper** (`bg`): the page, and the solid fill behind the corner theme toggle so it stays legible over the hero. Dark: oklch(0.175 0.012 258).
- **Sunk Paper** (`bg-sunk`): figure frames and thumbnail frames, the portrait placeholder, inline code, the badge base, and hover fills on buttons, icon buttons and figure controls. Dark: oklch(0.205 0.013 258).
- **Ink** (`ink`): headings, the name, bio and abstract text, row titles, contact list labels, course codes, slider readouts, Christopher's bolded name in author lists. Dark: oklch(0.94 0.006 250).
- **Ink Two** (`ink-2`): secondary text: the role line, author lists, row descriptions, the CV statement, the home link and figure controls at rest, a caption's bold lead, footer links, skill chips. Dark: oklch(0.77 0.012 252).
- **Ink Three** (`ink-3`): tertiary text: venue lines, dates in compact rows and on the CV, captions, ongoing-work status, footer text, contact icons at rest. Dark: oklch(0.64 0.014 252).
- **Hairline** (`line`): every row divider, the trailing rule on section heads, the footer rule, frame borders, icon-button and figure-control borders, badge and chip borders. Dark: oklch(0.29 0.014 258).
- **Strong Hairline** (`line-strong`): secondary button borders, the hover border on icon buttons, figure controls and thumbnails, the border of an opened row's thumbnail, the scrollbar thumb, structure drawn inside figures. Dark: oklch(0.38 0.016 258).

### Named Rules
**The Second Signal Rule.** Orange (`signal`) lives inside figures, as the second thing being compared, and in the "Illustrative." caption marker. It never colors a button, link, heading, badge or rule on the page itself.

**The One Cobalt Rule.** Cobalt means "act here" or "you are here". If an element is neither clickable nor a current-state indicator, and it is not the first actor in a figure, it is not cobalt.

**The Shared Ink Rule.** Figures never hard-code a color. The figure kit reads `--bg` through `--bad` from the root (as `f.c`) and redraws on theme change, so a canvas always matches the page in both modes.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (with ui-monospace, SF Mono, Menlo)

**Character:** A crisp grotesque at heavy-but-not-black weights (600 to 620) with tight negative tracking on headings, and the same face at 400 for reading, with Geist's `ss01` and `cv11` alternates on throughout. One family does the scanning and the reading; the mono appears only where a number or a code needs to align.

### Hierarchy
- **Display** (620, step 4, 1, -0.035em): the CV page title (and the 404 title). Never on the home page.
- **Hero Name** (620, 1.75 to 2.5rem, 1.1, -0.025em): the name in the home hero, the largest type on the home page.
- **Title** (620, step 2, 1.15, -0.02em): home section heads, each followed by its trailing hairline.
- **Title Small** (600, step 1, 1.3): work-row titles (step 0 below 48rem) and the CV's section names.
- **Lede** (400, step 1, 1.5, `ink-2`): the CV page's statement beside its title.
- **Body** (400, step 0, 1.6): the bio (capped at 44rem), abstracts and summaries in an opened row (1.65, capped at 46rem), and compact-row titles at 600.
- **Label** (400 to 560, step -1, 1.5): author lists, venue lines, row links, compact-row descriptions and dates, captions, the contact list, the home link, figure controls, skill chips, the footer. Sentence case, no tracking.
- **Button** (560, step -1): buttons, the panel toggle, the home link.
- **Data** (Geist Mono, 450, 0.8rem): slider readouts and numeric labels inside figures (`f.mono()`).
- **Course Code** (Geist Mono, 500, 0.85rem, `ink`): the course number in the label column of a teaching row.

### Named Rules
**The Two Faces Rule.** Geist for every heading, label and paragraph; Geist Mono only for data, course codes and inline code. No serif and no third face.

**The Tabular Numbers Rule.** Dates in compact rows and on the CV, and numbers in figures, use tabular numerals so they align down a column.

**The Legible Canvas Rule.** Text drawn inside a figure never goes below 10.5px in the figure's own coordinates, and on screens narrower than 480px a full figure grows taller rather than shrinking its labels. Thumbnails lay out at a fixed 520px width and are scaled down whole, as a picture; the readable figure is the one in the opened panel.

## Layout

A single centered column capped at 72rem (`page`) plus fluid gutters of 1 to 2.5rem. The home page is one long scroll in a fixed order: hero, Research, Publications, Posters, Projects, Ongoing work, Experience and education, Teaching, Awards and skills, footer. Sections carry 2rem of block padding and are separated by their own heading rules rather than by full-width dividers.

- **Corner:** the theme toggle sits absolutely positioned 1rem from the top at the right edge of the column, and scrolls away with the page. On every page but home, a "← Christopher Kitras" link sits at the left of the same line.
- **Hero:** modelled on the original kitras.dev. A 4:5 portrait (9 to 12rem, `clamp(9rem, 14vw, 12rem)`) beside the name, the role line (capped at 40rem) and a two-column contact list (icon plus label: email, GitHub, LinkedIn, Google Scholar, CV, resume), with 3rem above and 1.5rem below. Below 48rem the portrait shrinks to 6.5rem and aligns to the top, the top padding grows to 4.5rem to clear the corner toggle, and the contact list becomes one column.
- **Work item:** a 13rem thumbnail column and the citation column, 1.5rem apart, with 1.5rem block padding. The opened panel sits under the citation column. Below 48rem the thumbnail column narrows to 7rem, titles drop to step 0, and the panel spans both columns.
- **Compact row:** a 9rem label column (a date or a course code) and content, 1rem apart, 0.75rem block padding. Below 48rem the label stacks above the content.
- **CV:** a two-column page head (title, then statement and download buttons; 7rem above) over a 12rem section-name column and content blocks. Both collapse to one column below 48rem.
- **Footer:** a hairline, 2rem of padding, contact and lab on the left, build and source on the right, wrapping on narrow screens.

Spacing follows the `space-1` to `space-9` scale, roughly 1.5x per step above 1rem. Row-internal gaps sit at 0.25 to 0.75rem; work-row padding at 1.5rem; compact-row padding at 0.75rem; section padding at 2rem. Long text (abstracts, captions) is capped at 46rem. The only breakpoint is 48rem.

### Named Rules
**The Hairline Row Rule.** Works, ongoing work, experience, teaching, awards and CV blocks are rows separated by a 1px `line` top border, with a bottom border on the last row. The padding on these rows sits against a divider, not inside a container; a "cramped padding" flag on a hairline row is a false positive.

**The Trailing Rule Rule.** A section head is the heading followed by a 1px `line` that runs to the column's edge on the same baseline. Nothing sits above it.

**The In-Place Rule.** Detail opens inside its row: the abstract or summary, then the full figure with its controls and caption, pushing the rows below down. No per-work pages, no modals, no drawers; a `/#slug` link opens that row on arrival.

## Elevation & Depth

The system is flat. There is no `box-shadow` and no translucency anywhere in the build, and nothing is sticky. Depth comes from two things only: the `bg-sunk` fill that sets figures and thumbnails slightly below the page, and 1px hairlines in two strengths. The corner theme toggle sits on a solid `bg` fill, not a blur.

### Named Rules
**The Zero Shadow Rule.** Nothing casts a shadow. If an element needs to separate from the page, it gets a hairline or the sunk fill.

## Shapes

Gently rounded, never soft. The house radius is 6px (`radius`) for buttons, icon buttons, figure controls, figure and thumbnail frames, and the portrait. Inline code uses 4px (`tight`). Pills (`pill`, 999px) are reserved for small inline tokens: award badges and skill chips. There are no circles; the portrait keeps the house radius at every width.

Borders are always 1px. A figure frame and its controls bar read as one object: the frame has rounded top corners and the bar beneath it has rounded bottom corners and no top border. A thumbnail is a single rounded frame with no bar.

Icons are inline stroke SVGs on a 24px grid with a 1.75 stroke and round caps and joins (Lucide geometry), sized to 1 to 1.05rem beside text and 0.85em inside badges.

## Components

### Buttons
Quiet, outlined, functional; one filled button per group at most. Buttons appear only on the CV page and inside opened figures; the home page acts through links.
- **Shape:** gently rounded (6px), 2.5rem tall, or 2.1rem for the small variant.
- **Primary:** cobalt fill with cobalt-ink text, label-size Geist at 560, 0 1rem padding, a leading 1rem icon. The CV PDF download.
- **Secondary:** transparent with a `line-strong` border and `ink` text. The one-page resume download.
- **Small:** the secondary style at 2.1rem with 0 0.75rem padding, added by a figure for a state toggle ("Relay the sensor through a proxy").
- **Hover / Focus:** secondary fills with `bg-sunk` and its border darkens to `ink-3`; primary mixes 12% ink into the cobalt. 160ms transitions on the house ease-out. Pressing nudges the button down 1px. Focus is a 2px cobalt outline 3px out.
- **Icon button:** 2.25rem square, hairline border, `ink-2` icon on a `bg` fill; the three-state theme toggle (system, light, dark) in the corner. Hover: `ink` icon, `line-strong` border, `bg-sunk` fill.

### Panel Toggle
"Abstract ▾" when the source has an abstract, "Summary ▾" when it does not. A bare text button in cobalt at 560 with a trailing 1em chevron that turns 180° over 200ms when open; underlined on hover. It leads the row's link line, and the thumbnail is a second control for the same panel.

### Chips
- **Award badge:** a small pill at 0.78rem and 600 weight in `award`, with a gold-tinted border and a 10% gold fill, led by the award icon, set after the venue.
- **Skill chips:** hairline-bordered pills in `ink-2` at label size, wrapped in a flex row (skills on home; skills and coursework on the CV).

### Cards / Containers
There are no cards. Grouping is done with section heads, hairline rows and whitespace. The bordered or filled boxes that do exist frame an artifact, not a layout group: figure frames, thumbnail frames and inline code.
- **Corner Style:** 6px, or 4px for inline code.
- **Background:** `bg-sunk`.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px `line`.

### Inputs / Fields
The only inputs are figure controls in an opened panel: range sliders tinted with `accent-color: accent`, 9rem wide, each with an inline label and a Geist Mono readout in `ink`; and small secondary buttons for state toggles. They sit at the left of the controls bar under the figure, at label size in `ink-2`.

### Navigation
There is no navigation bar, no sub-nav and no table of contents. The page is short enough to scroll, and every action is in the hero.
- **Corner:** the theme toggle at top right; on non-home pages a "← Christopher Kitras" home link at top left in `ink-2` at 560, turning `ink` on hover.
- **Contact list:** in the hero, each link an `ink-3` icon and an `ink` label without underline; both turn cobalt on hover.
- **Deep links:** `/#slug` scrolls to a work row and opens its panel; the CV links each publication and poster this way.
- **Skip link:** "Skip to content", off-screen until focused, then `bg` text on an `ink` fill in a 6px box at the top left.

### Work Item
The signature row. A 13rem thumbnail at left; at right, the title in `ink` at title-small, the author list in `ink-2` with Christopher's name bolded in `ink`, the venue in `ink-3` followed by any award badges, and a link line in cobalt: the panel toggle first, then Paper, DOI, slides, code, demo. The title is not a link.
- **Thumbnail:** a button framed in a 1px `line`, 6px radius, `bg-sunk` fill, holding a 4:3 live figure with no controls and no caption. Its canvas is laid out at a fixed 520px internal width and scaled down to fit, so its composition matches the full figure. It rests on the figure's key frame (`config.stillAt`) and plays only while its row is hovered or holds focus, stopping when the pointer or focus leaves. Hover and the open state darken the frame to `line-strong`.
- **Panel:** under the citation, the verbatim abstract (or the written summary) in `ink` body text at 1.65, capped at 46rem, then the full-size live figure with its controls and caption.

### Compact Row
For ongoing work, experience and education, teaching and awards. A 9rem label column holds the date in `ink-3` tabular numerals, or for teaching the course code in Geist Mono at 500 in `ink`. The content column holds a 600-weight body-size title and, where present, one label-size line in `ink-2` (place, role and term, or the ongoing project's description followed by its status in `ink-3`). No links, no thumbnails.

### Live Figure
A canvas inside a hairline frame on `bg-sunk`, with a controls bar beneath holding any sliders or toggles on the left and pause/play and replay buttons (2.1rem, hairline, `ink-2`) on the right, then a caption in `ink-3` at label size with a bold lead sentence in `ink-2`, capped at 46rem. Figures built on synthetic data open their caption with "Illustrative." in `signal` at 600.
- **Runtime:** each figure is one file registered with the shared kit; every tunable number lives in its `config` block. The kit sizes the canvas for HiDPI, reads theme colors, runs only while on screen, isolates a figure that throws so the rest still run, and honours a global speed multiplier. A figure in a closed panel is created when the panel first opens.
- **Motion:** the full figure autoplays once its panel is open and on screen, with pause and replay. Thumbnails never autoplay. Under reduced motion, every figure shows a single still at `config.stillAt` and hover does nothing.
- **Color:** `accent` for the first actor, `signal` for the second, `good` and `bad` for verdicts, `line` and `line-strong` for structure, `ink` to `ink-3` for labels, all through `f.c`. Text through `f.font()` and `f.mono()`.

## Do's and Don'ts

### Do:
- **Do** take every color from the tokens on `:root` (`var(--accent)`, `f.c.signal` in figures) so light and dark both work without extra rules.
- **Do** build lists as hairline rows: 1px `line` top border, 1.5rem block padding for works and 0.75rem for compact rows, bottom border on the last row.
- **Do** head every home section with a title-size heading and its trailing hairline, and nothing else.
- **Do** add a new work as one row: front matter with a live figure, the verbatim abstract (or a short summary when there is none), venue and links. Its detail opens in place.
- **Do** put a figure's tunables in its `config` block, set a meaningful `stillAt` (it is the thumbnail's resting frame), and mark synthetic-data figures `fig_illustrative: true`.
- **Do** use one primary (cobalt) button per action group and outline the rest.
- **Do** use the house ease-out (cubic-bezier(0.16, 1, 0.3, 1)) at 160ms for state changes.

### Don't:
- **Don't** use `signal` orange outside a figure, except for the "Illustrative." caption marker.
- **Don't** add eyebrows or kickers: no small category label above a section or page heading. The corner's "← Christopher Kitras" is navigation, not a kicker.
- **Don't** use cards as structure; borders and fills frame artifacts (figures, thumbnails, inline code), never groups of content.
- **Don't** add shadows of any kind.
- **Don't** tie the work together with a themed visual concept (sensor maps, route maps, instrument dials); each piece stands on its own in the shared frame.
- **Don't** autoplay thumbnails; they move only while their row is hovered or focused.
- **Don't** add a sticky header, nav bar, or per-work page; detail opens in the row.
- **Don't** set uppercase or letter-spaced labels; all labels are sentence case at normal tracking.
- **Don't** hard-code colors or fonts inside a figure; use `f.c`, `f.font()` and `f.mono()`.
