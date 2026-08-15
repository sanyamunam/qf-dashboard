/**
 * R2 spotlight engine — which indicator fronts a theme card, and why.
 * The chip names the rule that fired; a spotlight never renders without it.
 *   1. Largest proportional movement across available readings  → BIGGEST MOVER
 *   2. Else largest gap to a real 2026 commitment               → LARGEST GAP
 *   3. Else the largest real-world quantity as a baseline       → BASELINE
 */
import { kpis, themeKpis } from './data'
import type { Kpi } from './types'

export type ChipReason = 'BIGGEST MOVER' | 'LARGEST GAP' | 'BASELINE'

/**
 * `% Variance` indicators are signed measures oscillating around zero — a
 * percentage change on them is nonsense (headcount variance computes as −600%).
 * They are excluded from every mover ranking.
 */
export const rankable = (k: Kpi) => !/variance/i.test(k.name)

/** A continuous KPI whose Q1 cell is 0 after active prior years — reported nothing so far. */
const q1ZeroArtifact = (k: Kpi) =>
  k.cadence === 'continuous' &&
  k.actuals['2026Q1'].value === 0 &&
  ['2022', '2023', '2024', '2025'].some((y) => (k.actuals[y].value ?? 0) !== 0)

/**
 * The three summary spotlights: one performing, two needing attention.
 * Ranked, never hand-picked.
 */
export function summarySpotlights(): { performing: Kpi; attention: Kpi[] } {
  const pool = kpis.filter(rankable)

  // attention #1 — largest scale-weighted peak-to-now decline, judged on
  // FULL-YEAR readings only. Peak-to-now rather than endpoint-to-endpoint
  // (WISH rose to 23,150 before collapsing), and a partial Q1 reading may
  // never be the endpoint of a decline claim — that is the pace trap.
  const annualVals = (k: Kpi) => k.movementSeries.filter(([y]) => y !== '2026Q1').map(([, v]) => v)
  const peakDrop = (k: Kpi) => {
    const vals = annualVals(k)
    if (vals.length < 3) return 0
    const max = Math.max(...vals)
    return max > 0 ? ((vals[vals.length - 1] - max) / max) * Math.log10(1 + max) : 0
  }
  const decliners = pool.filter((k) => peakDrop(k) < -0.5).sort((a, b) => peakDrop(a) - peakDrop(b))

  // attention #2 — largest-scale stopped-reporting series (a collection question)
  const stopped = pool
    .filter(q1ZeroArtifact)
    .sort(
      (a, b) =>
        Math.max(...b.movementSeries.map(([, v]) => v), 0) -
        Math.max(...a.movementSeries.map(([, v]) => v), 0),
    )

  // performing — largest favourable movement whose current quarter is not a
  // zero-artifact and whose series starts above zero (a climb from 0 inflates
  // proportional change to 100% regardless of scale)
  const climbers = pool
    .filter(
      (k) =>
        (k.propChange ?? 0) > 0.2 &&
        k.movementSeries.length >= 3 &&
        !q1ZeroArtifact(k) &&
        k.movementSeries[0][1] > 0,
    )
    .sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))

  return {
    performing: climbers[0],
    attention: [decliners[0], stopped[0]].filter(Boolean),
  }
}

export interface Spotlight {
  kpi: Kpi
  chip: ChipReason
}

export function spotlightFor(themeName: string): Spotlight {
  const list = themeKpis(themeName)

  // 1 — movement, favourable or not, scale-weighted so people outrank basis points
  const movers = list
    .filter(rankable)
    .filter((k) => k.movementScore !== null && k.movementSeries.length >= 2)
    .sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))
  if (movers[0] && Math.abs(movers[0].propChange ?? 0) >= 0.15) return { kpi: movers[0], chip: 'BIGGEST MOVER' }

  // 2 — largest gap to a real commitment (continuous, target > 0, no artifact zeros)
  const gaps = list
    .filter(
      (k) =>
        k.cadence === 'continuous' &&
        (k.targets['2026'].value ?? 0) > 0 &&
        k.actuals['2026Q1'].value !== null &&
        k.polarity === 'Green',
    )
    .map((k) => ({ k, gap: 1 - (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number) }))
    .sort((a, b) => b.gap - a.gap)
  if (gaps[0] && gaps[0].gap > 0.4) return { kpi: gaps[0].k, chip: 'LARGEST GAP' }

  // 3 — the largest real-world quantity as a baseline being set
  const base = list
    .filter((k) => k.actuals['2026Q1'].value !== null && (k.actuals['2026Q1'].value as number) > 0)
    .sort((a, b) => (b.actuals['2026Q1'].value as number) - (a.actuals['2026Q1'].value as number))
  if (base[0]) return { kpi: base[0], chip: 'BASELINE' }
  return { kpi: list[0], chip: 'BASELINE' }
}

/** Entities with continuous indicators at zero this quarter after active prior years. */
export function stoppedReporting(): { entity: string; kpis: Kpi[] }[] {
  const by = new Map<string, Kpi[]>()
  for (const k of kpis) {
    const prior = ['2022', '2023', '2024', '2025'].some(
      (y) => k.actuals[y].value !== null && k.actuals[y].value !== 0,
    )
    if (k.cadence === 'continuous' && k.actuals['2026Q1'].value === 0 && prior)
      by.set(k.entity, [...(by.get(k.entity) ?? []), k])
  }
  return [...by.entries()]
    .map(([entity, list]) => ({ entity, kpis: list }))
    .sort((a, b) => b.kpis.length - a.kpis.length)
}

/** L2 top-2/top-2: selected by movement, not raw ratio. */
export function topMovers(themeName: string): { attention: Kpi[]; performing: Kpi[] } {
  const list = themeKpis(themeName).filter(rankable)
  const withMove = list.filter((k) => k.movementScore !== null && k.movementSeries.length >= 2)
  /**
   * An indicator that reported nothing this quarter cannot be "Performing",
   * however well it climbed before. propChange is computed from the movement
   * series, which excludes the Q1 zero, so seven of these otherwise sorted
   * into Performing while their cards read "0 of 5" — a section framing that
   * contradicted the card's own status. Reporting nothing is unfavourable, so
   * they become attention candidates instead.
   */
  const down = withMove
    .filter((k) => (k.propChange ?? 0) < -0.05 || q1ZeroArtifact(k))
    .sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))
  const up = withMove
    .filter((k) => (k.propChange ?? 0) > 0.05 && !q1ZeroArtifact(k))
    .sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))

  // where no unfavourable history exists, fall back to the largest gap to a real commitment
  let attention = down.slice(0, 2)
  if (attention.length < 2) {
    const gaps = list
      .filter(
        (k) =>
          !attention.includes(k) &&
          k.cadence === 'continuous' &&
          (k.targets['2026'].value ?? 0) > 0 &&
          k.actuals['2026Q1'].value !== null &&
          k.polarity === 'Green' &&
          1 - (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number) > 0.6,
      )
      .sort(
        (a, b) =>
          (a.actuals['2026Q1'].value as number) / (a.targets['2026'].value as number) -
          (b.actuals['2026Q1'].value as number) / (b.targets['2026'].value as number),
      )
    attention = [...attention, ...gaps.slice(0, 2 - attention.length)]
  }
  return { attention, performing: up.slice(0, 2) }
}
