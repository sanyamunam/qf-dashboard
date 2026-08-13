# The Executive Briefing — design plan
Delivered before code, per the brief's §0. 2026-08-12.

## 1. Four structurally different forms considered

**A. Paced sequence — CHOSEN.** One item per screen, full-bleed, advanced by the reader (click, arrow, space), a visible progress rail, a distinct close. This is the intelligence-brief form itself: finite by construction (the rail shows the end at all times), one idea per item is enforced by the container, order is the editorial statement, and the reader's thumb sets the pace. The genre the client invoked — the president's daily brief — is a paced sequence of single findings; the form does the genre's work.

**B. Single scrolling editorial page — REJECTED.** A scroll never feels finite even when it is; the reader cannot see the end without going there, which fails the finiteness test at the level of feel rather than fact. Density creeps back in (two items visible at once is already a dashboard), and the platform's Executive View is already a scrolling editorial page — the flagship should not be a longer version of an existing screen.

**C. Presented experience, BOTaina narrating — REJECTED.** Auto-advance is explicitly barred (§3.2), and for good reason: a 90-second reader reads faster than anyone speaks. Narration turns an assessment into a performance, makes skimming impossible, and makes BOTaina the point instead of the findings. She greets, she is available on every item — she does not hold the clicker.

**D. Printed-report metaphor — REJECTED.** Page-turn skeuomorphism spends its novelty in one visit and then charges rent: charts that should draw on entry sit badly on "paper," asks that should be actionable (copy, send) feel wrong on a print artifact, and the metaphor's affordances (flipping, zooming) are work the reader didn't ask for. The brief should feel *authored*, not *printed*.

A absorbs the best of the rejects: B's editorial typography inside each item, C's BOTaina presence at entry and on call, D's sense of a bounded, dated document via the rail and the dated masthead.

## 2. The sequence

Entry (greeting + shape) → items, ordered by consequence, five max → the close (asks + accounting line). Every screen: exit to dashboard top-right, progress rail bottom. Keyboard: → / space advance, ← back, Esc exits. No auto-advance anywhere.

**Item template (four parts, always):** eyebrow (kind · n of N) → the finding (Fraunces, 30–40px, a sentence with a judgement) → the evidence (one presentation-grade chart, animates once on entry, direct-labelled) → why it matters (one–two lines) → the ask (question + named owner). Footer routes: *Ask BOTaina about this* · *Open in ‹theme› →*.

**Motion:** item transitions are a single 380ms slide+fade (reduced-motion: fade only); each chart draws once in 600–800ms on arrival and then rests; the lamp's arrival glow is a one-shot.

**Entry:** after the loader (or via the lamp), BOTaina greets by role and time of day, the shape line states the length ("Five things this morning. Two need you."), continuity line appears only when real ask-history exists. Begin / Skip to dashboard.

**Exit:** the close gathers the asks with named owners and a copy control, then the accounting line ("The remaining N indicators are steady or not yet due."), then Open dashboard. Closing from the lamp returns the reader to the exact route and scroll they left.

## 3. The cadence engine

Per-reader memory (localStorage): `ledIds`, `seenItemIds`, `lastVisit`, `askedTopics` (recorded by BOTaina's panel). The pool holds ranked primary findings and deeper cuts. Each visit: lead = highest-consequence item not yet used as a lead; the rest fill to five by rank. When primaries are exhausted, deeper cuts lead. When nothing is left: the quiet brief — one line, dated, dignified, and an immediate close. The same item never leads twice while the underlying figures are unchanged; with this workbook the figures never change, so the rotation and the quiet state are the honest behaviours to demonstrate.

## 4. Critique against §9 (the failure list)

- *Dashboard in a different layout?* No tiles, no filters, no section nav — one column, one idea, a rail.
- *Scrolls forever?* Items don't scroll at all at desktop heights; the rail always shows the end.
- *Manufactures urgency?* The quiet state is designed, dated, and stops. No slot-filling: fewer than five items is rendered as fewer.
- *Repeats?* Lead rotation is enforced by `ledIds`; test 4 covers three visits.
- *States without evidence?* Every figure in every item links into the KPI drawer.
- *Ends in a chart?* The close is asks-only; no chart on the final screen.
- *Generic prose?* Every sentence names an entity, a figure, and a basis; nothing survives that could describe another organisation.
- *BOTaina as decoration?* She appears where she adds: the greeting (shape + continuity), and as a route on each item. Her lines carry content or don't exist.
- *Can't be left?* "Open dashboard" is persistent on every screen including the greeting.

## 5. The lead visual

Fifteen dots slide onto a single target line and stop — exactly on it — then the count lands: **15 landed exactly · 20 more already past it**. Three direct labels carry the absurdity (7,000 of 7,000 · QAR 27.4m of 27.4m · 25 of 25). One image, one point: these targets were set to what was already done.
