/**
 * The Executive Dashboard's period, status and category-tree model, and the
 * global-search machinery over all 240 OBS rows. One `statusFor` drives the
 * cards, the four counts, the AI summary and the search facet — none of them
 * can disagree.
 *
 * Brainstorm, rejected alternatives and verification:
 * docs/exec-dashboard-notes.md
 */
import {
  obsKpis,
  unitOf,
  isLowerBetter,
  isPercentRow,
  histOf,
  targOf,
  q1Of,
  lift,
  obsAsKpi,
  A_YEARS,
  type ObsKpi,
} from './obs'
import { fmt } from './data'
import type { Kpi, CellReading } from './types'

/* ─────────────────────────── the two periods ───────────────────────────
 * Neither period alone is sufficient — the five Education KPIs have no Q1
 * 2026 reading, and Total Policy Adoptions exists ONLY in Q1 2026. One
 * filter, one period, applied to everything at once; the two periods are
 * never mixed on screen, and a missing reading shows the not-reported
 * treatment rather than a figure borrowed from the other year. */
export type Period = '2025' | 'q1'

export const PERIOD_LABEL: Record<Period, string> = {
  '2025': '2025 · full year',
  q1: 'Q1 2026 · quarter',
}

/** The actual for the selected period, unit-normalised — or null, honestly. */
export const actualFor = (k: ObsKpi, p: Period): number | null => (p === 'q1' ? q1Of(k) : histOf(k, '2025'))

/** The target the period is judged against. A numeric 0 (Budget Variance) IS
 *  a target; `TBU` is null, never zero. */
export const targetFor = (k: ObsKpi, p: Period): number | null => (p === 'q1' ? targOf(k, '2026') : targOf(k, '2025'))

/* ─────────────────────────── the four states ─────────────────────────── */

export type DashStatus = 'performing' | 'atRisk' | 'notReported' | 'monitoring'

export const STATUS_LABEL: Record<DashStatus, string> = {
  performing: 'Performing well',
  atRisk: 'At risk',
  notReported: 'Not reported',
  monitoring: 'Monitoring',
}

/**
 * Dot colours. `performing` moved off the muted sage #3c6a5f onto QF's own
 * reserved semantic lime, which the chart layer (STATUS_COLOR.met) was already
 * using for the same verdict — so this removes an inconsistency rather than
 * inventing a colour. It also matters for the trends: a muted sage occupies
 * exactly the register a quiet thematic green needs, and measured in Lab it
 * sat ΔE 18 from Sustainability. Against lime that separation is comfortable,
 * which is what lets a trend carry its theme's hue at all.
 */
export const STATUS_DOT: Record<DashStatus, string> = {
  performing: '#78be20',
  atRisk: '#8a1538',
  notReported: '#9aaba5',
  monitoring: '#b8860b',
}

export const STATUS_SENSE: Record<DashStatus, string> = {
  performing: 'meets or exceeds target',
  atRisk: 'below target',
  notReported: 'no reading this period',
  monitoring: 'a reading, but no target to judge it against',
}

/* ───────────────────────── the pace assumption ─────────────────────────
 *
 * QF HAS NOT SET QUARTERLY MILESTONES, so even accrual is the PLATFORM'S
 * assumption and is stated on screen beside every count that rests on it.
 *
 * Without it, three months into the year every cumulative indicator is graded
 * against its full-year number and 99 of the 151 Thematic rows read as at
 * risk — two thirds of the portfolio, almost none of it because anything is
 * wrong. The Executive side never exposed this because most of its rows carry
 * no Q1 reading at all; on the Thematic side nearly every one does.
 *
 * This governs STATUS only. The L1 bullet bar still shows the real annual
 * target — WISH Beneficiaries reads "900 of 5,000", per the chart reference —
 * because the commitment is the commitment whatever month it is.
 */
