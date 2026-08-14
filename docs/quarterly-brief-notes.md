# The Quarterly Brief — decisions and exclusions

Replaces the per-visit daily brief entirely. Built 14 Aug 2026.

## Structure

Four blocks, fixed order, sources never mixed:

| # | Block | Source | Findings |
|---|-------|--------|----------|
| 01 | Executive View · what went well | Release 1 only | 2 |
| 02 | Executive View · what to watch | Release 1 only | 3 |
| 03 | Thematic areas · what went well | Release 2 only | 2 |
| 04 | Thematic areas · what to watch | Release 2 only | 3 |

Executive View leads because Release 1 is the more senior KPI set — QF's broader
operating base, not thematic. The two halves sit inside two "movements", each
headed with its own release and indicator count so the hierarchy is stated, not
implied.

Ten findings, not twelve: the "watch" blocks carry three each and the "well"
blocks two, because what needs a decision is worth more of a CEO's attention
than what is already working.

## Colour

Colour carries the source, so the two halves are told apart before a word is
read:

- **Thematic findings** take their own theme's colour — 3px spine, kicker, and
  chart hue all set from `themeById(...).fill`. The colour is what says which
  theme a finding belongs to; no label has to.
- **Executive findings** take no theme colour at all — sidra green charts, ink
  kickers, no spine (they keep the same 23px left inset so the text column
  never shifts between blocks).

## Charts

Three treatments, all reusing the L2 system (`AXIS`, `TOOLTIP`, `STATUS_COLOR`
imported directly from the existing chart modules):

- **BriefTrend** — short bar series, last bar at full colour and the rest at
  35%, optional dashed target line. 6 uses.
- **BriefLedger** — the R10 status-ledger rows: value against target on a
  track, lime only for genuinely met. 3 uses.
- **BriefFigures** — a plain figure table, used once, for the finding that is
  *about* the cells; a chart there would dress a measurement problem up as a
  result.

Release 2 findings could have used `snapshotFor` directly, but Release 1's
executive rows are a different type entirely (`ExecKpi`, with monthly columns
the thematic set has never had). One set of primitives taking plain numbers
keeps both halves visually identical; the reuse is of the treatment and the
shared theme rather than the data type.

Two collision fixes found in browser verification:
- the target-line label now sits in a reserved 112px right margin — labelled
  inside the plot it collided with whichever bar sat near it (695 at the right
  end, then 610 at the left);
- series longer than three points render at 194px rather than 156px, because
  WISH's 900-to-23,150 range crushed its small bars into the target line.

## What the data actually said

Three claims were checked and corrected before they shipped:

1. **"Four entities have gone quiet"** — cut entirely. All four
   (DIFI publications and revenue, Earthna publications, Policy Hub
   international engagements) are `IN_PROGRESS` with a Q1 zero, which under the
   platform's own rule means *not yet reported*, never *stopped*. The finding
   would have contradicted the product's core honesty rule.
2. **The unit problem is bigger than three rows.** Five executive indicators —
   Budget Variance, Employee Turnover, Qatarization, and both Diabetes outcome
   rows — change convention *between their own columns*: Qatarization stores
   0.26 for 2025 and 25 for Q1. The 2025 actual and the 2026 target agree with
   each other; the Q1 column is the outlier, so only that column is flagged.
3. **WISE is not a success story.** Five WISE indicators sit exactly on their
   full-year 2026 number at Q1 (27,375,000 of 27,375,000; 9 of 9; 7 of 7;
   8 of 8; 6 of 6). It appears in block 04, not 03 — celebrating the prize
   funding as a win in "what went well" while flagging it as suspect would have
   been incoherent.

## Named but not charted

- **Genomes Sequenced** — 38,683 against a 30,000 full-year target, but the
  sheet's own comment says it is reported cumulatively since 2022. Named in the
  accounting rather than counted as an overshoot.
- **Precision Health** — has no Release 2 indicators at all, so it cannot appear
  in blocks 03–04. Stated in the accounting so its absence is not read as an
  oversight. Blocks 03–04 cover Sustainability, Organizational Excellence,
  Social Progress, Artificial Intelligence and Progressive Education.

## Entry and state

The lamp is the only way in. `App.tsx` no longer auto-opens a brief after the
loader or on load; the `open-brief` event dispatched by the lamp is the single
entry point. State is one quarter-keyed flag, `almishkat.qbrief.2026q1` — lit
until first open, quiet after. The existing `lamp-catch` animation already
runs once and never loops, so a new quarter lights it with a single soft catch.

## Removed

`Briefing.tsx` (paced one-item-per-screen sequence, persona toggle),
`engine.ts` (lead rotation, `ledIds`, visit counts, continuity lines,
ask-topic memory — BotainaDock's `recordAskTopic` call went with it), and
`visuals.tsx` (the six bespoke briefing SVGs, replaced by the three
platform-consistent primitives).

## Reading time

310 words across the ten findings' headlines and meaning lines; ~460 including
the hook, asks and accounting. Trace lines (the verbatim cell references under
each chart) are scanned rather than read. Under two minutes standing up.

## Verified in browser

1. Four blocks, correct order, Executive View first ✓
2. Blocks 01–02 Release 1 only, 03–04 Release 2 only ✓
3. Every figure traced to a cell — asserted in `parse_release1.py`, checked
   against `kpis.json` for Release 2 ✓
4. All five thematic findings carry a themed spine (2.88px measured, exact
   theme fills); all five executive findings measure 0px ✓
5. 6 canvases + 3 ledgers + 1 table render on scroll ✓
6. One continuous scroll; the rail jumps but is never required ✓
7. Reading load 310 words of finding prose ✓
8. Lamp lit → open → quiet ("You're up to date"), no auto-open on load or
   reload; asks open BOTaina with the question loaded; Release 2 trace lines
   open the KPI drawer ✓
