# The Quarterly Brief — design

Approved 14 Aug 2026. Replaces the per-visit daily brief entirely.

## What it is

The platform's flagship: one dated, complete, quarterly memo in BOTaina's voice,
read as a single scroll, opened only from the lamp in the header. Executive View
content (Release 1) leads; thematic content (Release 2) follows. Under two
minutes to read standing up.

## Data sources

- **Release 1** (`Al Mishkat - Release 1 KPIs.xlsx`, sheet `Q1_updates_drill
  downKPIs`, rows 3–71): 69 executive KPIs across Impact / Strategy Execution /
  Operational Excellence, entities the thematic platform has never seen, with
  Jan/Feb/Mar monthly columns on some rows — the platform's first within-quarter
  movement. Parsed by a new `scripts/parse_release1.py` → `src/data/exec.json`.
- **Release 2**: already parsed (`src/data/kpis.json`, 151 KPIs). No re-parse.

## The five movements

1. **Masthead** — mark, "The Quarterly Brief · Q1 2026", dated, exit to
   dashboard. Thin fixed section rail (Foundation / Themes / Asks) for jumping;
   the read itself is one scroll, never paginated.
2. **The hook** — BOTaina avatar + two sentences holding the quarter's shape.
   No greeting ceremony, no Begin button.
3. **Across the Foundation** (Release 1) — four findings ranked by movement:
   - EC footfall's March collapse: 211,772 → 237,801 → 36,546 (row 56, monthly)
   - Vacancies climbed every month 610 → 673 → 695, leadership steady at 14
     (rows 69, 66)
   - Revenue QAR 545m by March — 27% of all of 2025 (row 65, monthly cumulative)
   - Graduate employment 54% → 72% over four years vs 80% 2026 target (row 3)
   Each: serif finding sentence → small chart from existing builders → trace line.
4. **Across the themes** (Release 2) — *What worked* / *What didn't*:
   Eco-Schools scale; WISH's three-year fall; the 35 finished full-year targets.
   Reuses slope / ledger / snapshot treatments verbatim.
5. **The asks** — three questions with named owners. **Each ask is clickable
   and opens BOTaina with the question pre-loaded** (existing `botaina-ask`
   handoff). Copy-all and "Have BOTaina draft the note" kept alongside.
   Accounting line names what was excluded and why.

## Editorial rules

- Rank by magnitude of real movement against the KPI's own history.
- A figure with units that contradict its own history (Budget Variance, the two
  Diabetes rows) is never charted — it becomes an ask about data quality.
- Release 1 and Release 2 have separate finding budgets (4 + 4); neither
  displaces the other.
- Every figure traces to a cell. Cumulative-reporting caveats (Genomes
  Sequenced) are stated in the sheet's own words if used.
- One voice, one reader. The Chairperson/CEO persona toggle leaves with the
  daily brief.

## Entry and state

- The lamp in the header is the **only** entry point. Auto-open front-door
  behaviour is removed.
- Lamp lit until `localStorage almishkat.qbrief.2026q1` is set on first open;
  quiet after; always one tap away.
- The per-visit engine — lead rotation, `ledIds`, visit counts, continuity
  lines, ask-topic memory — is deleted.

## Plumbing

- New: `scripts/parse_release1.py`, `src/data/exec.json`,
  `src/briefing/quarterly.ts` (verified finding pool, no rotation),
  `src/briefing/QuarterlyBrief.tsx` (scroll overlay).
- Removed: `src/briefing/engine.ts` rotation/memory, `src/briefing/Briefing.tsx`
  paced screens (visuals.tsx retained where its chart specs are reused).
- Unchanged: everything else — dashboard screens, drawer, BOTaina dock, tokens.

## Length budget

~650 words, ~8 small charts, under two minutes.