export const PACE = {
  /** how much of the year Q1 represents */
  elapsed: 0.25,
  elapsedLabel: 'three of twelve months',
  /** slack on the pace bar before an indicator is called at risk, 0–1 */
  tolerance: 0,
} as const

/** How a reading accrues, which decides what its target means at Q1. */
export type Accrual = 'cumulative' | 'pointInTime'

/**
 * A POINT-IN-TIME indicator is a level that exists at an instant — a
 * satisfaction score of 70% is 70% whether you read it in March or December,
 * so it is compared against the target directly. A CUMULATIVE one accrues:
 * 200 internships over a year is roughly 50 by the end of Q1.
 *
 * Derived from the unit and the wording and EXPOSED so QF can correct it — it
 * is inference, not a column in the sheet. Note `engagement score` and not
 * bare `engagement`: "National Engagements" is a count of events, and reading
 * it as a level made eight rows look at risk when they were on pace.
 */
const POINT_IN_TIME =
  /percentage|%|ratio|rate|score|index|average|per employee|satisfaction|time to hire|turnover|utili[sz]ation/i

export const accrualOf = (k: ObsKpi): Accrual =>
  POINT_IN_TIME.test(`${k.definition ?? ''} ${k.name}`) ? 'pointInTime' : 'cumulative'

/** What the target asks for BY NOW, rather than by December. */
export function expectedBy(k: ObsKpi, p: Period): number | null {
  const t = targetFor(k, p)
  if (t === null) return null
  /* a completed year is a completed year: at p==='2025' elapsed is 1 and the
     rule reduces to a straight comparison */
  const elapsed = p === 'q1' ? PACE.elapsed : 1
  return accrualOf(k) === 'pointInTime' ? t : t * elapsed
}

/**
 * Polarity governs direction: Budget Variance is `Red` (lower is better), so
 * 18% against a ceiling of 0 is at risk, never performing.
 *
 * `actualFor` has already turned an annual reporter's Q1 zero into an absence
 * (see `q1Of` in obs.ts), so % Employee Turnover reads Not reported rather
 * than being graded as a collapse to zero.
 */
export function statusFor(k: ObsKpi, p: Period): DashStatus {
  const a = actualFor(k, p)
  if (a === null) return 'notReported'
  const t = targetFor(k, p)
  /* a zero target on a higher-is-better indicator is an off-year, not a
     ceiling — the reference's nine idle rows. Watched, not judged. */
  if (t === null || (!isLowerBetter(k) && t === 0)) return 'monitoring'
  const bar = expectedBy(k, p) as number
  const slack = isLowerBetter(k) ? bar * (1 + PACE.tolerance) : bar * (1 - PACE.tolerance)
  return (isLowerBetter(k) ? a <= slack : a >= slack) ? 'performing' : 'atRisk'
}

/** Reported before, silent now: no reading this period, but at least one
 *  completed year on record. Distinct from never-reported — the question
 *  "what has stopped reporting" is about the ones that went quiet. */
export const stoppedReporting = (k: ObsKpi, p: Period): boolean =>
  actualFor(k, p) === null && A_YEARS.some((y) => histOf(k, y) !== null)

/* ─────────────────────────── the dashboard ten ─────────────────────────── */

export const execRows: ObsKpi[] = obsKpis.filter((k) => (k.dashboard ?? '').startsWith('Exec'))

/** The other 151. The two sets are never blended in a count or a summary. */
export const thematicRows: ObsKpi[] = obsKpis.filter((k) => !(k.dashboard ?? '').startsWith('Exec'))

/** Read from the sheet's blue fill via the parser — never a hard-coded list. */
export const dashTen: ObsKpi[] = execRows.filter((k) => k.highlighted)

export function statusCounts(p: Period, within: ObsKpi[] = dashTen): Record<DashStatus, ObsKpi[]> {
  const out: Record<DashStatus, ObsKpi[]> = { performing: [], atRisk: [], notReported: [], monitoring: [] }
  for (const k of within) out[statusFor(k, p)].push(k)
  return out
}

