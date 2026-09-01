# Amicro mono-charts — library inventory, mark mapping, and adoption decision

**Date:** 2026-09-02
**Source:** https://amicro.vercel.app/mono-charts
**Repo:** https://github.com/Subhan-code/Amicro--Micro-transitions- (MIT, © 2026 Syed Subhan Uddin)
**Package:** `@subhanhq/amicro` v1.0.1

**Decision: DO NOT ADOPT.** Gate §5 fails on four of five criteria. Charts unchanged.

---

## 1. Inventory

The page ships **30 monochromatic chart visualisers**. "Monochromatic" is the
stated design premise, not an incidental palette choice.

Heatmap (3 colourways) · Spline line · Pill pillars (bar) · Curved wave area ·
Rounded donut · Hybrid spline+bar · Scatter matrix · Candlesticks · KPI stat card ·
Tier pyramid · Radial bar group · Speedometer gauge arc · **Performance bullet
target** · Sankey channels · Step progression · Stacked tones bar · Polygon radar ·
Concentric rings · Stage funnel · Dot-matrix heatmap · Sparkline telemetry ·
Bubble clusters · Tile treemap · Fluid stream wave · Arc meter gauge ·
Waterfall steps · Polar radial pillars · Range band area

### The finding that decides it: there is no data interface

Every one of the 29 component files was downloaded and read. The **complete public
API across all of them** is:

| Prop | Appears in |
|---|---|
| `theme?: 'dark' \| 'light'` | 28 / 29 |
| `compact?: boolean` | 28 / 29 |
| `accentColor?` | 1 / 29 |

**Not one component accepts data.** Every series is a module-level constant inside
the file — `const val = 84`, `const BULLET_ITEMS = [...]`, `const RADIAL_GAUGE_DATA
= [...]`. 26 of 29 files carry hardcoded fake data.

These are **demo cards, not chart components**: each renders its own
`rounded-[24px]` `h-[220px] sm:h-[268px]` card with a header, an uppercase
eyebrow, a badge, a stage and a footer.

### Other inventory facts

- **Install method: none.** The mono-charts are **not in the registry.** The
  installable registry holds 162 items — buttons, loaders, text effects — and
  **zero charts**; the published `public/r/index.json` holds 6, also zero charts.
  `npx @subhanhq/amicro add mono-rounded-bullet-chart` does not exist. The only
  route is copy-paste from the demo site's own `src/`.
- **Engine: recharts**, in 21 of 29. The remaining 8 are hand-rolled divs/SVG.
  Al Mishkat renders on ECharts — adoption means a second chart engine.
- **Theming hooks: none.** Colours are inline literals: 46× `#FFFFFF`, 38×
  `#09090B`, 32× `#181818`, 29× `#131313`, plus Tailwind `bg-white`/`bg-black`.
  No tokens, no CSS variables, no palette prop.
- **Value labels: none.** `LabelList` appears in zero files.
- **Dashed series: none.** All 7 `strokeDasharray` uses are on `<CartesianGrid>` —
  grid lines, not data.
- **Tree-shakeable: n/a** — copy-paste source, so only what you paste ships.

---

## 2. Mapping — every mark in our chart system

### L1 — current value

| Mark | Nearest mono-chart | Verdict |
|---|---|---|
| **Bullet bar** | `MonoRoundedBulletChart` | **Skeleton only.** Fill + track + marker present, but fixed to a 0–100 percentage scale (`width: {actual}%`, `left: {target}%`) with no ceiling concept, so it cannot place a marker at its true proportional position against an arbitrary target, and has no overshoot handling. Marker is `bg-emerald-400` — a colour, where ours must stay neutral. No data prop. |
| **Percentage gauge, target tick on arc** | `MonoRoundedGaugeArc`, `MonoRoundedMeterChart`, `MonoRoundedRadialGaugeChart` | **Gap.** All three are a recharts `<Pie>` with `startAngle/endAngle`. The words *target* and *tick* appear in none of them. No tick on the arc, no shortfall shading, no met/exceeded/below states. `const val = 84` hardcoded. |
| **Centred variance gauge** | — | **No equivalent.** Nothing centres zero at the top, and nothing draws a tolerance band or over/under zones. |

### L2 — trend

| Mark | Nearest mono-chart | Verdict |
|---|---|---|
| **Bar trend** | `MonoRoundedBarChart` | **Skeleton only.** Zero-anchored bars, yes. No per-bar value labels, no per-bar target ticks, no dashed hollow future-target bars, no minimum bar height. |
| **Line trend** | `MonoRoundedLineChart` | **Skeleton only.** Has a Dual/Single toggle, but both series are solid. No dashed target series, no hollow points, no point labels, no break where a target is absent. |
| **Two-value comparison** | — | **No equivalent.** |
| **Baseline** | — | **No equivalent.** |

**Score: 0 of 7 usable as-is. 4 of 7 offer a visual skeleton that would need
rewriting to accept data. 3 of 7 do not exist.**

---

## 3. Gate §5

| Criterion | Result |
|---|---|
| Covers enough of §2 | **FAIL** — 0/7 usable, 3/7 absent |
| Fully themeable | **FAIL** — inline hex literals, no token hook; monochrome is the premise |
| Renders at card size | **FAIL** — `compact` yields a 268px *card*, not a ~40px inline mark |
| Licence permits client use | **PASS** — MIT |
| Pinned to a version | **FAIL** — not distributed; copy-paste from a live demo site |

§5: *"If any of these fails, stop and report rather than proceeding. A
half-migrated chart layer is the worst outcome available."* Four failed.

---

## 4. What was kept instead

The chart layer is unchanged: `chartSelect.ts` still chooses the mark,
`l1Palette.ts` still supplies RAG, `trendPalette.ts` still supplies thematic hues,
and all seven marks keep their target markers, arc ticks, zone bands, dashed
hollow target paths and value labels.

The part of Amicro genuinely worth having is its **visual language** — full-radius
pill geometry, generous corner radii, `tabular-nums`, mono micro-labels, the
stage-inside-card structure. That can be applied to our own marks under §2's
"keep the current implementation for that mark and match its styling to the
library's", with no dependency and no second engine. Not done here; awaiting a
decision.
