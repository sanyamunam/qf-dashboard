# The Quarterly Brief — redesign

Approved 15 Aug 2026. Supersedes the four-block memo of 14 Aug. A rebuild from
the question, not a polish pass.

## Why the last one failed

It was a competent dashboard: ten cards in four numbered blocks, each with a
kicker, a headline, a chart, a trace and a paragraph. Every finding weighed the
same, so nothing led. It took work to find the point, and nothing about it was
made for four specific people. The redesign fixes both by refusing to treat
findings as equals.

## What it is now: The Two Findings

The quarter stated as **two facts, one from each source** — the largest
verified movement across QF's executive indicators (Release 1) and the largest
across the thematic areas (Release 2) — each given a full-bleed moment. All
other findings live in a quiet ledger beneath the hero of their source. Then
three asks. One scroll, under two minutes.

## The four directions considered

| | What it is | CEO takeaway | Why rejected |
|---|---|---|---|
| A · The Letter | Continuous addressed prose from BOTaina, charts inline | She's read an opinion | Prose hides structure; "well / watch" must be excavated; eight charts in a letter isn't a letter |
| B · The Front Page | Headline + image above the fold, two source columns below | The quarter at a glance | Two-column density collapses on a phone; the format wants more stories, the brief wants fewer |
| C · Ten Sentences | Ten sentences and a figure each, everything else behind a tap | Ten true things | Wins comprehension, fails uplift; it's a notification, not a flagship; violates "charts stay" |
| **D · The Two Findings** | Two full-bleed moments + a ledger + asks | The two things that mattered, and that the rest is there | **Chosen** — the only one passing both tests at once |

## Selection logic

- **Heroes** are chosen by magnitude of real movement in their source, regardless
  of direction. This quarter that gives two falls: EC footfall (Release 1, row
  56: 237,801 → 36,546, −85% in one month) and WISH beneficiaries (Release 2:
  23,150 peak → 900). Honesty over balance — promoting a lesser "well" finding
  to hero for optics would be lying with layout.
- **Ledger** carries the remaining eight, four per source, interleaved well/watch
  and marked with a glyph and a word — never a section header. Same verified
  set as before; no new figures.
- Release 1 and Release 2 never cross: each has its own hero and its own ledger.

## Layout

```
masthead    The Quarterly Brief · Q1 2026 · date            Open dashboard

HERO 1      [source: Executive View · Release 1]
            Education City's footfall fell 85% in March.
            [ large BriefTrend, Jan/Feb/Mar, sidra hue ]
            trace line
            ✎ Two strong months, then a cliff… — BOTaina (italic meaning line)

LEDGER 1    Executive View · four rows
            ● went well   sentence …                       [small mark]
            ○ to watch    sentence …                       [small mark]

HERO 2      [source: Social Progress · Release 2]  (theme hue)
            WISH reached 900 people. Three years ago, 23,150.
            [ large BriefTrend, 2022 → Q1 26, target line, theme hue ]
            trace line
            ✎ … — BOTaina

LEDGER 2    Thematic areas · four rows (each mark in its theme's hue)

ASKS        three lines, each the control → BOTaina, owner named
CLOSE       one accounting sentence · BOTaina sign-off · Open the dashboard
```

## Visual rules

- **Two hero moments** carry the uplift: serif finding at 40–52px, one chart big
  enough to read as an image (~260px), macro whitespace around them. Nothing
  else on the page competes.
- **The ledger** is a single-column register: glyph + word (● went well / ○ to
  watch), one serif sentence, one small mark at right, a trace line. No cards,
  no borders, no numbered eyebrows, no side-stripes. Rows are separated by
  whitespace and hairlines.
- **Colour carries source.** Thematic hero and thematic ledger marks take their
  theme's `fill`; executive takes sidra. No coloured spine anywhere.
- **BOTaina** appears exactly three times: the italic meaning line under each
  hero, and the sign-off. No greeting, no avatar at the top.
- **Charts** reuse `BriefTrend` / `BriefLedger` / `BriefFigures` from
  `briefCharts.tsx` — the last build's one lasting contribution. Hero uses a
  taller `BriefTrend`; ledger uses the existing small sizes.
- **Motion:** each hero's chart draws once on entering view; ledger rows settle
  in with a short stagger (40ms). Nothing else. Reduced-motion → instant.
- **Glass:** none. The masthead is a plain cream bar with a hairline.

## Copy

- Every sentence through `humanizer` before shipping.
- Ledger sentences ≤ 16 words; meaning lines ≤ 20; the two hero findings ≤ 12.
- Trace lines verbatim numbers only.

## Plumbing

- `src/briefing/quarterly.ts` — restructure the data shape to `{hero, ledger}`
  per source; content unchanged, verified figures unchanged.
- `src/briefing/QuarterlyBrief.tsx` — rewrite the layout; keep masthead, Esc,
  read-flag, ask→BOTaina handoff, trace→drawer.
- `src/briefing/briefCharts.tsx` — `BriefTrend` gains a `size: 'hero' | 'row'`.
- Nothing else changes: lamp, App wiring, tokens, dashboard screens.

## Verify

1. Read once at normal speed — nothing needs a second pass.
2. Under two minutes, timed by word count and scroll length.
3. Every figure traces to a cell; Release 1 / Release 2 never cross.
4. Beside an excellent executive report, it holds up (self-critique recorded).
5. Every chart reads in ~1s, no legends.
6. Platform components, colours, voice only.
7. Every AI sentence humanized.
8. The four directions and the choice are in this document.