/* ─────────────────────── the category tree, parsed ───────────────────────
 * `Category` is `Parent - Child`, split on the space-hyphen-space delimiter
 * at parse time. A value with no delimiter is a standalone group. A row with
 * no category at all (Patents Granted – Other) routes to an explicit
 * `Uncategorised` group — never a group called `None`. */
export const UNCAT = 'Uncategorised'

export const groupOf = (k: ObsKpi) => (k.category.trim() ? k.group : UNCAT)
export const subOf = (k: ObsKpi) => (k.category.trim() ? k.subgroup : UNCAT)

export interface CatNode {
  parent: string
  total: number
  /** empty = standalone: cards render directly under the parent */
  subs: { name: string; total: number }[]
}

export function buildTree(rows: ObsKpi[]): CatNode[] {
  const parents = new Map<string, Map<string, number>>()
  for (const k of rows) {
    const g = groupOf(k)
    if (!parents.has(g)) parents.set(g, new Map())
    const subs = parents.get(g)!
    const s = subOf(k)
    subs.set(s, (subs.get(s) ?? 0) + 1)
  }
  return [...parents].map(([parent, subs]) => {
    const total = [...subs.values()].reduce((a, b) => a + b, 0)
    const subList = [...subs].map(([name, n]) => ({ name, total: n }))
    const standalone = subList.length === 1 && subList[0].name === parent
    return { parent, total, subs: standalone ? [] : subList.sort((a, b) => b.total - a.total) }
  })
}

/** Either level matches — selecting a parent includes all its children. */
export const inCategory = (k: ObsKpi, label: string): boolean => groupOf(k) === label || subOf(k) === label

/* ────────────── the card's Kpi, per period — no borrowed figures ────────────── */

const reading = (v: number | null): CellReading => ({ value: v, raw: null, flag: null })

/**
 * Under Q1 2026 an annual KPI gets an EMPTY series — the not-reported
 * treatment, never its 2025 figure standing in. Under 2025 the series stops
 * at 2025 and the year rides with the figure (the card does this itself).
 * The drawer reads the full history separately (obsAsKpi), where a chart
 * labelled by year is honest.
 */
export function cardKpi(k: ObsKpi, p: Period): Kpi {
  const base = obsAsKpi(k.row)
  const a = actualFor(k, p)
  if (a === null)
    return {
      ...base,
      id: `${base.id}-${p}`,
      actuals: { ...base.actuals, '2026Q1': reading(null) },
      movementSeries: [],
      historyPoints: 0,
      hasEnoughHistoryForLine: false,
      state: 'REPORTS_AT_YEAR_END',
    }
  if (p === 'q1') return { ...base, id: `${base.id}-q1` }
  return {
    ...base,
    id: `${base.id}-2025`,
    actuals: { ...base.actuals, '2026Q1': reading(null) },
    state: 'REPORTS_AT_YEAR_END',
  }
}

/* ──────────────── what a card can honestly draw, per period ────────────────
 * A KPI that cannot be judged against a target is still a trajectory. The
 * decision is made once, here, so the mark, the delta and the AI line agree.
 *
 * Only COMPLETED annual years are ever plotted. Footfall closed 2025 at
 * 3,051,433 and reads 486,119 for Q1 2026 alone; on one axis that is an 84%
 * collapse when it is a quarter beside a year. The partial period is the
 * card's headline figure and nothing else. */

/** Completed annual readings, oldest first, capped at the most recent four —
 *  enough to read a direction, few enough to label directly. The overlay
 *  carries the full series. */
export function completedYears(k: ObsKpi, cap = 4): [string, number][] {
  const pts = A_YEARS.map((y) => [y, histOf(k, y)] as [string, number | null]).filter(
    (p): p is [string, number] => p[1] !== null,
  )
  return pts.slice(-cap)
}

