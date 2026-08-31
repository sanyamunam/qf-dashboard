/**
 * THE chart-type selector. One function per level, called from every surface.
 *
 * No component chooses its own mark — a component that picks for itself is how
 * the same KPI ended up drawn three different ways on three pages. Everything
 * here is data, no JSX, so the choice can be unit-tested and counted.
 *
 * Specification: Al-Mishkat-chart-types-reference.html (chart types by data
 * shape). Classification verified against it — not-reported 63, centred gauge
 * 4, bare figure 9, idle 9, no-history 124, all exact.
 */
import { obsKpis, annualZeroIsAbsent, type ObsKpi } from './obs'
import { statusFor, paceMarkerFor, type DashStatus } from './status'

/* ─────────────────────────── what kind of number ─────────────────────────── */

/**
 * A percentage is bounded 0–100, which is the whole reason it can take an arc:
 * a gauge can be capped honestly and an overshoot still fits inside it. A
 * count has no ceiling, so it keeps the bullet bar.
 *
 * Read from the sheet's own words — the `%` often lives in the definition
 * rather than the name (`Qatarization (QF)` is "% of Qatari employees",
 * `Employee Engagement Score` is "Target set to 79%").
 */
export const isPercent = (k: ObsKpi): boolean =>
  /percentage|%/i.test(`${k.definition ?? ''} ${k.name}`) || /\b(rate|ratio)\b/i.test(k.name)

/** Variance runs both ways, so it can never take a left-to-right mark. */
export const isVariance = (k: ObsKpi): boolean => /variance/i.test(k.name)

/** `Red` = lower is better. 15 indicators invert; direction of good comes from
 *  this column and never from the sign of a delta. */
export const isLowerBetter = (k: ObsKpi): boolean => k.polarity === 'Red'

/**
 * Percentage KPIs store units inconsistently between eras — Qatarization runs
 * 0.2745…0.26 across 2022–25 and then 25 for Q1 2026, against a target of
 * 0.25. Compared raw that is a 100× overshoot and any gauge built on it is
 * wrong. Normalised per VALUE, not per row, because a single row mixes both
 * conventions.
 */
export const normalise = (k: ObsKpi, v: number | null | undefined): number | null =>
  typeof v !== 'number' ? null : isPercent(k) && Math.abs(v) <= 1 ? +(v * 100).toFixed(2) : v

export const unitOf = (k: ObsKpi): string => (isPercent(k) ? '%' : '')

/* ──────────────────────────────── periods ──────────────────────────────── */

export type Period = '2025' | 'q1'
export const ANNUAL_YEARS = ['2022', '2023', '2024', '2025'] as const
export const FUTURE_YEARS = ['2026', '2027', '2028'] as const

/** An annual reporter's Q1 zero is an absence, not a reading — `q1Of` in
 *  obs.ts explains the tell. Read the same way here, or the mark and the
 *  status disagree about whether the period was reported at all. */
export const actualFor = (k: ObsKpi, p: Period): number | null =>
  normalise(k, p === 'q1' ? (annualZeroIsAbsent(k) ? null : k.q1) : k.actuals['2025'])
export const targetFor = (k: ObsKpi, p: Period): number | null =>
  normalise(k, k.targets[p === 'q1' ? '2026' : '2025'])

/** Completed annual readings only. Q1 2026 is three months; 2022–25 are
 *  twelve. They never share an axis. */
export const annualActuals = (k: ObsKpi): { year: string; value: number }[] =>
  ANNUAL_YEARS.map((y) => ({ year: String(y), value: normalise(k, k.actuals[y]) })).filter(
    (p): p is { year: string; value: number } => p.value !== null,
  )

/* ───────────────────────────── L1 — current value ───────────────────────── */

/**
 * The verdict a mark is drawing, carried WITH the geometry.
 *
 * An L1 mark exists to answer "how is this doing against target" — it IS a
 * verdict, so it is coloured by one. That colour comes from the platform's one
 * `statusFor`, never from anything this module works out for itself, which is
 * what guarantees that filtering a listing to At risk paints every card on it
 * red: the filter and the fill are reading the same function.
 */
