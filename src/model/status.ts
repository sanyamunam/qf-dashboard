/**
 * THE status model. Five verdicts, one attainment calculation, one ordering.
 *
 * Everything that says how an indicator is doing comes from here — the status
 * cards, the chips, the AI summary, the search facet, every sort on every
 * listing. A surface that computes its own verdict is how a card and its
 * overlay come to disagree, so no surface is allowed to.
 *
 * ── attainment is measured against the TARGET, plainly ──
 *
 * It used to be measured against a pace bar — the share of the target expected
 * by the end of Q1 — and that was a mistake, for a reason worth recording so
 * it is not repeated.
 *
 * The arithmetic was not wrong. Dividing by a quarter of the target genuinely
 * answers "how are you doing against the pace". But it produced a card reading
 * "Beneficiaries · 8 of 30 · On target", and no amount of correct arithmetic
 * survives a reader seeing that. It also printed figures like "560% of pace",
 * a number with no meaning to anyone.
 *
 * So the status answers the question a reader is actually asking — how does
 * this stand against what was committed — and the elapsed-time argument moves
 * OUT of the calculation and INTO the caption, where a sentence can carry a
 * caveat that a percentage cannot:
 *
 *     8 of 30 · 27% of target
 *     At risk — a quarter into the year, roughly a quarter would be expected.
 *
 * The status stays honest and the context is still given. `expectedBy` below
 * survives for exactly that sentence, and is never used to grade anything.
 */
import { isLowerBetter, isPointInTime, lift, q1Of, type ObsKpi } from './obs'

export type Period = '2025' | 'q1'

/**
 * The thresholds, tunable — 50% is a starting position rather than a finding.
 *
 * `elapsed` is kept here beside them ON PURPOSE, so that the one place holding
 * the grading rule also holds the caveat that goes in the caption. It is the
 * share of the year gone by; QF has set no quarterly milestones, so it is this
 * platform's assumption and is stated on screen wherever it is used.
 */
export const RISK = {
  /** at or above its target — met or exceeded */
  onTarget: 1,
  /** between this and the target: behind, but within reach */
  belowTarget: 0.5,
  /** how much of the year Q1 represents — used in WORDS, never in the maths */
  elapsed: 0.25,
  elapsedLabel: 'roughly a quarter of the year',
  /** @deprecated the old single threshold — read `belowTarget` */
  threshold: 0.5,
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
  atRisk: 'under half its target',
  belowTarget: 'behind its target, but within reach',
  onTarget: 'met or exceeded its target',
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

/** How a reading accrues, which decides what its target means partway through
 *  a period. Named for the distinction rather than the regex behind it. */
export type Accrual = 'cumulative' | 'pointInTime'
export const accrualOf = (k: ObsKpi): Accrual => (isPointInTime(k) ? 'pointInTime' : 'cumulative')

/**
 * What the target would imply BY NOW, for the CAPTION only.
 *
 * Never used to grade an indicator — that was the bug. It exists so a card can
 * say "roughly 8 of 30 would be expected by now" beside a status computed
 * against the full 30.
 */
export function expectedBy(k: ObsKpi, p: Period): number | null {
  const t = targetFor(k, p)
  if (t === null) return null
  /* a completed year is a completed year: at p==='2025' elapsed is 1 and the
     rule reduces to a straight comparison */
  const elapsed = p === 'q1' ? RISK.elapsed : 1
  return isPointInTime(k) ? t : t * elapsed
}

/**
 * The share of the TARGET achieved — the number every verdict rests on, and the
 * one each card prints so a classification can always be traced back.
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
  const t = targetFor(k, p)
  if (t === null) return null
  /* a zero target on a higher-is-better indicator is an off-year, not a
     ceiling — the reference's nine idle rows. Watched, never judged. */
  if (!isLowerBetter(k) && t === 0) return null
  if (isLowerBetter(k)) {
    if (a === 0) return Number.POSITIVE_INFINITY // nothing spent against a ceiling is perfect
    return t === 0 ? 0 : t / a
  }
  return a / t
}

