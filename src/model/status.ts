/**
 * THE status model. Five verdicts, one attainment calculation, one ordering.
 *
 * Everything that says how an indicator is doing comes from here — the status
 * cards, the chips, the AI summary, the search facet, every sort on every
 * listing. A surface that computes its own verdict is how a card and its
 * overlay come to disagree, so no surface is allowed to.
 *
 * ── why a threshold measured against PACE, and not the target ──
 *
 * Three months of a twelve-month year have closed. Measured against the raw
 * 2026 target, 75 of the 151 Thematic indicators sit below 25% of it — and
 * that is not 75 emergencies, it is a quarter of the year elapsing. Grading a
 * three-month reading against a twelve-month commitment makes almost the whole
 * portfolio look catastrophic and the status useless.
 *
 * So a cumulative indicator is judged against the share of its target expected
 * BY NOW, and a point-in-time one against its target directly. That is the
 * difference between 26 indicators worth a conversation and 75 worth ignoring.
 */
import { isLowerBetter, isPointInTime, lift, q1Of, type ObsKpi } from './obs'

export type Period = '2025' | 'q1'

/**
 * Tunable, because 50% is a starting position rather than a finding.
 *
 * QF has set NO quarterly milestones, so even accrual is this platform's
 * assumption and is stated on screen beside every count that rests on it.
 * Once QF has seen the result they will want to move this number; it is one
 * object so that is a one-line change rather than a hunt.
 */
export const RISK = {
  /** attainment below this share of expected pace is MATERIALLY behind */
  threshold: 0.5,
  /** how much of the year Q1 represents */
  elapsed: 0.25,
  elapsedLabel: 'three of twelve months',
} as const

/** @deprecated the old name for the pace settings — prefer `RISK`. */
export const PACE = RISK

export type DashStatus = 'atRisk' | 'belowTarget' | 'onTarget' | 'noTarget' | 'notReported'

/**
 * Severity order, worst first.
 *
 * This array is the single definition of "which is worse" — the status cards
 * sit in it, the search facet lists in it, and `severityOf` ranks by it. Adding
 * a sixth state or reordering these is one edit, everywhere.
 */
export const STATUS_ORDER: DashStatus[] = ['atRisk', 'belowTarget', 'noTarget', 'notReported', 'onTarget']

export const STATUS_LABEL: Record<DashStatus, string> = {
  atRisk: 'At risk',
  belowTarget: 'Below target',
  onTarget: 'On target',
  noTarget: 'No target set',
  notReported: 'Not reported',
}

/**
 * Status colour is a MARK — a dot beside a label, in a consistent slot. Never a
 * card fill, never a chart series, never a theme accent. Thematic colours are
 * fills; status colours are dots, and that separation is the only reason five
 * statuses and five themes stay legible on one screen.
 *
 * Maroon is QF's own semantic unfavourable colour. It reads as unambiguously
 * more severe than the amber it has to be told apart from, and it sits far from
 * every thematic hue, so a maroon dot can never be mistaken for a theme.
 */
export const STATUS_DOT: Record<DashStatus, string> = {
  atRisk: '#8a1538',
  belowTarget: '#b8860b',
  onTarget: '#78be20',
  noTarget: '#8a8f98',
  notReported: '#9aaba5',
}

/** What each verdict MEANS, in the same words the explanation uses. */
export const STATUS_SENSE: Record<DashStatus, string> = {
  atRisk: 'under half the pace expected by now',
  belowTarget: 'behind the pace expected by now',
  onTarget: 'at or ahead of the pace expected by now',
  noTarget: 'a reading, but no target to judge it against',
  notReported: 'no reading this period',
}

/** The reading for the period — or null, honestly. A zero that is an empty
 *  cell has already been resolved to null by `q1Of`. */
export const actualFor = (k: ObsKpi, p: Period): number | null =>
  p === 'q1' ? q1Of(k) : lift(k, k.actuals['2025'] ?? null)

/** A numeric 0 (Budget Variance) IS a target; `TBU` is null, never zero. */
export const targetFor = (k: ObsKpi, p: Period): number | null =>
  lift(k, k.targets[p === 'q1' ? '2026' : '2025'] ?? null)