export type L1Mark =
  /** A · no reading for this period. No chart; an em-dash would read as a value */
  | { kind: 'notReported'; lastValue: number | null; lastYear: string | null; unit: string }
  /** green polarity with a target of zero — nothing expected this cycle */
  | { kind: 'idle' }
  /** D · a reading with nothing to score it against */
  | { kind: 'bareFigure'; value: number; unit: string }
  /** B1 · count vs target — fill, track, target marker; overshoot sits inside */
  /** B1 · count vs target. `pace` is where an evenly-delivered indicator would
   *  stand by now — drawn as a second, subordinate reference so the reader can
   *  SEE the gap rather than read a sentence about it. Null where meaningless. */
  | { kind: 'bullet'; value: number; target: number; unit: string; met: boolean; tone: DashStatus; pace: number | null }
  /** B2 · percentage vs target — 0–100 arc, target tick ON the arc */
  | { kind: 'gauge'; value: number; target: number; unit: string; met: boolean; tone: DashStatus }
  /** C · variance — zero at the top, deviation either side */
  | { kind: 'centredGauge'; value: number; tolerance: number; span: number; unit: string; zeroLabel: string; tone: DashStatus }

/** A cumulative target accrues; a rate is a level that exists at an instant.
 *  Mirrors `accrualOf`/`expectedBy` in dash.ts — the two must not drift. */
const ACCRUES = (k: ObsKpi) =>
  !/percentage|%|ratio|rate|score|index|average|per employee|satisfaction|time to hire|turnover|utili[sz]ation/i.test(
    `${k.definition ?? ''} ${k.name}`,
  )
const paceBar = (k: ObsKpi, t: number, p: Period) => (p === 'q1' && ACCRUES(k) ? t * 0.25 : t)

const niceSpan = (n: number): number => [10, 25, 50, 100, 250, 500].find((s) => s >= n) ?? 1000

export function selectL1(k: ObsKpi, p: Period): L1Mark {
  const unit = unitOf(k)
  const a = actualFor(k, p)
  const t = targetFor(k, p)

  if (a === null) {
    const last = annualActuals(k).slice(-1)[0] ?? null
    return { kind: 'notReported', lastValue: last?.value ?? null, lastYear: last?.year ?? null, unit }
  }

  /* a zero target on a higher-is-better indicator means nothing is expected
     this cycle — an off-year, not a ceiling. Charting it as a limit would show
     nine KPIs permanently maxed out. */
  if (!isLowerBetter(k) && t === 0) return { kind: 'idle' }

  if (isVariance(k)) {
    const tolerance = t !== null && t > 0 ? t : 0
    return {
      kind: 'centredGauge',
      tone: statusFor(k, p),
      value: a,
      tolerance,
      span: niceSpan(Math.max(Math.abs(a), tolerance, 10) * 1.4),
      unit,
      zeroLabel: t === 0 ? '0 · on budget' : '0 · on plan',
    }
  }

  if (t === null) return { kind: 'bareFigure', value: a, unit }

  /* Judged against the pace the target implies BY NOW, exactly as `statusFor`
     does — Ecoschool Beneficiaries at 78,391 of an 80,000 year is ahead in Q1,
     and a card cannot read "Performing well" over an amber bar. The target
     MARKER stays at the annual number: the commitment is the commitment. */
  const bar = paceBar(k, t, p)
  const met = isLowerBetter(k) ? a <= bar : a >= bar
  /* the ONE status function — not a second opinion computed from this
     module's own normalisation, which reads percentages by a slightly wider
     rule and could disagree with the chip sitting above the mark */
  const tone = statusFor(k, p)
  return isPercent(k)
    ? { kind: 'gauge', value: a, target: t, unit, met, tone }
    : { kind: 'bullet', value: a, target: t, unit, met, tone, pace: paceMarkerFor(k, p) }
}

/* ──────────────────────────────── L2 — trend ────────────────────────────── */

