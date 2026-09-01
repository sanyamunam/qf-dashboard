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
import {
  RISK,
  STATUS_LABEL,
  accrualOf,
  RISK as RISK_,
  actualFor,
  attainmentOf,
  expectedBy,
  paceMarkerFor,
  bySeverity,
  statusCountsOf,
  statusFor,
  targetFor,
  type DashStatus,
} from './status'
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

/* ───────────────────── the five states, from status.ts ─────────────────────
 * The status model moved out. It grew a tunable threshold, a polarity-aware
 * attainment calculation and a severity ordering, and every one of those is a
 * pure function with an exact expected answer — which is what made it worth
 * unit-testing (src/model/status.test.ts) rather than leaving in this file
 * beside the periods, the category tree, the search and the AI summary.
 *
 * Re-exported here because every surface already imports these names from
 * `dash`. One definition, one import path, no second opinion. */
export {
  RISK,
  PACE,
  accrualOf,
  STATUS_ORDER,
  STATUS_DISPLAY_ORDER,
  STATUS_LABEL,
  STATUS_DOT,
  STATUS_SENSE,
  actualFor,
  targetFor,
  expectedBy,
  attainmentOf,
  paceMarkerFor,
  statusFor,
  statusCountsOf,
  severityOf,
  bySeverity,
  worstSeverityOf,
  type DashStatus,
} from './status'

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

/** The old argument order, kept so every call site stays untouched. */
export const statusCounts = (p: Period, within: ObsKpi[] = dashTen) => statusCountsOf(within, p)

/* The category tree and the facet accessors moved to facets.ts, so the search
   lexicon can build itself from the same functions the filters read — the only
   safe source for "every real value in the sheet" is the code that reads it.
   Re-exported here because every surface already imports them from `dash`. */
export {
  UNCAT,
  groupOf,
  subOf,
  buildTree,
  inCategory,
  entityOf,
  themeOf,
  dashOf,
  frameworkOf,
  type CatNode,
} from './facets'

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
  return a === null ? '' : `${fmt(a)}${unitOf(k)}`
}

/**
 * What stands in the headline slot when there IS no reading.
 *
 * The slot used to hold a bare em dash, in the same bold sidra-green the live
 * figures use — which is exactly what the chart reference forbids: "an em-dash
 * in a numeric slot reads as a value; this must read as an absence." On a CEO
 * dashboard a dash is worse than useless: it occupies the one place the eye
 * goes for a number and says nothing about whether something is broken, late,
 * or simply not due yet.
 *
 * So the slot answers the two questions a reader actually has — WHY there is
 * no number, and WHAT the last one was — and never claims a cadence the sheet
 * does not support. An indicator with prior annual readings and no quarterly
 * one is waiting for its year to close; one with nothing on record anywhere is
 * a reporting gap, and says so.
 */
export interface Absence {
  /** why there is no number — read before anything else */
  headline: string
  /** the last real reading, dated, so a magnitude survives the gap */
  detail: string
  /** a scheduled absence, not a missing one: changes the icon and the tone */
  awaited: boolean
}

