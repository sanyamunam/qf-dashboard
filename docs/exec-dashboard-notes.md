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