/** The current partial reading — a quarter, never a year. */
export const partialReading = (k: ObsKpi): number | null => q1Of(k)

export type MarkKind = 'judged' | 'trend' | 'twoReadings' | 'firstReading' | 'nothing'

/**
 * `judged` only where the period has both a reading and a target. Otherwise
 * the card answers "which way is this moving" — which needs three points to
 * be a direction at all. Two readings are a pair, not a trajectory; one is a
 * baseline.
 */
export function markKindFor(k: ObsKpi, p: Period): MarkKind {
  if (actualFor(k, p) !== null && targetFor(k, p) !== null) return 'judged'
  const years = completedYears(k)
  if (years.length >= 3) return 'trend'
  const total = years.length + (partialReading(k) !== null ? 1 : 0)
  if (total >= 2) return 'twoReadings'
  if (total === 1) return 'firstReading'
  return 'nothing'
}

/* ───────────────────── the delta, comparing like with like ─────────────────
 * A RATE measured over a quarter is comparable to the same rate over a year —
 * Budget Variance at 18% this quarter against 10% for all of 2025 is a real
 * widening. A COUNT is not: a quarter's footfall against a full year's is
 * arithmetic nonsense, and it was drawing a red decline arrow on a KPI that
 * has grown every year on record. */
export interface CardDelta {
  dir: 'up' | 'down' | 'flat'
  tone: string
  basis: string
}

const GOOD = '#3c6a5f'
const BAD = '#8a1538'
const FLAT = '#7e938d'

export function deltaFor(k: ObsKpi, p: Period): CardDelta {
  const a = actualFor(k, p)
  if (a === null) return { dir: 'flat', tone: FLAT, basis: 'no reading this period' }

  const years = completedYears(k)
  let prev: [string, number] | null = null
  if (p === '2025') {
    // 2025 against 2024 — two completed years
    prev = years.length >= 2 ? years[years.length - 2] : null
  } else if (isPercentRow(k)) {
    // a rate holds its meaning across period lengths
    prev = years.length >= 1 ? years[years.length - 1] : null
  }

  if (!prev) return { dir: 'flat', tone: FLAT, basis: p === 'q1' ? 'Q1 2026' : 'first reading' }

  const delta = a - prev[1]
  const basis = `vs FY${prev[0]}`
  if (Math.abs(delta) < Math.abs(prev[1] || 1) * 0.02) return { dir: 'flat', tone: FLAT, basis }
  const favourable = isLowerBetter(k) ? delta < 0 : delta > 0
  return { dir: delta > 0 ? 'up' : 'down', tone: favourable ? GOOD : BAD, basis }
}

/** A short note for the comparison slot when a card has a current reading but
 *  no prior year to measure against — so the absence of a YoY is explained
 *  rather than silent. Returns null when a YoY exists, or when there is no
 *  reading at all (the mark already says "not reported" / "year end"). */
export function yoyNoteFor(k: ObsKpi, p: Period): string | null {
  if (actualFor(k, p) === null) return null
  if (yoyFor(k, p) !== null) return null
  return 'No prior year'
}

/* ─────────────────────────── year-over-year ───────────────────────────
 * The explicit YoY value behind the arrow. Same "compare like with like" rule
 * as deltaFor: 2025 is measured against 2024; a rate under Q1 holds its meaning
 * against the last closed year; a COUNT under Q1 has no honest prior to divide
 * by, so it returns null rather than a manufactured number. A rate moves in
 * POINTS (pp), a count in percent — the two are never conflated. */
export interface Yoy {
  text: string
  dir: 'up' | 'down' | 'flat'
  tone: string
}