export function absenceFor(k: ObsKpi, p: Period): Absence | null {
  if (actualFor(k, p) !== null) return null
  const last = [...A_YEARS]
    .reverse()
    .map((y) => [y, histOf(k, y)] as const)
    .find((x): x is readonly [string, number] => x[1] !== null)

  if (!last)
    return {
      headline: 'Not reported',
      detail: 'no reading on record in any period',
      awaited: false,
    }
  const value = `${fmt(last[1])}${unitOf(k)}`
  /* a row with closed years but no quarter is an annual reporter waiting for
     its year to end — the same tell `q1Of` uses to read its Q1 zero as absent */
  return p === 'q1'
    ? { headline: 'Awaiting year end', detail: `Last reported ${value} · FY ${last[0]}`, awaited: true }
    : { headline: 'Not reported', detail: `Last reported ${value} · FY ${last[0]}`, awaited: false }
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
  const tone = st === 'onTarget' ? GOOD : st === 'atRisk' ? BAD : FLAT
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
    const a = actualFor(k, p) as number

    /**
     * THE ELAPSED-TIME CAVEAT — the right home for the argument that used to
     * live in the arithmetic.
     *
     * The status is judged against the whole target, so an indicator a quarter
     * of the way to its number reads At risk in March. That is honest, and on
     * its own it is also incomplete: the year is not over. A sentence can
     * carry that where a percentage cannot, and it carries it in this
     * indicator's OWN figures, so no two cards say the same thing.
     *
     * Only where it is load-bearing: a cumulative count in a partial period
     * that is actually behind. A rate is a level that exists at an instant, and
     * an indicator already past its target needs no excuse made for it.
     */
    /**
     * The elapsed-time caveat is DRAWN now, not written: `paceMarkerFor` puts a
     * dashed "by now" tick on the bullet bar, which shows the SIZE of the gap
     * rather than stating it, and does not repeat itself down nine cards.
     *
     * The sentence survives only where the tick cannot be drawn but the caveat
     * still applies — a percentage takes an arc, which has nowhere to put the
     * mark. Both branches ask the SAME `paceMarkerFor`, so a card can never
     * end up with neither.
     */
    if (p === 'q1' && accrualOf(k) === 'cumulative' && a < t && paceMarkerFor(k, p) === null) {
      const by = expectedBy(k, p)
      /* and only where a quarter of the target is a whole unit or more — on a
         target of 1 it rounds to "about 0 expected by now", which is useless */
      if (by !== null && Math.round(by) >= 1)
        return `Three months in — about ${n(k, Math.round(by))} expected by now.`
    }

    /* a target that moved is the one thing a value-against-target mark can
       never show — and "on target" means something different once you know.
       Kept SHORT: the long form ran past the card's two-line clamp and was
       cut mid-sentence at "…before it was reset to". */
    /* MATERIALLY different, not merely different. 101,400 → 101,350 is a
       rounding adjustment, and calling it a reset spends the caption on
       nothing while implying the commitment was renegotiated. */
    const moved = anyTarget.filter(([, v]) => Math.abs(v - t) / Math.max(Math.abs(t), 1) >= 0.05)
    if (moved.length) {
      const lastMoved = moved[moved.length - 1]
      return `Commitment reset from ${n(k, lastMoved[1])} to ${n(k, t)}; read against the current one.`
    }

    if (years.length >= 2) {
      const vals = years.map(([, v]) => v)
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      return `Closed years ran ${n(k, lo)} to ${n(k, hi)}; the plan allows ${n(k, t)}.`
    }

    /**
     * Nothing specific left to say. The old fallback — "The first reading this
     * indicator carries, against a commitment of X" — ran verbatim on six
     * cards in one screenshot, which is a caption that costs space and says
     * nothing the figure above it has not. Silence is the better answer.
     */
    return ''
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
  onTarget: ObsKpi | null
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
  /* the WORST at-risk indicator, by the same severity the listings sort on —
     so the one the summary names is the one sitting at the top of the page */
  const atRisk = [...c.atRisk].sort(bySeverity(p))[0] ?? null
  /* the clearest good news, not merely the first row in sheet order */
  const performing = [...c.onTarget].sort((a, b) => missOf(b, p) - missOf(a, p))[0] ?? null
  const label = p === 'q1' ? 'this quarter' : 'in 2025'
  const plural = (x: number, s: string, pl: string) => `${x} ${x === 1 ? s : pl}`
  const pct = (k: ObsKpi | null) => {
    const a = k ? attainmentOf(k, p) : null
    return a === null || !Number.isFinite(a) ? null : Math.round(a * 100)
  }

  /* At risk LEADS. It is the only status that asks the reader to do something,
     so it is the first thing the sentence says and it is named, not counted. */
  const worstPct = pct(atRisk)
  const collapsed =
    c.atRisk.length > 0 && atRisk
      ? `${c.atRisk.length} of ${n} at risk ${label} — ${atRisk.name.trim()} is furthest behind${
          worstPct !== null ? ` at ${worstPct}% of its target` : ''
        }; ${c.belowTarget.length} below target, ${c.onTarget.length} on target, ${c.noTarget.length} without a target and ${plural(
          c.notReported.length,
          'has',
          'have',
        )} not reported.`
      : `Nothing at risk ${label}. ${c.onTarget.length} of ${n} on target and ${c.belowTarget.length} below; ${plural(
          c.noTarget.length,
          'has',
          'have',
        )} no target and ${plural(c.notReported.length, 'has', 'have')} not reported.`

  const cumulative = within.filter((k) => accrualOf(k) === 'cumulative').length
  const prose =
    p === 'q1'
      ? `Every figure here is measured against its full-year commitment — ${c.onTarget.length} have met theirs, ${c.belowTarget.length} sit between ${Math.round(RISK_.belowTarget * 100)}% and it, and ${c.atRisk.length} are under ${Math.round(RISK_.belowTarget * 100)}%. Three months of twelve have closed, so ${cumulative} of these ${n} accrue across the year and will read behind simply because it is young; that caveat is on each card, in its own numbers, rather than folded into the percentage. The ${c.notReported.length} not reported have no reading at all, so none of them can be at risk, and the ${c.noTarget.length} with no target carry a reading but nothing to judge it against.`
      : `The complete-year view: every figure is a closed twelve months against a full-year target. ${c.onTarget.length} met or beat their number, ${c.belowTarget.length} fell short of it and ${c.atRisk.length} came in under ${Math.round(RISK_.belowTarget * 100)}% of it; ${c.noTarget.length} carry no ${p} target and are watched rather than judged, and ${c.notReported.length} have nothing on record for the year.`
  return { collapsed, prose, onTarget: performing, atRisk }
}

/* ─────────────────────────────── search ───────────────────────────────
 *
 * The phrase-scanning parser that lived here is GONE, not patched.
 *
 * It asked "is this word one of the phrases I know?" and made everything it
 * did not recognise a REQUIRED filter — so `under`, in "DIFI indicators under
 * social progress", became a condition no row could satisfy and returned zero.
 * The same shape produced a chip reading "related to well". Lengthening the
 * stopword list only moves the next failure.
 *
 * The replacement asks the opposite question — "what in the sheet does this
 * phrase name?" — and lives in three modules that can be tested without React:
 *
 *   lexicon.ts   the sheet's vocabulary, indexed
 *   query.ts     phrase -> clauses (values within a clause OR, clauses AND)
 *   search.ts    clauses -> rows, with a relax ladder that states itself
 *
 * See docs/superpowers/specs/2026-08-29-ai-search-rebuild-design.md for the
 * approaches rejected, including why this is not an embedding search. */
export { search, searchWith, zeroAmbiguityNote, type SearchResult, type Pick } from './search'
export { resolveQuery, type Clause } from './query'

/** Kept for the manual facet dropdowns and the arriving-filter chips. */
export interface Chip {
  kind: 'dash' | 'status' | 'cat' | 'entity' | 'theme' | 'framework'
  value: string
  label: string
}

/* obs.ts primitives every surface reaches for through `dash` */
export { obsAsKpi, unitOf, lift, isPercentRow }
export type { ObsKpi }
