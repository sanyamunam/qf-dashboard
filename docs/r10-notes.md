# Revision 10 — executive chart polish

## The one idea

The chart carries the verdict. Colour and shape say met / on pace / behind
before any number is read, driven by the SAME status logic as the card's
polarity arrow (`statusOf` in `builders.ts`), so chart and card never disagree.

## Status language

| Status | When | Treatment |
|---|---|---|
| **met** | at/above the 2026 target (or exact hit) | QF lime `#78be20` fill, ✓ after the number, soft glow |
| **on pace** | continuous cadence, ≥25% of target at Q1 | theme hue — the quiet default |
| **behind** | continuous cadence, <25% of target at Q1 | muted amber `#dda32e` |
| **neutral** | annual/cyclical cadence, or under a ceiling | theme hue, no verdict |
| **breach** | above a ceiling | maroon — the one real red |

Honesty rules preserved: pace is judged against elapsed time (Q1 = 25%), never
as "% of annual target"; an annual indicator can't be "behind" in March, so it
stays neutral; a ceiling never earns the lime "done" state.

## Fix 5 — brainstormed treatments

Three were considered: (A) status-ledger rows, (B) small-multiple arcs,
(C) dominant + secondary. C was rejected on honesty grounds — choosing a
"lead" indicator is a judgement the workbook doesn't contain. The client asked
for **A and B both, behind a live toggle** ("Group charts: Arcs · Bars" in the
explore header, persisted in `localStorage almishkat.groupstyle`) so the two
could be compared on the real page before one was chosen.

**Decision: A, the status-ledger bars.** After comparing both live, the client
chose the ledger treatment. The toggle, the small-multiple-arc option, and the
`GroupStyle` plumbing were removed; `snapshotFor()` now always returns
`group-ledger` for a multi-indicator card. `gaugeFor()` is kept — it still
renders the single-KPI rate-like arc (Fix 6), which was never part of this
choice.

## Labels (fix 1)

`memberLabel()` edits, never slices: words already in the card title are
removed from member names ("International Partnerships" under "Partnerships"
→ "International"), leading stopwords trimmed. Guards: if the edit leaves
<4 chars, or leaves a conjunction with no head noun ("Reports and Strategic"),
the full name stays. Compare-view axis labels wrap (`overflow: 'break'`)
instead of the old 26-char slice.

## Grouped cards always label (the R9 ambiguity, fixed for good)

A card titled "N indicators" always renders the labelled treatment, even when
only one member has a real Q1 position — an unlabelled mark on a grouped card
could be read as any member.

## Arc geometry

Full sweep = the target, so a full arc IS the target reached. Overshoot
rescales to the value and marks the target as a dark notch on the track.
