/**
 * How a thematic listing is ORGANISED — three answers to one question.
 *
 * The listing groups by category, which is a taxonomy: it tells you what kind
 * of thing an indicator is. The client wants ordering by risk, which is a
 * state: it tells you what needs attention now. Those are different organising
 * principles competing for one list, and sorting cannot reconcile them —
 * sorting inside a taxonomy only reorders within boxes, and the boxes still
 * dictate the reading order.
 *
 * The numbers say how badly. Sustainability holds 10 indicators that are
 * behind, spread across 7 of its 8 categories; Social Progress holds 16 across
 * 10 of 15. Ordering the categories by their worst member barely helps there —
 * a reader still crosses most of the page to find them.
 *
 * So the organisation itself becomes the reader's choice:
 *
 *   attention  the taxonomy, worst category first, with the ones that are
 *              behind lifted into a band above it
 *   risk       no taxonomy at all — grouped by verdict
 *
 * There was briefly a third, "by category", which returned the taxonomy WITHOUT
 * the band. It was not a view: it was this one with a block deleted, and nobody
 * opens a dashboard thinking "show me the categories but hide what is wrong".
 * That is a thing you close, so the band is collapsible and the mode is gone.
 */
import type { Kpi } from './types'
import { obsForKpi } from './bridge'
import { severityOf, statusFor, STATUS_ORDER, STATUS_LABEL, type DashStatus, type Period } from './status'

export type ListingMode = 'attention' | 'risk'

export const LISTING_MODE_LABEL: Record<ListingMode, string> = {
  attention: 'By category',
  risk: 'By risk',
}

export const LISTING_MODE_HINT: Record<ListingMode, string> = {
  attention: 'The category listing, worst category first, with what is behind lifted to the top',
  risk: 'Every indicator grouped by its verdict, worst first',
}

/** One rendered block: a heading and the indicators under it. */
export interface Section {
  key: string
  heading: string
  kpis: Kpi[]
  /** a status dot beside the heading, where the heading IS a verdict */
  status?: DashStatus
  /** the band, which is a summary of rows that also appear below it */
  isBand?: boolean
}

/** An L2 card carries the Release-2 model; its verdict lives in the OBS rows. */
const statusOf = (k: Kpi, p: Period): DashStatus => {
  const row = obsForKpi(k)
  return row ? statusFor(row, p) : 'noTarget'
}
const sevOf = (k: Kpi, p: Period): number => {
  const row = obsForKpi(k)
  /* an indicator we cannot locate sorts last rather than being guessed at */
  return row ? severityOf(row, p) : Number.MAX_SAFE_INTEGER
}

/** Riskiest first; ties on name then id, so the order never flickers. */
export const byRisk = (p: Period) => (a: Kpi, b: Kpi) =>
  sevOf(a, p) - sevOf(b, p) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)

/** Behind, and therefore worth a band: at risk or below target. NOT
 *  not-reported — those are reporting gaps, and Organizational Excellence has
 *  27 of them against 4 genuinely behind, which would drown the signal in
 *  exactly the place it is needed. */
export const isBehind = (k: Kpi, p: Period): boolean => {
  const s = statusOf(k, p)
  return s === 'atRisk' || s === 'belowTarget'
}

/** A category is as urgent as its worst indicator, so one at-risk row lifts
 *  its whole category above an entirely healthy one. */
const worstIn = (list: Kpi[], p: Period) =>
  list.length ? Math.min(...list.map((k) => sevOf(k, p))) : Number.MAX_SAFE_INTEGER

function categorySections(kpis: Kpi[], p: Period): Section[] {
  const m = new Map<string, Kpi[]>()
  for (const k of kpis) m.set(k.category, [...(m.get(k.category) ?? []), k])
  return [...m.entries()]
    .map(([cat, list]) => ({ key: `cat:${cat}`, heading: cat, kpis: [...list].sort(byRisk(p)) }))
    /* the name breaks a tie, not the order the rows happened to arrive in:
       whole categories can share a worst severity (every one holding an
       at-risk row scores the same), and without this the page reshuffled
       between renders of identical data */
    .sort((a, b) => worstIn(a.kpis, p) - worstIn(b.kpis, p) || a.heading.localeCompare(b.heading))
}

/**
 * The organisation for a mode. One function, so the three modes cannot drift
 * into three different ideas of what "worst" means.
 */
export function sectionsFor(kpis: Kpi[], p: Period, mode: ListingMode): Section[] {
  if (mode === 'risk')
    return STATUS_ORDER.map((s) => ({
      key: `st:${s}`,
      heading: STATUS_LABEL[s],
      status: s,
      kpis: kpis.filter((k) => statusOf(k, p) === s).sort(byRisk(p)),
    })).filter((sec) => sec.kpis.length > 0)

  const cats = categorySections(kpis, p)
  const behind = kpis.filter((k) => isBehind(k, p)).sort(byRisk(p))
  /* no band when nothing is behind — its ABSENCE is the finding, and an empty
     "needs attention" box would be a box that says nothing */
  if (!behind.length) return cats
  return [
    { key: 'band', heading: 'Needs attention', kpis: behind, isBand: true },
    ...cats,
  ]
}

/** What the band is claiming, in words, so a count never stands alone. */
export function bandNote(behind: Kpi[], p: Period): string {
  const risk = behind.filter((k) => statusOf(k, p) === 'atRisk').length
  const below = behind.length - risk
  const parts = [
    risk ? `${risk} at risk` : null,
    below ? `${below} below target` : null,
  ].filter(Boolean)
  return `${parts.join(' and ')} — repeated below in ${behind.length === 1 ? 'its category' : 'their categories'}.`
}