export function yoyFor(k: ObsKpi, p: Period): Yoy | null {
  const a = actualFor(k, p)
  if (a === null) return null
  const years = completedYears(k)
  /* any KPI with a prior completed year gets a YoY: 2025 is measured against
     2024, Q1 2026 against the last closed year. (A cumulative count's quarter
     against a full year is not like-with-like — the figure up top is a quarter,
     the prior is a year — but it is shown wherever a prior exists.) */
  let prev: [string, number] | null = null
  if (p === '2025') prev = years.length >= 2 ? years[years.length - 2] : null
  else prev = years.length >= 1 ? years[years.length - 1] : null
  if (!prev || prev[1] === 0) return null

  const delta = a - prev[1]
  const pct = isPercentRow(k)
  const magnitude = pct ? delta : (delta / Math.abs(prev[1])) * 100
  const flat = Math.abs(delta) < Math.abs(prev[1] || 1) * 0.02
  const favourable = isLowerBetter(k) ? delta < 0 : delta > 0
  return {
    text: `${magnitude > 0 ? '+' : ''}${fmt(magnitude)}${pct ? ' pp' : '%'}`,
    dir: flat ? 'flat' : delta > 0 ? 'up' : 'down',
    tone: flat ? FLAT : favourable ? GOOD : BAD,
  }
}

/** The headline figure for the period — never borrowed from the other one. */
export function figureFor(k: ObsKpi, p: Period): string {
  const a = actualFor(k, p)
  return a === null ? '—' : `${fmt(a)}${unitOf(k)}`
}

/**
 * The card's TARGET comparison — the honest same-scale reading a partial
 * quarter can make when a year-over-year cannot. Q1 2026 is measured against
 * the 2026 commitment; 2025 against the 2025 one. Colour is the same statusFor
 * verdict the four state cards use, so the chip never disagrees with them.
 * Where there is no numeric target (TBU, or a zero ceiling on a higher-is-
 * better off-year) there is nothing to compare and it returns null rather than
 * an invented ratio.
 */
export function targetCompareFor(k: ObsKpi, p: Period): { text: string; tone: string } | null {
  const a = actualFor(k, p)
  const t = targetFor(k, p)
  if (a === null || t === null) return null
  // a zero target on a higher-is-better indicator is an off-year, not judged
  if (t === 0 && !isLowerBetter(k)) return null
  const st = statusFor(k, p)
  const tone = st === 'performing' ? GOOD : st === 'atRisk' ? BAD : FLAT
  return { text: `vs target ${fmt(t)}${unitOf(k)}`, tone }
}

/* ─────────────────── the card's line, per KPI and period ─────────────────── */

const n = (k: ObsKpi, v: number) => `${fmt(v)}${unitOf(k)}`

/** `a` or `an` for a figure, by how it is read aloud: 8… and 11/18… take `an`. */
const article = (figure: string): string => {
  const digits = figure.replace(/[^\d]/g, '')
  return /^8/.test(digits) || /^1[18]/.test(digits) ? 'An' : 'A'
}

/**
 * The card's sentence — written to say what the MARK CANNOT.
 *
 * The chart already carries the level, the direction and the endpoints. So a
 * judged card gets the historical band or the fact that its target moved; a
 * trend card gets the governance reason no verdict exists; a two-reading card
 * gets why those two numbers must not be read as a fall. Nothing here repeats
 * a number the mark has already labelled.
 */
