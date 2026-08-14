# Revision 11 — the KPI overlay as a composed briefing

## The sequence

1. **Header** — entity icon, breadcrumb, KPI title
2. **AI Summary** — the card's own line, expanded by one sentence
3. **Where it stands now** — the same mark the card showed, larger
4. **History and outlook** — full trend plus the target path to 2028
5. **Highlights** — the entity's voice, then BOTaina's

Removed: the tag row under the title, and the Target History table (the
dashed target line already carries every figure it held). The cadence,
polarity and confidence facts moved to quiet provenance text in the footer.

## Spacing (fix 6)

`SECTION = 38px` between movements, `SECTION_CLOSE = 52px` before Highlights,
against 8–12px inside any one section — so the five parts read as five
movements. Panel widened 520 → 580px; that width is part of the fix, not a
separate change.

## One mark, one component

`SnapshotMark` (components/charts/SnapshotMark.tsx) renders whatever
`snapshotFor` decides, at `scale="card"` or `scale="overlay"`. The card and
the overlay call the same component, so the anchor chart can never drift from
the mark the reader clicked. `LedgerRows` moved here from KpiCard for the same
reason.

## The verdict must not change between card and overlay

Three ordering/scope bugs were found while verifying this, all of the same
family — the overlay recomputing what the card had already decided:

1. **Ledger row order.** The card's group arrives pre-sorted by the active L2
   sort; the overlay read the raw set. Same group, two different row orders.
   `snapshotFor` now orders rows by sheet row, always.
2. **`group[0]` drift.** `aiLineFor` reads `group[0]`, so the same sort made
   the card's caption — and the KPI a click opened — change with the sort.
   `buildGroupCards` now sorts each group's members by sheet row.
3. **Clicked scope.** A spotlight card shows ONE indicator; the overlay
   rebuilt that indicator's whole `Name:` group and stated a group-level
   verdict ("1 of 3" against the card's "0 of 1"). The clicked scope is now
   passed through: `onOpenKpi(kpi, group?)` → App → `KpiDrawer group` →
   `KpiDetailBody`. Omitted (list rows, BOTaina handoffs) it falls back to the
   full group, which is correct there.

Verified: 34 KPIs sampled across all five themes, spotlights included, zero
mismatches between card caption and overlay verdict.

## Also fixed

The trend chart plotted a zero-height bar labelled `0` at 2026 (Q1) for
indicators that have not reported this quarter — a reading that does not
exist, contradicting the summary directly above it. `overlayTrendOption` now
applies the same Q1-artifact rule used everywhere else: absent is absent.

A definition that merely restates the KPI name is suppressed rather than
rendered as a box of nothing.
