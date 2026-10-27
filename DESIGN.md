---
name: kitras.dev
description: The personal academic site of Christopher Kitras, played straight at Distill's rigor, where each piece of work explains itself twice with live figures.
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
  paper: "oklch(0.99 0 0)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.75rem, 1.9rem + 4vw, 5.25rem)"
    fontWeight: 640
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.8vw, 3rem)"
    fontWeight: 620
    lineHeight: 1.15
    letterSpacing: "-0.03em"
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
  prose:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.68
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(0.82rem, 0.8rem + 0.1vw, 0.875rem)"
    fontWeight: 500
    lineHeight: 1.5
  button:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(0.82rem, 0.8rem + 0.1vw, 0.875rem)"
    fontWeight: 560
  result:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.5rem, 1.32rem + 0.8vw, 1.9rem)"
    fontWeight: 620
    letterSpacing: "-0.02em"
    fontFeature: '"tnum"'
  data:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8rem"
    fontWeight: 450
    lineHeight: 1.6
rounded:
  radius: "6px"
  tight: "4px"
  pill: "999px"
  circle: "50%"
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
  measure: "40rem"
  header-h: "3.75rem"
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
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.radius}"
    size: "2.25rem"
  icon-button-hover:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink}"
  nav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0.75rem"
  nav-link-hover:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink}"
  subnav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  subnav-link-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.1em 0.55em"
  badge-first:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "0.1em 0.55em"
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
  figure-frame:
    backgroundColor: "{colors.bg-sunk}"
    rounded: "{rounded.radius}"
  figure-frame-paper:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.radius}"
  work-thumb:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.tight}"
    padding: "4px"
  citation:
    backgroundColor: "{colors.bg-sunk}"
    textColor: "{colors.ink-2}"
    typography: "{typography.data}"
    rounded: "{rounded.radius}"
    padding: "1rem"
  equation:
    backgroundColor: "{colors.bg-sunk}"
    typography: "{typography.prose}"
    rounded: "{rounded.radius}"
    padding: "1rem 1.5rem"
  inline-code:
    backgroundColor: "{colors.bg-sunk}"
    typography: "{typography.data}"
    rounded: "{rounded.tight}"
    padding: "0.05em 0.3em"
---

# Design System: kitras.dev

## Overview

**Creative North Star: "The Canon, Played Straight"**

This is the academic personal site done the way the best of the category does it, without a gimmick. Distill supplies the reading discipline: a serif reading column, margin notes, live figures that carry the argument. Josh Montierth's site supplies the finish: tight sans headings, hairline structure, nothing ornamental. The work is the interest. No theme ties unrelated papers together; a radon study and a stadium Wi-Fi paper share a frame, a type system and a figure runtime, and nothing else.

The surface is quiet so the figures can be loud. Tinted cool neutrals carry everything, one cobalt accent marks what you can act on, and one warm orange appears only inside figures as the second actor in an explanation. Density is moderate: generous vertical rhythm between sections (4.5rem), tight horizontal rows inside them, every list a stack of hairline-divided rows. The site is flat. There are no shadows and no cards; depth comes from a sunk fill and 1px lines.

Every work page reads at two depths: a three-item short version anyone can follow, then the full mechanism in serif prose with live canvas figures. The visual system serves that structure, and it is identical for every paper, poster and project.

**Key Characteristics:**
- Cool tinted neutrals (hue 250 to 258) in OKLCH, with full light and dark sets on the same token names.
- One cobalt accent for action and current state; one orange reserved for the second signal inside figures.
- Geist for interface and headings, Source Serif 4 for explainer prose, Geist Mono for data and code only.
- Hairline rows instead of cards; zero shadows.
- Live canvas figures that read their colors from the CSS tokens, autoplay with pause and replay, and fall back to a still frame under reduced motion.

## Colors

A cool-neutral palette with a single cobalt voice and a reserved warm signal; every value is OKLCH and every token has a dark counterpart under the same name.

