# Revision 14 — overshoot magnitude, and two kinds of zero

## Fix 1 — how far past target, not just past it

`overshootOf(value, target)` in `builders.ts` returns a band and a label:

| Band | Ratio | Treatment |
|---|---|---|
| `exact` | < 1.005 | solid fill + ✓, unchanged — the cleanest outcome keeps the plainest mark |
| `modest` | ≤ 2× | solid fill + ✓ + a magnitude chip, `+50%` |
| `large` | > 2× | **split bar** + the multiple, `3.5×` |

The 2× boundary is "double the target" — a threshold a reader already holds.
Percentages for modest beats and multiples for large ones give the two bands
different *shapes* as well as different values, so they read apart at a glance.

The split bar keeps the base treatment the brief asked for — it still stops at
the card edge — but the run past the target is drawn as a distinct thing:
solid up to the target marker, then a fainter hatched continuation. Implemented
as two stacked ECharts series for single-KPI bullets, and as a layered
`repeating-linear-gradient` for the HTML ledger rows, so grouped and single
cards say it the same way.

Verified: `Programs` (WISH, 1/1) plain ✓ · `International Engagements`
(WISH, 3/2) `+50%` · `Programs` (DIFI, 7/2) `3.5×` hatched · `Research
Publications` (DIFI, 25 vs its 2025 target of 2) `12.5×` hatched.

## Fix 2 — the 74 zeros are not two groups, they are four

Checked against the sheet. The brief's split was 31 / 43; the 43 is really
three different situations, and collapsing them would reproduce the exact
problem the fix exists to solve:

| Bucket | Count | Treatment |
|---|---|---|
| Not due — reports at year end | **31** | no bar; hollow dashed `Reports at year end · no Q1 reading`; figure shows `—`, never `0` |
| Genuine zero, no prior history | **29** | empty bullet with the target marker still visible |
| Genuine zero, *with* prior history | **8** | R13's dated fallback — a real 2025 chart says more than an empty 2026 bar |
| Idle by design — 2026 target is 0 | **6** | existing "quiet by design" note, kept distinct |

`isNotDue()` in `KpiCard` now runs **before** the target branch in
`polarityOf`, so a not-yet-assessed indicator can never render
`0 — vs 2026 target`; it reads `— not yet reported`. The empty state is
hollow (dashed border, no fill) rather than a filled container, so nothing
looks like a result sitting in a box.

Genuine zeros keep `0` and their `0 of 15` caption — that zero *is* the
measurement — and now carry an empty bar with the target marked, which is the
honest picture: the bar is empty because the count really is nothing.

## Also fixed while verifying

A fallback position whose last reported year *is* Q1 2026 was printing
"Q1 2026 · last reported, against that year's target" — a caveat that says
nothing. The basis line is now emitted only for years other than the current
quarter. Grouped cards were also printing two basis lines (the card's meta row
and the mark's own); `SnapshotMark` gained `showBasis`, and the card owns that
slot via `snapshotBasisFor()`.

## Verification note

`largeMultiples` counted 0 in DOM sweeps because single-KPI bullet labels are
drawn on canvas and never appear in `innerText`. Those were confirmed by
screenshot instead — worth remembering for future automated checks.
