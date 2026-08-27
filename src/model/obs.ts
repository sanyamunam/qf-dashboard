/**
 * The OBS workbook — `KPI Mapping - OBS merged 1 (1).xlsx` · `Actuals &
 * Targets`, parsed by scripts/parse_obs.py into src/data/obs.json. 240 rows:
 * 89 Executive, 151 Thematic. The Executive Dashboard and the global search
 * read from here; the thematic pages keep their own Release 2 model.
 */
import raw from '../data/obs.json'
import type { Kpi, CellReading } from './types'

export interface ObsKpi {
  row: number
  dashboard: string | null
  entity: string | null
  proposedEntity: string | null
  category: string
  group: string
  subgroup: string
  theme: string | null
  framework: string | null
  name: string
  definition: string | null
  polarity: string | null
  highlighted: boolean
  actuals: Record<string, number | null>
  actualNotes: Record<string, string | null>
  q1: number | null
  q1Note: string | null
  targets: Record<string, number | null>
  targetNotes: Record<string, string | null>
}

/**
 * NOT from the OBS workbook. Sourced from a supplied design screenshot: WISH's
 * "Ongoing Initiatives", 6 active this quarter, placed under Operational
 * Excellence. It carries no prior years and no target yet — QF to supply the
 * cells; until then it reads as Monitoring with no YoY, exactly as any other
 * reading-without-a-target does. Kept here (rather than a bespoke card) so it
 * renders through the same pipeline and matches every other card 1:1.
 */
const PRIORITY_INITIATIVES: ObsKpi = {
  row: 9001,
  dashboard: 'Executive',
  entity: 'WISH',
  proposedEntity: 'WISH',
  category: 'Operational Excellence - Priority Initiatives',
  group: 'Operational Excellence',
  subgroup: 'Priority Initiatives',
  theme: 'Organizational Excellence',
  framework: 'Operational',
  name: 'Ongoing Initiatives',
  definition: 'Number of ongoing initiatives (WISH). Sourced from supplied design; awaiting a cell in the OBS workbook.',
  polarity: 'Green',
  highlighted: true,
  actuals: { '2022': null, '2023': null, '2024': null, '2025': null },
  actualNotes: { '2022': null, '2023': null, '2024': null, '2025': null },
  q1: 6,
  q1Note: null,
  targets: { '2022': null, '2023': null, '2024': null, '2025': null, '2026': null, '2027': null, '2028': null },
  targetNotes: { '2022': null, '2023': null, '2024': null, '2025': null, '2026': null, '2027': null, '2028': null },
}

export const obsKpis: ObsKpi[] = [...(raw as { rows: ObsKpi[] }).rows, PRIORITY_INITIATIVES]

const byRow = new Map(obsKpis.map((k) => [k.row, k]))
export const obsRow = (r: number): ObsKpi => {
  const k = byRow.get(r)
  if (!k) throw new Error(`OBS row ${r} missing`)
  return k
}

/* ───────────────────── unit normalisation, once, on read ─────────────────────
 * Historical actuals store percentages as decimals; the Q1 2026 column stores
 * them as whole numbers (Budget Variance: 0.09…0.10 then 18). Rendered
 * naively that is a 180× jump. A row whose definition says "Percentage" is a
 * percent row, and any stored value at or below 1 is lifted ×100 — both eras
 * land on one scale before any comparison, chart or status calculation. */
export const isPercentRow = (k: ObsKpi): boolean => /percentage/i.test(k.definition ?? '')
export const unitOf = (k: ObsKpi): string => (isPercentRow(k) ? '%' : '')

export const lift = (k: ObsKpi, v: number | null | undefined): number | null =>
  typeof v !== 'number' ? null : isPercentRow(k) && Math.abs(v) <= 1 ? +(v * 100).toFixed(2) : v

export const histOf = (k: ObsKpi, y: string): number | null => lift(k, k.actuals[y] ?? null)
/** `TBU` was parsed to a note — a missing target is null here, never zero. */
export const targOf = (k: ObsKpi, y: string): number | null => lift(k, k.targets[y] ?? null)
export const A_YEARS = ['2022', '2023', '2024', '2025']

/**
 * An ANNUAL reporter's Q1 cell holds a 0 that is an absence, not a reading.
 *
 * The tell is in the data: a zero this quarter on a row that HAS 2022–25
 * history is the year-end reporting pattern — % Employee Turnover reads
 * 8.45 · 8.3 · 9.0 · 7.0 and then 0, which is plainly "not yet", not a
 * collapse to zero. 27 of the 151 Thematic rows share it. The parser already
 * strips exactly these zeros out of `movementSeries` for the same reason; this
 * applies the same judgement to the current reading, so the status, the L1
 * mark and the trend cannot disagree about whether a period was reported.
 *
 * A zero with NO history is left alone — that is a real "nothing delivered
 * yet" from an indicator in its first year, and hiding it would be worse.
 */
export const annualZeroIsAbsent = (k: ObsKpi): boolean =>
  k.q1 === 0 && A_YEARS.some((y) => typeof k.actuals[y] === 'number')

export const q1Of = (k: ObsKpi): number | null => (annualZeroIsAbsent(k) ? null : lift(k, k.q1))

/** `Red` = lower is better (Budget Variance). The column is authoritative for
 *  the dashboard ten; three rows elsewhere are inverted and flagged. */
export const isLowerBetter = (k: ObsKpi): boolean => k.polarity === 'Red'

/* ─────────────── the platform's Kpi shape, for drawer and search ─────────────── */

const reading = (v: number | null): CellReading => ({ value: v, raw: null, flag: null })

/** Full history — what the KPI overlay (drawer) reads. */
export function obsAsKpi(r: number): Kpi {
  const k = obsRow(r)
  const actuals: Record<string, CellReading> = {}
  for (const y of A_YEARS) actuals[y] = reading(histOf(k, y))
  actuals['2026Q1'] = reading(q1Of(k))
  const targets: Record<string, CellReading> = {}
  for (const y of [...A_YEARS, '2026', '2027', '2028']) targets[y] = reading(targOf(k, y))

  const series = A_YEARS.map((y) => [y, histOf(k, y)] as [string, number | null]).filter(
    (p): p is [string, number] => p[1] !== null,
  )

  return {
    id: `obs-${k.row}`,
    row: k.row,
    entity: k.proposedEntity ?? k.entity ?? 'Unassigned',
    polarity: isLowerBetter(k) ? 'Red' : 'Green',
    category: k.subgroup || k.group,
    theme: k.theme ?? '',
    framework: (k.framework as Kpi['framework']) ?? 'Operational',
    name: k.name.trim(),
    definition: k.definition,
    unit: unitOf(k),
    l1Chart: null,
    chartGroup: null,
    l2Chart: null,
    actuals,
    targets,
    reportingPeriod: null,
    cadence: k.q1 !== null ? 'continuous' : 'annual',
    historyPoints: series.length,
    hasEnoughHistoryForLine: series.length >= 3,
    state: k.q1 !== null ? 'IN_PROGRESS' : 'REPORTS_AT_YEAR_END',
    propChange: null,
    movementScore: null,
    movementSeries: series,
    exactHit: false,
    overshoot: false,
  }
}