### Primary
- **Cobalt** (`accent`): links, the primary button (CV on the home page, "Read the paper" on a work page), the email button in the header, the current-page underline in the main nav, the active line in the table of contents, focus outlines, text selection, range inputs, the short-version labels, and the first actor inside a figure (the phone in LaMDA's latency check). Dark mode lifts it to oklch(0.74 0.13 256).
- **Cobalt Ink** (`accent-ink`): text on a cobalt fill. Near-white in light mode, deep navy oklch(0.18 0.02 258) in dark.
- **Cobalt Wash** (`accent-soft`): the active pill in the sticky sub-nav and the "First author" badge fill. Dark: oklch(0.27 0.05 258).

### Secondary
- **Second Signal Orange** (`signal`): the second actor inside a live figure (the sensor next to the phone, the relayed path next to the direct one), and the "Illustrative." marker that opens the caption of any figure drawn from synthetic data. Dark: oklch(0.76 0.15 58).
- **Signal Wash** (`signal-soft`): a soft fill behind signal-colored marks inside figures. Dark: oklch(0.3 0.05 58).

### Tertiary
- **Verdict Green** (`good`) and **Verdict Red** (`bad`): pass and fail states inside figures only (registration accepted or rejected, a threshold met or missed). Dark: oklch(0.74 0.13 155) and oklch(0.7 0.16 25).
- **Award Gold** (`award`): the award badge text and its tinted border and fill, for the verified Best Poster awards. Nowhere else. Dark: oklch(0.8 0.12 88).

### Neutral
- **Cool Paper** (`bg`): the page. Dark: oklch(0.175 0.012 258).
- **Sunk Paper** (`bg-sunk`): figure frames, citation and equation blocks, inline code, the portrait placeholder, and hover fills on buttons and nav links. Dark: oklch(0.205 0.013 258).
- **Ink** (`ink`): headings, body text, row titles. Dark: oklch(0.94 0.006 250).
- **Ink Two** (`ink-2`): secondary text: summaries, ledes, role line, nav links at rest, venues. Dark: oklch(0.77 0.012 252).
- **Ink Three** (`ink-3`): tertiary text: years, author lists, captions, margin notes, breadcrumbs, table headers. Dark: oklch(0.64 0.014 252).
- **Hairline** (`line`): every row divider, section rule, frame border and table rule. Dark: oklch(0.29 0.014 258).
- **Strong Hairline** (`line-strong`): secondary button borders, table header rules, blockquote rules, links drawn inside figures. Dark: oklch(0.38 0.016 258).
- **Print White** (`paper`): the backing behind raster figures and publication thumbnails, in both modes.

### Named Rules
**The Second Signal Rule.** Orange (`signal`) lives inside figures, as the second thing being compared, and in the "Illustrative." caption marker. It never colors a button, link, heading, badge or rule on the page itself.

**The One Cobalt Rule.** Cobalt means "act here" or "you are here". If an element is neither clickable nor a current-state indicator, and it is not the first actor in a figure, it is not cobalt.

**The Shared Ink Rule.** Figures never hard-code a color. The figure kit reads `--bg` through `--bad` from the root and redraws on theme change, so a canvas always matches the page in both modes.

**The Print White Rule.** Raster figures and thumbnails were drawn for white paper; they sit on `paper` in dark mode too, framed by a hairline, rather than being inverted or filtered.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Source Serif 4 (with Iowan Old Style, Georgia) for explainer prose; Geist for everything else
**Label/Mono Font:** Geist Mono (with ui-monospace, SF Mono, Menlo)

**Character:** A crisp, slightly condensed-feeling grotesque at heavy-but-not-black weights (600 to 640) with tight negative tracking, against a calm optical-size serif for long reading. The sans does the scanning; the serif does the explaining.

### Hierarchy
- **Display** (640, step 4, 0.98): the name in the home hero; the page titles on Research and Projects use the same size at 620. One per page.
- **Headline** (620, step 3, 1.15): the title of a work page and the footer's "Let's talk." line.
- **Title** (620, step 2, 1.15): section headings on index pages and h2 inside explainer prose (prose headings switch back to Geist).
- **Title Small** (600, step 1, 1.3): work-row titles, featured-work titles, research area names, prose h3.
- **Lede** (400, step 1, 1.5, `ink-2`): the hero statement, a work page's summary, index page introductions. Capped near 38 to 44rem.
- **Body** (400, step 0, 1.6): interface text, with Geist's `ss01` and `cv11` alternates on.
- **Prose** (Source Serif 4, 400, 1.1875rem, 1.68; 1.0625rem below 48rem): explainer paragraphs, held to the 40rem measure.
- **Label** (500, step -1): nav links, captions, meta lines, byline terms, breadcrumbs, table cells. Sentence case, no tracking.
- **Result** (620, step 2, tabular): the large numbers in a results strip, with their sentence-case description below.
- **Data** (Geist Mono, 450, 0.8rem): slider readouts, citation BibTeX (0.78rem), inline code, and numeric labels inside figures.

### Named Rules
**The Three Faces Rule.** Geist for interface and headings, Source Serif 4 only for explainer prose and equations, Geist Mono only for data, code and citations. A heading inside prose is still Geist.

**The Tabular Numbers Rule.** Years, dates, result figures and table columns use tabular numerals so they align down a column.

**The Legible Canvas Rule.** Text drawn inside a figure scales with the figure but never below 10.5px (11px in the compact home previews); on narrow screens the canvas grows taller rather than shrinking its labels.

## Layout

A single centered column capped at 72rem (`page`) plus fluid gutters of 1 to 2.5rem. Sections stack with 4.5rem of vertical padding and a hairline rule between them; the first section after the hero has no rule.

Three recurring grids carry most pages:
- **The hero**: text column plus a portrait column of 11 to 17rem, bottom-aligned. Below 48rem the portrait moves above the name as an 8rem circle.
- **The label column**: a 12rem left column for the short version's heading, the explainer's table of contents, and the CV's section names, with content to its right. It collapses to a single column below 64rem (short version, article) or 48rem (CV).
- **The work row**: year (4.5rem), content, thumbnail (9rem). Below 48rem the thumbnail drops and the row becomes one column.

The explainer is a three-track grid: sticky table of contents (12rem), the 40rem prose measure, and an open right margin. At 72rem and wider, margin notes (`aside`) leave the column and sit in that right margin, and wide figures bleed 14rem into it. Below 64rem the table of contents is hidden and the prose takes the full column; below 48rem margin notes sit inline behind a left hairline.

The header is sticky at 3.75rem (3.5rem on phones) and translucent over the page. Index pages add a second sticky sub-nav directly below it for in-page jumps.

Spacing follows the `space-1` to `space-9` scale, roughly 1.5x per step above 1rem. Row-internal gaps sit at 0.5 to 0.75rem; row padding at 1.5rem; between-section padding at 4.5rem.

### Named Rules
**The Hairline Row Rule.** Lists of work, artifacts, research-area entries and CV blocks are rows separated by a 1px `line` top border, with a bottom border on the last row. The padding on these rows sits against a divider, not inside a container; a "cramped padding" flag on a hairline row is a false positive.

**The Margin Note Rule.** Asides are side comments, not callouts. They go in the right margin on wide screens and inline with a left hairline on narrow ones, in Geist at label size and `ink-3`.

## Elevation & Depth

The system is flat. There is no `box-shadow` anywhere in the build. Depth comes from three things only: the `bg-sunk` fill that sets figures, citations and equations slightly below the page; 1px hairlines in two strengths; and the sticky header and sub-nav, which sit over scrolling content as translucent bars (88 to 92% of `bg` with a 10 to 12px backdrop blur) above a hairline.

### Named Rules
**The Zero Shadow Rule.** Nothing casts a shadow. If an element needs to separate from the page, it gets a hairline or the sunk fill. The direction contract allows a shadow for menus; the build has no menus, so none is defined yet.

## Shapes

Gently rounded, never soft. The house radius is 6px (`radius`) for buttons, icon buttons, figure frames, the portrait, citation and equation blocks. Smaller insets use 4px (`tight`): thumbnails and inline code. Pills (`pill`, 999px) are reserved for small inline tokens: badges, skill chips and sub-nav links. The only circle is the portrait on phones.

Borders are always 1px. A figure frame and its controls bar read as one object: the frame has rounded top corners and the bar beneath it has rounded bottom corners and no top border. The active nav indicator is a 2px cobalt bar with 2px radius, 0.55rem below the link.

Icons are inline stroke SVGs on a 24px grid with a 1.75 stroke and round caps and joins (Lucide geometry), sized to 1 to 1.05rem beside text.

## Components

### Buttons
Quiet, outlined, functional; one filled button per group at most.
- **Shape:** gently rounded (6px), 2.5rem tall, or 2.1rem for the small variant.
- **Primary:** cobalt fill with cobalt-ink text, label-size Geist at 560, 0 1rem padding, a leading 1rem icon. Used for the single most important action in a group: CV in the hero, "Read the paper" on a work page, Email in the header.
- **Secondary:** transparent with a `line-strong` border and `ink` text. Resume, email address, code, slides, demo links.
- **Hover / Focus:** secondary fills with `bg-sunk` and its border darkens to `ink-3`; primary mixes 12% ink into the cobalt. 160ms transitions on the house ease-out. Pressing nudges the button down 1px. Focus is a 2px cobalt outline 3px out.
- **Icon button:** 2.25rem square, hairline border, `ink-2` icon; used for the three-state theme toggle (system, light, dark).

### Chips
- **Badges:** small pills at 0.78rem and 600 weight. Neutral by default; "First author" in cobalt on the cobalt wash; awards in gold with a gold-tinted border and a 10% gold fill, led by the award icon.
- **Skill chips:** hairline-bordered pills in `ink-2` at label size, wrapped in a flex row.

### Cards / Containers
There are no cards. Grouping is done with hairline rows and whitespace. The bordered or filled boxes that do exist frame an artifact, not a layout group: figure frames, publication thumbnails, the citation block, equations and inline code.
- **Corner Style:** 6px, or 4px for thumbnails and inline code.
- **Background:** `bg-sunk`, or `paper` behind raster images.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px `line`.
- **Internal Padding:** 1rem for citations; 1rem by 1.5rem for equations; 4px inside thumbnails.

### Inputs / Fields
The only inputs are figure controls: range sliders tinted with `accent-color: accent`, 9rem wide, each with an inline label and a Geist Mono readout in `ink`; and small secondary buttons added by a figure for state toggles ("Relay the sensor through a proxy"). They sit in the controls bar under the figure, at label size in `ink-2`.

### Navigation
- **Main nav:** three label-size links (Research, Projects, CV) centered in the header, `ink-2` at rest, `ink` on a `bg-sunk` fill on hover, and the current section marked by `ink` text plus a 2px cobalt underline bar. On phones the name collapses to "CK" and the email button to its icon.
- **Sub-nav:** a sticky, horizontally scrolling row of pill links under the header on index pages; the section in view gets the cobalt wash.
- **Table of contents:** a sticky list behind a left hairline in the explainer's label column; the active heading's link takes `ink` and a cobalt left border.
- **Breadcrumbs and pager:** a breadcrumb line above the work title (section link, then kind and year in `ink-3`), and a two-column Previous / Next pager at the foot with the label in `ink-3` above the title.

### Live Figure
The signature component. A canvas inside a hairline frame on `bg-sunk`, with a controls bar beneath holding any sliders or toggles on the left and pause/play and replay icon buttons (2.1rem) on the right, then a caption in `ink-3` at label size with a bold lead sentence in `ink-2`. Figures built on synthetic data open their caption with "Illustrative." in `signal` at 600.
- **Runtime:** each figure is one file registered with the shared kit; every tunable number lives in its `config` block. The kit sizes the canvas for HiDPI, reads theme colors, runs only while on screen, and honours a global speed multiplier.
- **Motion:** full figures autoplay with pause and replay. Home-page previews rest on their key frame and play only while hovered or focused. Under reduced motion, every figure shows a single still at `config.stillAt`.
- **Color:** `accent` for the first actor, `signal` for the second, `good` and `bad` for verdicts, `line` and `line-strong` for structure, `ink` to `ink-3` for labels.

### Short Version
Three items in a row beside a 12rem heading ("The short version" with a one-line `ink-3` subtitle). Each item opens with its sentence-case label in cobalt at label size and 600 weight ("The problem", "The idea", "The result"), then one body-size sentence. It sits between hairlines directly below the work header.

### Work Row
Year in `ink-3` tabular numerals; title-small heading in `ink` that turns cobalt on hover; summary in `ink-2`; author list in `ink-3` with Christopher's name bolded in `ink`; a venue line with the venue in `ink-2` at 560, any badges, and text links (Explainer, PDF, slides, code) in `ink-3` that turn cobalt on hover; a 4:3 thumbnail on print white at the right. Ongoing work uses the same row without links or thumbnail.

### Results Strip
A row of key numbers between two hairlines inside explainer prose: each number at the result style, with its plain-language description below in `ink-2` at label size. Only numbers that came from the paper.

## Do's and Don'ts

### Do:
- **Do** take every color from the tokens on `:root` (`var(--accent)`, `f.c.signal` in figures) so light and dark both work without extra rules.
- **Do** build lists as hairline rows: 1px `line` top border, 1.5rem block padding, bottom border on the last row.
- **Do** set explainer prose in Source Serif 4 at the 40rem measure and keep every heading, caption and label in Geist.
- **Do** give every new work page the same structure: header with byline and links, the three-item short version, then prose with live figures, materials and citation.
- **Do** put a figure's tunables in its `config` block, set a meaningful `stillAt`, and mark synthetic-data figures `illustrative=true`.
- **Do** use one primary (cobalt) button per action group and outline the rest.
- **Do** use the house ease-out (cubic-bezier(0.16, 1, 0.3, 1)) at 160ms for state changes, and keep the 700ms rise-in as the site's one authored entrance.

### Don't:
- **Don't** use `signal` orange outside a figure, except for the "Illustrative." caption marker.
- **Don't** add eyebrows or kickers: no small category label above a section or page heading. Breadcrumbs and the pager's Previous / Next are navigation, not kickers.
- **Don't** use cards as structure; borders and fills frame artifacts (figures, thumbnails, citations, equations), never groups of content.
- **Don't** add shadows of any kind.
- **Don't** tie the work together with a themed visual concept (sensor maps, route maps, instrument dials); each piece stands on its own in the shared frame.
- **Don't** autoplay home-page previews; they move only on hover or focus.
- **Don't** set uppercase or letter-spaced labels; all labels are sentence case at normal tracking.
- **Don't** hard-code colors or fonts inside a figure; use `f.c`, `f.font()` and `f.mono()`.