export function lineFor(k: ObsKpi, p: Period): string {
  const kind = markKindFor(k, p)
  const years = completedYears(k)
  const anyTarget = [...A_YEARS, '2026', '2027', '2028']
    .map((y) => [y, targOf(k, y)] as [string, number | null])
    .filter((x): x is [string, number] => x[1] !== null && x[1] > 0)

  if (kind === 'judged') {
    const t = targetFor(k, p) as number
    /* a target that moved is the one thing a value-against-target mark can
       never show — and "on target" means something different once you know */
    const moved = anyTarget.filter(([, v]) => v !== t)
    if (moved.length) {
      const lastMoved = moved[moved.length - 1]
      return `The commitment was ${n(k, lastMoved[1])} through ${lastMoved[0]} before it was reset to ${n(k, t)}; performance is read against the current one.`
    }
    if (years.length >= 2) {
      const vals = years.map(([, v]) => v)
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      return `Closed years have run ${n(k, lo)} to ${n(k, hi)} — the plan allows ${n(k, t)}.`
    }
    /* named, so eight first-reading cards in one listing do not all carry the
       same sentence — the commitment is the part that differs */
    return `The first reading this indicator carries, against a commitment of ${n(k, t)} for ${p === 'q1' ? '2026' : '2025'}.`
  }

  if (kind === 'trend') {
    const future = anyTarget.find(([y]) => Number(y) >= 2026)
    if (future)
      /* "A 80%" — the article follows how the figure is SPOKEN, and 8, 11 and
         18 all open with a vowel sound */
      return `${article(n(k, future[1]))} ${n(k, future[1])} commitment stands for ${future[0]}, measured when the year closes — not in a quarter.`
    /**
     * The old sentence ran verbatim on four of five cards in one screenshot,
     * which is a caption saying nothing. Every value is labelled on the mark
     * now, so this states the one thing the labels do not: the shape of the
     * whole run, which differs card to card.
     */
    if (years.length >= 2) {
      const first = years[0][1]
      const last = years[years.length - 1][1]
      const pts = unitOf(k) === '%'
      const swing = pts ? last - first : first === 0 ? null : (last - first) / Math.abs(first)
      const flat = swing === null || Math.abs(swing) < (pts ? 1 : 0.03)
      const shape = flat
        ? 'has held level'
        : `is ${swing! > 0 ? 'up' : 'down'} ${pts ? `${Math.abs(Math.round(swing!))} points` : `${Math.round(Math.abs(swing!) * 100)}%`}`
      return `Untargeted, so direction only: across ${years.length} closed years it ${shape}.`
    }
    return 'Untargeted — direction is tracked, but never scored.'
  }

  if (kind === 'twoReadings')
    return 'A full year beside a single quarter — different lengths of time, and too few readings to call a direction.'

  if (kind === 'firstReading') {
    const future = anyTarget.find(([y]) => Number(y) >= 2026)
    return future
      ? `A baseline: the first reading on record, with a ${n(k, future[1])} commitment standing for ${future[0]}.`
      : 'A baseline: the first reading on record, with no prior period to compare it against.'
  }

  return 'Nothing has been reported for this indicator in any period on record.'
}

/* ─────────────────────── the AI summary, per period ─────────────────────── */

export interface DashSummary {
  collapsed: string
  prose: string
  performing: ObsKpi | null
  atRisk: ObsKpi | null
}

const missOf = (k: ObsKpi, p: Period): number => {
  const a = actualFor(k, p) as number
  const t = targetFor(k, p) as number
  return Math.abs(a - t) / Math.max(Math.abs(t), 1)
}

/**
 * The summary, for whichever portfolio is on screen. Both lines are computed
 * from the same `statusFor` that drives the cards below, so the summary can
 * never contradict them, and the two named KPIs come from those buckets rather
 * than being chosen by hand.
 */
