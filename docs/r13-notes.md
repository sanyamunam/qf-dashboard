# Revision 13 — close the chart gap on the spotlight cards

## What the data actually said

The brief's table listed all four spotlight KPIs as "a current value and a
2026 target". Checked against `kpis.json`, three of the four are not:

| Card | Q1 2026 cell | Last real reading | That year's target |
|---|---|---|---|
| Media Mentions (WISH) | `0` — not yet reported | **12 in 2025** | 12 |
| Sponsorship Revenue (DIFI) | `0` — not yet reported | **627,160 in 2025** | 200,000 |
| Research Publications (DIFI) | `0` — not yet reported | **25 in 2025** | 2 |
| Beneficiaries (WISH) | **900** — a real reading | 900 (Q1 2026) | 5,000 (2026) |

So it was not a rollout gap. The spotlight cards use the same `KpiCard` →
`SnapshotMark` → `snapshotFor` path as the explore grid; that path was
correctly refusing to plot a Q1 zero the parser had judged "not yet reported".
Charting 12 against the 130 target for 2026 would have asserted quarterly
progress that has not been reported.

The client's conclusion was still right: a bare figure is the wrong answer.

## The fix

**Dated fallback.** When no member of a group has an honest Q1 position,
`snapshotFor` now falls back to each indicator's **last reported year against
that year's own target**, and every label says which year: a basis line above
the mark ("2025 · last reported, against that year's target"), the year on the
bullet's target marker ("2025 target 12"), and a suffix inside the arc
("of 50 · 2025"). What it never does is mix periods.

**Closed-year status.** Pace has no meaning once a year is over, so a fallback
position is scored by `closedYearStatus`: met or missed, never "behind pace".
Ceilings keep their rule — under is neutral, over is a breach.

**Year-end reporters were wrongly excluded.** The `REPORTS_AT_YEAR_END` /
`IDLE_THIS_CYCLE` guards exist to stop the Q1 *cell* being read as a position;
they say nothing about an indicator's history. They were also blocking the
fallback, which is precisely the case those indicators need. Removed from the
fallback path — the movement series and a `target > 0` check are sufficient
and honest. This is what fixed the two OE cards.

**No card falls back to a bare figure.** Where nothing is chartable at all
(no readings on record), `SnapshotMark` now renders a generated note stating
the target that has nothing measured against it yet, instead of rendering
nothing.

## Result

| Theme | Spotlight cards | Charted | Explained |
|---|---|---|---|
| Social Progress | 4 | 4 | – |
| Sustainability | 4 | 3 | 1 |
| Progressive Education | 2 | 0 | 2 |
| Artificial Intelligence | 2 | 1 | 1 |
| Organizational Excellence | 4 | 4 | – |

Zero bare figures. The four still uncharted have **no readings on record at
all** — an empty movement series and a Q1 zero the parser judged an absence —
so there is genuinely nothing to plot; each now says so and names its target.

Overshoots render as the brief asked: Research Publications' fill runs well
past its target marker, which stays visible partway along (25 against a 2025
target of 2), in lime with a ✓.

## Open question — not implemented

The brief also asked: "Where three or more historical readings exist, use the
trend-column treatment instead of a single bullet bar." Not done, because it
conflicts with two things:

1. **R8 fix 1**, which mandated no multi-point trends on any card — "listing,
   spotlight, explore, no exceptions" — with trends living only in the overlay.
2. **The brief itself.** All four spotlight KPIs have 4–5 readings, so the rule
   would give every one of them a trend column and none the bullet bar — yet
   the same brief names `Beneficiaries`' bullet bar (5 readings) as the model
   to copy.

Flagged for a decision rather than guessed at.
