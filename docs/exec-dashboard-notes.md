# The Executive Dashboard — build notes (25 Aug 2026)

Built on `origin/master` (6d04fcc) — the accepted design deployed at
qf-dashboard.pages.dev — verified by running it and matching the live UI
screenshot element for element before writing any code. **Localhost only
(:4189). Not deployed, not pushed.**

Source: `KPI Mapping - OBS merged 1 (1).xlsx` · `Actuals & Targets` →
`scripts/parse_obs.py` → `src/data/obs.json` (240 rows; the ten dashboard
KPIs read from the sheet's blue fill, never hard-coded).

## Brainstorm — what was rejected, and why

**Layout**
- *Rejected: pairing Graduates/Enrollments into shared cards.* The category
  tree IS the structure the brief makes navigable; pairing across
  sub-categories would hide it.
- *Rejected: per-KPI period fallback* (show whichever year has data). It puts
  a partial quarter beside a complete year on one screen and makes the four
  counts incoherent. One filter, one period, everything switches together.
- *Rejected: bespoke chart treatments per KPI.* The brief mandates the
  thematic listing card wholesale; `snapshotFor` already chooses a
  current-value mark where a real target exists and falls back honestly
  where none does.
- *Rejected: a new summary panel for the collapsed state.* Both states are
  the platform's own `ai-frame` surface — collapsed is a one-row variant,
  expanded is `AiRead` itself.
- *Rejected: status cards as links to the search page.* The brief wants them
  filtering the list below, in place, visibly and clearably.

**Search IA**
- *Rejected: Executive / Thematic tabs.* One question spans both dashboards;
  tabs split one answer into two lists. A dashboard facet does the job.
- *Rejected: the command-palette dropdown as the whole experience.* The ⌘K
  dropdown stays for quick picks; Enter hands the query to a full listing
  with facets, counts and chips.
- *Rejected: LLM round-trip for query parsing.* Deterministic interpretation
  over the sheet's own vocabulary is instant and shows the reader exactly how
  the question was understood — as removable chips.
- *Rejected: facets in dropdown menus.* A two-level tree with live counts
  needs a persistent rail beside the results it shapes.

## What was added (all additive — nothing restyled)

- `src/model/obs.ts` — workbook types, unit normalisation (a "Percentage"
  definition lifts stored values ≤ 1 ×100 — Budget Variance reads 10% → 18%,
  never 0.1 → 18), `obsAsKpi` adapter to the platform's Kpi shape.
- `src/model/dash.ts` — period model (2025 · full year / Q1 2026 · quarter),
  ONE `statusFor` (polarity-respecting; Monitoring = reading with no target)
  used by cards, counts, summary and search facet; the category tree parsed
  from the ` - ` delimiter with an explicit `Uncategorised`; per-period
  `cardKpi` (a missing reading yields an empty series — the not-reported
  treatment); NL interpretation → chips.
- `src/screens/Executive.tsx` — the dashboard (replaces the Standing-based
  Executive screen): collapsed-by-default AI Summary, four status cards,
  period toggle (ViewSwitcher's cream-pill pattern), tree sections with both
  levels routing to `#search?cat=`, `KpiCard` reused.
- `src/screens/Search.tsx` — all 240 rows; chips, BOTaina answer line, facet
  rail (dashboard / status / two-level category tree / entity / thematic
  area) with lifted counts; results as `KpiCard`; empty state names the
  filter to relax.
- `KpiCard` gained two optional props (`status`, `line`) and a `unit` suffix
  on figures; `Kpi` gained optional `unit`. Every existing caller unaffected.
- `snapshotFor`: a zero target is a REAL target when polarity is Red (Budget
  Variance's ceiling is 0); a Green zero target stays excluded (the cyclical
  off-year artifact).
- Header `GlobalSearch`: corpus extended to all 240 (151 thematic + 89
  Executive adapters); Enter and a footer row route to `#search?q=`.
- `App`: `#search` route; opening evidence from the Executive Dashboard or
  the search listing no longer navigates to the KPI's theme underneath.

## Verification (the brief's 19 checks) · headless, 1600×1050

1. **Ten KPIs from the fill** ✓ — 10 cards; parser reads the fill (either
   Dashboard or KPI Name cell carries it) and pins values, not the list.
2. **Entity + thematic area on every card** ✓ — identity block + theme chip;
   Total Policy Adoptions shows "Entity & thematic area unassigned".
3. **Tree parsed from ` - `** ✓ — Operational Excellence (2 of 9) and
   Education (5 of 43) as parents; Research (1 of 19), Policy Hub Insights
   (1 of 10), EC Community (1 of 7) standalone.
4. **Levels visibly distinct** ✓ — 20px semibold parents vs 10px label subs.
5. **Both levels route with visible, clearable filter** ✓ — Education → 43
   of 240 with chip; Higher Education Enrollments → 15.
6. **Facet supports both levels; parent includes children** ✓.
7. **Patents Granted – Other under Uncategorised** ✓ — never `None`.
8. **Year filter** ✓ — 2025 / Q1 2026, defaults Q1; counts flip
   1+2+5+2 ↔ 1+1+1+7.
9. **Period visibly labelled; Q1 labelled as a quarter** ✓.
10. **No borrowed figures** ✓ — Employed under Q1: "—", not-reported note.
11. **Units normalised** ✓ — 18% beside 2025's 10%; no 0.1→18 jump anywhere.
12. **Education per period** ✓ — 2025: 1,027 · 612 · 4,017 · 8,615 · 72%;
    Q1: not reported ×5.
13. **Policy Adoptions per period** ✓ — Q1: 2 (at risk vs 6); 2025: the one
    not-reported.
14. **Counts real, per period, summing** ✓ — printed arithmetic line.
15. **Budget Variance at risk** ✓ — Red polarity respected; charts against a
    zero-target tick, not the axis floor.
16. **Summary collapsed by default; named KPIs match the logic** ✓ —
    Qatarization (performing) and Budget Variance (at risk), same `statusFor`.
17. **Search reaches 240 with NL + facet counts** ✓ — "which KPIs are at
    risk" → 64; "what has no target" → 9; "education indicators" → 43.
18. **Indistinguishable beside Thematic View** ✓ — sxs-combo.png: same
    header, ai-frame, cards, chips, nav pill.
19. **Localhost only** ✓ — vite on :4189; no Cloudflare deploy, no push.

Zero console errors; `tsc` and the production build clean.

## Data requests for QF (also rendered on the page)

- Total Policy Adoptions: no entity, thematic area or framework — 12 of the
  89 Executive rows share the gap.
- Patents Granted – Other: no category (listed under Uncategorised).
- No Priority Initiatives category exists in the sheet.
- Three inverted Polarity rows outside the ten, asserted in the parser:
  Revenue Generated (Red), Employee Turnover (Green), Graduates Not Employed
  (Green).
- The brief counts 29 Q1 Executive actuals; the sheet holds 26 numeric ones
  (three are text notes).

---

# Trend charts for unjudgeable KPIs, and the category hierarchy (25 Aug 2026)

Localhost only (:4189). Not deployed.

## Part 1 — a KPI that cannot be scored is still a trajectory

The grey "no target on record" box is gone. Which mark a card draws is decided
once, in `markKindFor` (model/dash.ts), so the mark, the delta and the AI line
can never disagree:

| kind | when | mark |
|---|---|---|
| `judged` | a reading AND a target for the period | `SnapshotMark` (unchanged) |
| `trend` | 3+ completed annual readings | `TrajectoryMark` — the same area chart the theme cards use |
| `twoReadings` | 2 readings total | two separate reading tiles, **no shared axis** |
| `firstReading` | 1 reading ever | the value on a baseline rule |

**Rejected:** a two-point line (implies a trajectory that isn't there); a
brand-new chart component (the platform already had `TrajectoryMark`);
plotting the partial quarter as a hollow point on the annual axis — even
hollow, 486,119 beside 3,051,433 draws a cliff, and the quarter is already the
card's headline figure.

`TrajectoryMark` gained two opt-in props — `gradient` (soft vertical fade
under the line) and `labelFirst` (so both endpoints are direct-labelled).
Existing callers on the Thematic View are untouched.

**Only completed annual years are ever plotted**, most recent last, capped at
four. `TwoReadingsMark` deliberately gives each reading its own tile and its
own length of time ("twelve months" / "three months") rather than a common
baseline — at one scale 250 against 28 reads as an 89% collapse when it is
three months beside twelve.

**The delta now compares like with like** (`deltaFor`). A RATE holds its
meaning across period lengths, so Budget Variance at 18% this quarter against
10% for all of 2025 is a real widening. A COUNT does not, so a partial quarter
gets no arrow at all and reads "quarter to date" — which removes the false red
decline arrow that `Footfall – EC total` was showing on a KPI that has grown
every year on record.

**The AI line now says what the mark cannot.** A judged card gets the
historical band or the fact its target moved ("The commitment was 40% through
2024 before it was reset to 25%"); a trend card gets the governance reason no
verdict exists; a two-reading card gets why those numbers must not be read as
a fall. No line repeats a number the chart has already labelled.

## Part 2 — wrappers versus categories

`Education` and `Operational Excellence` are grouping wrappers with no listing
of their own. They now render in the platform's own section-divider grammar
(the Thematic View's "Enabling function" rule): a muted uppercase label, a
rolled-up count, **a plain `<span>` — no arrow, no hover, no cursor change,
not focusable, not inside a link**.

Every category is one object with one treatment — 14.5px semibold, count,
arrow, same hover, same route — whether it sits inside a wrapper or stands
alone. Nesting changes position, not appearance: a wrapper's categories sit
inside a left rule with indentation, which is what carries the belonging.
Consecutive standalone categories share one unlabelled band so a single-card
category never claims a full row.

**Rejected:** a generalised multi-level tree (only two wrappers exist); making
each category a full-width section (eight categories × one card each would run
the page to four screens); keeping the wrapper clickable with a filtered
listing (it has no destination the data supports).

## Verification · headless, 1600×1050

1. Grey placeholder count on the page: **0**, both periods ✓
2. Footfall, and all five Education KPIs, draw four-point trends ✓
3. Active QPHI → two reading tiles; Total Policy Adoptions under 2025 →
   first-reading baseline ✓
4. No chart shares an axis between Q1 2026 and completed years; the partial is
   dashed, muted and labelled wherever it appears ✓
5. Footfall reads `486,119 · quarter to date` — no decline arrow ✓
6. Budget Variance charts 8–10% against a 0% plan; no 0.1→18 jump ✓
7. Charts are 104px with gradient fill, both endpoints labelled, the latest
   point heavier ✓
8. AI lines carry the target-history, the governance fact, or the
   incomparability — never the chart's own numbers ✓
9. Both wrappers: plain spans, `cursor: auto`, no tabindex, not inside a link ✓
10. Nested and standalone categories are byte-identical in styling ✓
11. Left rule + indentation carries the parent-child relationship ✓
12. Running on :4189, not deployed ✓

Zero console errors; `tsc` and the production build clean.