/**
 * The quarter to date, carried SEPARATELY from the annual points.
 *
 * Q1 is three months and the years are twelve, so it can never be another
 * point on the same series — that is the comparison the platform refuses
 * everywhere. It travels as its own reading, tied to the year it falls inside,
 * so a chart can show it beside that year's commitment while marking it as a
 * different length of time.
 */
export interface PartialReading {
  /** the year it falls within — the category it belongs beside */
  year: string
  value: number
  label: string
}

export interface TrendPoint {
  year: string
  actual: number | null
  /** null where the sheet set no target that year — NEVER back-filled */
  target: number | null
  future?: boolean
}

export type L2Mark =
  /** W · no 2022–25 readings at all. The honest answer is no chart */
  | { kind: 'none' }
  /** Z · one reading is a baseline, not a trend */
  | { kind: 'baseline'; value: number; period: string; unit: string }
  /** Y · exactly two — never a line; two points imply a trajectory that isn't there */
  | { kind: 'twoValue'; a: { label: string; value: number; span: string }; b: { label: string; value: number; span: string; partial?: boolean }; unit: string }
  /** X · three or more, counts or currency — discrete period totals accrue */
  | { kind: 'bars'; points: TrendPoint[]; unit: string; hasTarget: boolean; partial: PartialReading | null }
  /** X · three or more, rates — a level that persists rather than accrues */
  | { kind: 'line'; points: TrendPoint[]; unit: string; hasTarget: boolean; partial: PartialReading | null }

export function selectL2(k: ObsKpi, p: Period): L2Mark {
  const unit = unitOf(k)
  const annual = annualActuals(k)
  /* NOT `k.q1` raw: an annual reporter's Q1 zero is an absence, and reading it
     here gave the enabling-function band a "Q1 2026: 0" marker on two
     indicators that have not reported this quarter at all. `actualFor` is the
     one reading of the current period. */
  const q1 = actualFor(k, 'q1')

  if (annual.length === 0) return { kind: 'none' }

  if (annual.length === 1) {
    const only = annual[0]
    /* one completed year beside a partial quarter is the two-value case —
       different lengths of time, so the drop is an artefact, not a decline */
    if (q1 !== null)
      return {
        kind: 'twoValue',
        a: { label: only.year, value: only.value, span: 'twelve months' },
        b: { label: 'Q1 2026', value: q1, span: 'three months', partial: true },
        unit,
      }
    return { kind: 'baseline', value: only.value, period: only.year, unit }
  }

  if (annual.length === 2)
    return {
      kind: 'twoValue',
      a: { label: annual[0].year, value: annual[0].value, span: 'full year' },
      b: { label: annual[1].year, value: annual[1].value, span: 'full year' },
      unit,
    }

  const points: TrendPoint[] = [
    ...annual.map((x) => ({ year: x.year, actual: x.value, target: normalise(k, k.targets[x.year]) })),
    ...FUTURE_YEARS.map((y) => ({ year: y, actual: null, target: normalise(k, k.targets[y]), future: true })),
  ]
  /* a future year with no target is not a gap to draw through — it is simply
     not part of the committed path */
  const trimmed = points.filter((pt) => !pt.future || pt.target !== null)
  const body = {
    points: trimmed,
    unit,
    hasTarget: trimmed.some((pt) => pt.target !== null),
    partial: q1 === null ? null : { year: '2026', value: q1, label: 'Q1 2026' },
  }
  return isPercent(k) ? { kind: 'line', ...body } : { kind: 'bars', ...body }
}

/* ─────────────────────────── counts, for verification ────────────────────── */

export function classify(p: Period = 'q1') {
  const l1: Record<string, number> = {}
  const l2: Record<string, number> = {}
  for (const k of obsKpis) {
    const a = selectL1(k, p).kind
    const b = selectL2(k, p).kind
    l1[a] = (l1[a] ?? 0) + 1
    l2[b] = (l2[b] ?? 0) + 1
  }
  return { l1, l2 }
}