export function summaryFor(p: Period, within: ObsKpi[] = dashTen): DashSummary {
  const c = statusCounts(p, within)
  const n = within.length
  const atRisk = [...c.atRisk].sort((a, b) => missOf(b, p) - missOf(a, p))[0] ?? null
  /* the clearest good news, not merely the first row in sheet order */
  const performing = [...c.performing].sort((a, b) => missOf(b, p) - missOf(a, p))[0] ?? null
  const label = p === 'q1' ? 'this quarter' : 'in 2025'
  const plural = (x: number, s: string, pl: string) => `${x} ${x === 1 ? s : pl}`

  const collapsed = `${c.performing.length} of ${n} on target, ${c.atRisk.length} at risk ${label} — ${
    atRisk ? `${atRisk.name.trim()} is the one to look at` : 'nothing needs intervention'
  }; ${plural(c.monitoring.length, 'has', 'have')} no target and ${plural(c.notReported.length, 'has', 'have')} not reported.`

  const cumulative = within.filter((k) => accrualOf(k) === 'cumulative').length
  const prose =
    p === 'q1'
      ? `Three months in, so ${cumulative} of these ${n} are judged against ${Math.round(PACE.elapsed * 100)}% of their annual number rather than the whole of it — even accrual is the platform's assumption, not a milestone QF has set. The ${c.notReported.length} not reported are indicators that report at year end, so their Q1 cell is an absence rather than a zero. The ${c.monitoring.length} under Monitoring carry no target, so no verdict is available and none is invented.`
      : `The complete-year view: every figure is a closed twelve months against a full-year target, so no pace assumption applies. ${c.performing.length} met or beat their number and ${c.atRisk.length} did not; ${c.monitoring.length} carry no 2025 target and are watched rather than judged, and ${c.notReported.length} have nothing on record for the year.`
  return { collapsed, prose, performing, atRisk }
}

/* ───────────────────── search: filters, matching, NL ───────────────────── */

export interface SearchFilters {
  q: string
  dash: string[]
  status: DashStatus[]
  cats: string[]
  entities: string[]
  themes: string[]
  frameworks: string[]
  /** "what has stopped reporting" — silent now, but with history on record */
  stopped: boolean
}

export const entityOf = (k: ObsKpi) => k.proposedEntity ?? k.entity ?? 'Unassigned'
export const themeOf = (k: ObsKpi) => k.theme ?? 'Unassigned'
export const dashOf = (k: ObsKpi) => ((k.dashboard ?? '').startsWith('Exec') ? 'Executive' : 'Thematic')
/** 12 Executive rows carry no framework — an explicit facet value, not a blank. */
export const frameworkOf = (k: ObsKpi) => k.framework ?? 'Unassigned'

export function matches(k: ObsKpi, f: SearchFilters, p: Period, skip?: keyof SearchFilters): boolean {
  const term = f.q.trim().toLowerCase()
  if (skip !== 'q' && term) {
    const hay = `${k.name} ${entityOf(k)} ${k.category} ${themeOf(k)} ${k.definition ?? ''}`.toLowerCase()
    if (!term.split(/\s+/).every((w) => hay.includes(w))) return false
  }
  if (skip !== 'dash' && f.dash.length && !f.dash.includes(dashOf(k))) return false
  if (skip !== 'status' && f.status.length && !f.status.includes(statusFor(k, p))) return false
  if (skip !== 'cats' && f.cats.length && !f.cats.some((c) => inCategory(k, c))) return false
  if (skip !== 'entities' && f.entities.length && !f.entities.includes(entityOf(k))) return false
  if (skip !== 'themes' && f.themes.length && !f.themes.includes(themeOf(k))) return false
  if (skip !== 'frameworks' && f.frameworks.length && !f.frameworks.includes(frameworkOf(k))) return false
  if (skip !== 'stopped' && f.stopped && !stoppedReporting(k, p)) return false
  return true
}

export interface Chip {
  kind: 'dash' | 'status' | 'cat' | 'entity' | 'theme' | 'framework' | 'stopped'
  value: string
  label: string
  /** derived from typed text — replaced when a new query is submitted */
  fromText?: boolean
}

const STATUS_PHRASES: [RegExp, DashStatus][] = [
  [/\bat risk\b|\brisk\b|\bbehind\b|\bfailing\b|\boff target\b/, 'atRisk'],
  [/\bperforming\b|\bdoing well\b|\bon target\b|\bmeets? target\b/, 'performing'],
  [/\bnot reported\b|\bmissing (?:data|readings?)\b|\bno readings?\b/, 'notReported'],
  [/\bno targets?\b|\bwithout (?:a )?targets?\b|\bmonitoring\b/, 'monitoring'],
]