/**
 * What the target asks for BY NOW rather than by December.
 *
 * A cumulative indicator accrues — 200 internships across a year is roughly 50
 * by the end of Q1. A point-in-time one is a level that exists at an instant,
 * so it answers to its target directly whatever month it is: a satisfaction
 * score of 70% is 70% in March or in December.
 */
/** How a reading accrues, which decides what its target means partway through
 *  a period. Named for the distinction rather than the regex behind it. */
export type Accrual = 'cumulative' | 'pointInTime'
export const accrualOf = (k: ObsKpi): Accrual => (isPointInTime(k) ? 'pointInTime' : 'cumulative')

export function expectedBy(k: ObsKpi, p: Period): number | null {
  const t = targetFor(k, p)
  if (t === null) return null
  /* a completed year is a completed year: at p==='2025' elapsed is 1 and the
     rule reduces to a straight comparison */
  const elapsed = p === 'q1' ? RISK.elapsed : 1
  return isPointInTime(k) ? t : t * elapsed
}

/**
 * The share of expected pace achieved — the number every verdict rests on, and
 * the one each card prints so a classification can always be traced back.
 *
 * POLARITY governs direction and the sign of a number never does. For a
 * lower-is-better indicator the ratio inverts, so an OVERSHOOT is what drives
 * attainment down: Budget Variance at 18% against a ceiling of 0 scores zero,
 * which is the whole point.
 *
 * Null wherever no honest ratio exists — which is never the same as zero.
 */
export function attainmentOf(k: ObsKpi, p: Period): number | null {
  const a = actualFor(k, p)
  if (a === null) return null
  const bar = expectedBy(k, p)
  if (bar === null) return null
  const t = targetFor(k, p)
  /* a zero target on a higher-is-better indicator is an off-year, not a
     ceiling — the reference's nine idle rows. Watched, never judged. */
  if (!isLowerBetter(k) && t === 0) return null
  if (isLowerBetter(k)) {
    if (a === 0) return Number.POSITIVE_INFINITY // nothing spent against a ceiling is perfect
    return bar === 0 ? 0 : bar / a
  }
  return bar === 0 ? null : a / bar
}

export function statusFor(k: ObsKpi, p: Period): DashStatus {
  if (actualFor(k, p) === null) return 'notReported'
  const att = attainmentOf(k, p)
  if (att === null) return 'noTarget'
  if (att >= 1) return 'onTarget'
  return att < RISK.threshold ? 'atRisk' : 'belowTarget'
}

export function statusCountsOf(rows: ObsKpi[], p: Period): Record<DashStatus, ObsKpi[]> {
  const out: Record<DashStatus, ObsKpi[]> = {
    atRisk: [],
    belowTarget: [],
    onTarget: [],
    noTarget: [],
    notReported: [],
  }
  for (const k of rows) out[statusFor(k, p)].push(k)
  return out
}

/**
 * One number per indicator, so every list on the platform sorts by risk with
 * the same comparator rather than each surface inventing an order.
 *
 * The integer part is the status band in severity order; the fraction is how
 * far through that band the indicator sits, so the worst attainment rises to
 * the top of its OWN group rather than the groups merely being stacked. On
 * target sorts closest-to-target first for the same reason.
 */
export function severityOf(k: ObsKpi, p: Period): number {
  const band = STATUS_ORDER.indexOf(statusFor(k, p))
  const att = attainmentOf(k, p)
  const within = att === null || !Number.isFinite(att) ? 0 : Math.min(att, 2) / 2
  return band + within
}

/**
 * Riskiest first; ties broken on name, then on ROW.
 *
 * The row number is not decoration — 17 indicator names are shared by 71 rows
 * (five entities each report "National Partnerships"), so name alone is not a
 * total order and the list quietly reshuffled between renders of identical
 * data. The row is the only unique key the sheet gives us.
 */
export const bySeverity = (p: Period) => (a: ObsKpi, b: ObsKpi) => {
  const d = severityOf(a, p) - severityOf(b, p)
  if (d !== 0) return d
  const n = a.name.trim().localeCompare(b.name.trim())
  return n !== 0 ? n : a.row - b.row
}

/** A category, theme or group is as urgent as its WORST indicator — so a
 *  category holding one at-risk KPI rises above one that is entirely healthy. */
export const worstSeverityOf = (rows: ObsKpi[], p: Period): number =>
  rows.length === 0 ? Number.MAX_SAFE_INTEGER : Math.min(...rows.map((k) => severityOf(k, p)))