/**
 * Where an evenly-delivered indicator would stand BY NOW — as a mark on the
 * bar, or null where drawing one would say nothing.
 *
 * This is the elapsed-time caveat, drawn instead of written. A sentence had to
 * repeat itself on every at-risk card to carry it; a tick carries it once, in
 * the one place the reader is already looking, and lets them see the size of
 * the gap rather than read it.
 *
 * ONE definition, because `selectL1` draws the tick and `lineFor` suppresses
 * the sentence when it is drawn. Two conditions that could drift apart would
 * eventually leave a card with neither.
 *
 * Null where it would be noise: a closed year (elapsed is the whole year, so
 * the mark lands on the target), a point-in-time indicator (a level, not an
 * accrual — its target applies in full at any instant), or a target so small
 * that a quarter of it rounds below one whole unit.
 */
export function paceMarkerFor(k: ObsKpi, p: Period): number | null {
  if (p !== 'q1' || accrualOf(k) !== 'cumulative') return null
  const t = targetFor(k, p)
  if (t === null || t <= 0) return null
  const by = expectedBy(k, p)
  if (by === null || Math.round(by) < 1 || by >= t) return null
  return by
}

/**
 * The attainment below which an indicator is MATERIALLY behind — the line that
 * separates At risk from Below target.
 *
 * For an accruing count partway through a year it is the PACE LINE: the same
 * position the dashed "by now" tick marks on its bar. That tie is the whole
 * point. Before it, a card could show its fill crossing the tick and still be
 * labelled At risk — 31 indicators did, including Total Policy Adoptions at
 * 2 of 6, which is ahead of the 1.5 expected by now. The card argued with
 * itself, and the reader was right to disbelieve it.
 *
 * Now red means behind the tick, amber means past the tick but short of the
 * commitment, green means the commitment is met. The mark and the verdict
 * cannot disagree, because they are the same number.
 *
 * A fixed floor applies wherever no pace line exists:
 *   · a POINT-IN-TIME indicator is a level, not an accrual — a satisfaction
 *     score should already be at its target in March, so its expected-by-now
 *     IS its target, and tying the floor to that would make every rate below
 *     target at risk with nothing left in between
 *   · a LOWER-IS-BETTER indicator answers to a ceiling it must stay under all
 *     year; there is nothing to accrue toward
 *   · a CLOSED YEAR has fully elapsed, so its pace line is its target
 */
export function riskFloorFor(k: ObsKpi, p: Period): number {
  if (p === 'q1' && accrualOf(k) === 'cumulative' && !isLowerBetter(k)) return RISK.elapsed
  return RISK.belowTarget
}

export function statusFor(k: ObsKpi, p: Period): DashStatus {
  if (actualFor(k, p) === null) return 'notReported'
  const att = attainmentOf(k, p)
  if (att === null) return 'noTarget'
  if (att >= RISK.onTarget) return 'onTarget'
  return att < riskFloorFor(k, p) ? 'atRisk' : 'belowTarget'
}

/**
 * Grade a COMPLETED year's reading against that year's own target.
 *
 * A card that falls back to "51 (2025) against that year's target" is making a
 * claim about 2025, so its verdict has to be 2025's. Colouring it by the Q1
 * status painted it grey — the quarter was never reported, which is precisely
 * why the card reached for a closed year in the first place.
 *
 * No pace adjustment: a closed year is twelve months against a twelve-month
 * number. Same threshold, same polarity rule, so a dated mark and a current
 * one mean the same thing by the same test.
 */
export function statusForYear(k: ObsKpi, year: string): DashStatus {
  const a = lift(k, k.actuals[year] ?? null)
  if (a === null) return 'notReported'
  const t = lift(k, k.targets[year] ?? null)
  if (t === null || (!isLowerBetter(k) && t === 0)) return 'noTarget'
  let att: number | null
  if (isLowerBetter(k)) att = a === 0 ? Number.POSITIVE_INFINITY : t === 0 ? 0 : t / a
  else att = t === 0 ? null : a / t
  if (att === null) return 'noTarget'
  if (att >= RISK.onTarget) return 'onTarget'
  return att < RISK.belowTarget ? 'atRisk' : 'belowTarget'
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
