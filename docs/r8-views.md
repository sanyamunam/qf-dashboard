# R8 — alternate explore views: brainstorm notes

View types considered beyond the brief's set:

1. **Heatmap / matrix (entity × category).** Rejected: the cell colour would have to encode *something*, and every honest candidate (movement, gap) is undefined for most cells this quarter — and anything status-like is a client red line. A mostly-grey heatmap is worse than no heatmap.
2. **Timeline / year-columns view.** Rejected as a separate view: the year filter already re-renders every view for a chosen year, and 2022–2025 coverage (1–3 indicators per theme-year) can't carry a timeline. Would ship as filler.
3. **Small-multiples on a shared scale.** Folded into Compare rather than shipped separately — Compare's normalised shared-axis chart is the useful half of small multiples without the wall of near-empty plots (most indicators have one reading).

Shipped set: **Grid** (default, browsing) · **List** (fast scan, dense rows, in-place expand to the full drawer detail) · **Compare** (shared axis, % of full-year 2026 target so units mix, capped at 8) · **By Entity** (multi-entity themes only, entity sections with computed summary lines).

Constants across views: one search/filter/sort/year state; spotlights untouched; chart marks reused (MiniLine for rows, the EChart adapter + builders for anything larger — no per-view chart implementations); view choice persists per theme for the session.

Compare honesty rule: only indicators with a real 2026 target and a Q1 reading can sit on the shared axis; everything else selected is listed beneath as "not comparable on this axis" rather than silently dropped or faked at zero.