/**
 * `which KPIs are at risk`, `what has no target`, `education indicators` all
 * resolve to structured chips; whatever remains is a text term. The chips are
 * shown, removable, so the reader sees how the question was understood.
 */
export function interpret(rawQ: string): { chips: Chip[]; residue: string } {
  let q = ` ${rawQ.toLowerCase()} `
  const chips: Chip[] = []
  const take = (re: RegExp) => {
    const m = q.match(re)
    if (m) q = q.replace(re, ' ')
    return m
  }

  /* "stopped reporting" is not the same as "not reported" — it asks for the
     rows that went QUIET, excluding the ones that never reported at all */
  if (take(/\bstopp?ed reporting\b|\bwent (?:quiet|silent|dark)\b|\bno longer report(?:s|ing)?\b/))
    chips.push({ kind: 'stopped', value: 'stopped', label: 'Stopped reporting' })
  for (const [re, s] of STATUS_PHRASES) if (take(re)) chips.push({ kind: 'status', value: s, label: STATUS_LABEL[s] })
  if (take(/\bexecutive\b/)) chips.push({ kind: 'dash', value: 'Executive', label: 'Executive dashboard' })
  if (take(/\bthematic\b/)) chips.push({ kind: 'dash', value: 'Thematic', label: 'Thematic dashboard' })
  if (take(/\bstrategic\b/)) chips.push({ kind: 'framework', value: 'Strategic', label: 'Strategic framework' })
  if (take(/\bimpact\b/)) chips.push({ kind: 'framework', value: 'Impact', label: 'Impact framework' })
  if (take(/\boperational\b/)) chips.push({ kind: 'framework', value: 'Operational', label: 'Operational framework' })

  const tree = buildTree(obsKpis)
  const catNames = [...new Set(tree.flatMap((t) => [t.parent, ...t.subs.map((s) => s.name)]))].filter((c) => c !== UNCAT)
  const themes = [...new Set(obsKpis.map((k) => k.theme).filter((t): t is string => !!t && t !== 'All'))]
  const entities = [...new Set(obsKpis.map((k) => k.proposedEntity).filter((e): e is string => !!e))]
  const vocab: { kind: Chip['kind']; value: string }[] = [
    ...catNames.map((v) => ({ kind: 'cat' as const, value: v })),
    ...themes.map((v) => ({ kind: 'theme' as const, value: v })),
    ...entities.map((v) => ({ kind: 'entity' as const, value: v })),
  ].sort((a, b) => b.value.length - a.value.length)
  for (const v of vocab) {
    const re = new RegExp(`\\b${v.value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (take(re)) chips.push({ kind: v.kind, value: v.value, label: v.value })
  }

  /* question marks and other punctuation are part of asking, not of any
     indicator's name — left in, "at risk?" would search for a literal "?" */
  q = q.replace(/[?!.,;:'"“”‘’]/g, ' ')
  q = q.replace(/\b(which|what|anything|kpis?|indicators?|show|me|all|are|is|has|have|the|a|an|in|of|for|with)\b/g, ' ')
  return { chips, residue: q.replace(/\s+/g, ' ').trim() }
}

export function chipsToFilters(chips: Chip[], residue: string): SearchFilters {
  const f: SearchFilters = { q: residue, dash: [], status: [], cats: [], entities: [], themes: [], frameworks: [], stopped: false }
  for (const c of chips) {
    if (c.kind === 'dash') f.dash.push(c.value)
    else if (c.kind === 'status') f.status.push(c.value as DashStatus)
    else if (c.kind === 'cat') f.cats.push(c.value)
    else if (c.kind === 'entity') f.entities.push(c.value)
    else if (c.kind === 'theme') f.themes.push(c.value)
    else if (c.kind === 'framework') f.frameworks.push(c.value)
    else if (c.kind === 'stopped') f.stopped = true
  }
  return f
}

export { obsAsKpi, unitOf, lift, isPercentRow }
export type { ObsKpi }
