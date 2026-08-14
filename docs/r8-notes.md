# Revision 8 — implementation notes

## Fix 0 · Sheet cell colour (verified, no code change)

The ALL sheet uses a fill colour on some KPI-name cells to mark rows that
belong to one combined chart. This was checked directly against the workbook
with openpyxl: **every colour-marked run is also marked by a `Name:` prefix
row**, and no colour grouping exists that the `Name:` parsing misses. The
colour is a visual aid for human readers of the sheet, redundant with the
text convention the parser already follows.

Decision: `scripts/parse_kpis.py` continues to group by `Name:` prefix only.
No colour-based grouping pass was added — it would duplicate the same
information and break silently if a future workbook edit recoloured cells
without moving the `Name:` rows (text is sturdier than formatting).

## Fix 2 · Chart type follows data shape

The sheet's chart-type column ("line", "bar", "dual axis"…) is treated as a
request, not a command. Cards render a snapshot chosen from the data's shape
(`snapshotFor` in `src/components/charts/builders.ts`):

- group of indicators → compact actual-vs-target bar rows (max 4)
- single rate-like metric (%, rate, ratio, index, NPS) → arc gauge
- single count with a target → bullet bar with target mark
- no Q1 reading or no target → no chart; the availability note stands alone

Two KPIs with the same data shape always get the same component, regardless
of what the sheet asked for. The `Name:` grouping is still honoured — grouped
indicators share one card and one chart.

## Fix 1/5 · Where trends live

No card anywhere (listing, spotlight, explore grid, AI-search results, list
rows) draws a multi-point history. The full trend — actuals as bars, the
target path 2022–2028 as a dashed line with hollow markers — exists only in
the detail overlay (`overlayTrendOption`).

## Fix 7 · Entity marks

Icons for DIFI, Earthna, WISE and WISH are the glyph extracted from the
supplied lockups (`public/entities/*.png`), never the full lockup. QSTP is
excluded per instruction. **Policy Hub and QF Human Capital have no supplied
brand mark** — they carry a designed monogram badge (`EntityIcon.tsx`) and
are flagged to the client as missing brand assets.
