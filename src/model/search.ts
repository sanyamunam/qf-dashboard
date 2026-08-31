/**
 * Running a resolved question against the sheet — and never answering "0"
 * because of the way the question was read.
 *
 * The old parser ANDed every extracted term as a hard requirement, so one
 * wrong guess killed the whole query and the reader was shown a blank page
 * with no way to tell whether the data was missing or the search had
 * misunderstood them. Here every relaxation is stated, and the chips show what
 * was APPLIED rather than what was attempted.
 */
import { obsKpis, type ObsKpi } from './obs'
import { haystackOf, rowMatches, type Facet } from './lexicon'
import { resolveQuery, type Clause, type ResolvedQuery } from './query'
import { statusFor, severityOf, attainmentOf, STATUS_LABEL, type DashStatus, type Period } from './status'
import { entityOf } from './facets'
import { fmt } from './data'

export interface SearchResult {
  rows: ObsKpi[]
  /** the clauses that actually ran — what the chips must show */
  applied: Clause[]
  /** the free text that actually ran, after any relaxation */
  appliedText: string
  /** stated whenever the search had to give something up */
  note: string | null
  /** BOTaina's line over the result set */
  line: string | null
}

const matchesClause = (k: ObsKpi, c: Clause, p: Period) => {
  const st = statusFor(k, p)
  return c.entries.some((e) => rowMatches(k, e, st))
}

const runFilters = (rows: ObsKpi[], clauses: Clause[], text: string, p: Period) =>
  rows.filter((k) => {
    for (const c of clauses) if (!matchesClause(k, c, p)) return false
    if (text) {
      const hay = haystackOf(k)
      if (!text.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })

/** Riskiest first, always — a listing exists to surface what needs attention. */
const rank = (rows: ObsKpi[], p: Period) => [...rows].sort((a, b) => severityOf(a, p) - severityOf(b, p))

export function search(raw: string, p: Period, within: ObsKpi[] = obsKpis): SearchResult {
  const q: ResolvedQuery = resolveQuery(raw)
  const { clauses, freeText } = q

  const done = (rows: ObsKpi[], applied: Clause[], appliedText: string, note: string | null): SearchResult => {
    const ranked = rank(rows, p)
    return { rows: ranked, applied, appliedText, note, line: lineFor(ranked, applied, appliedText, p) }
  }

  // nothing asked — the whole portfolio, risk-ordered
  if (!clauses.length && !freeText) return done(within, [], '', null)

  let rows = runFilters(within, clauses, freeText, p)
  if (rows.length) return done(rows, clauses, freeText, null)

  /* Relaxing may only RECOVER a narrowed search, never replace one. A query
     that is nothing but an unknown word must land on the empty state — an
     honest "nothing matched" beats handing back all 240 rows as if that
     answered the question. */
  const hasFilters = clauses.length > 0

  // 1 · the phrase that named nothing is the likeliest culprit
  if (freeText && hasFilters) {
    rows = runFilters(within, clauses, '', p)
    if (rows.length)
      return done(rows, clauses, '', `No indicator matches “${freeText}”, so that word was set aside.`)
  }

  // 2 · loosen the named concepts to a text match on the same words
  if (hasFilters) {
    const terms = clauses.map((c) => c.term)
    rows = within.filter((k) => {
      const hay = haystackOf(k)
      return terms.every((t) => t.split(/\s+/).some((w) => hay.includes(w)))
    })
    if (rows.length)
      return done(rows, [], terms.join(' '), 'No indicator matches every filter, so they were loosened to a text search.')
  }

  // 3 · plain text across every field
  const text = (freeText || clauses.map((c) => c.term).join(' ')).trim()
  if (text) {
    const first = text.split(/\s+/)[0]
    rows = within.filter((k) => haystackOf(k).includes(first))
    if (rows.length) return done(rows, [], first, `Showing a plain text search for “${first}”.`)
  }

  // 4 · genuinely nothing
  return { rows: [], applied: clauses, appliedText: freeText, note: null, line: null }
}

/**
 * One line over the results, in BOTaina's voice: what was found, and what is
 * most urgent within it. It names indicators rather than counting them,
 * because "10 at risk" tells a CEO nothing he can act on.
 */
function lineFor(rows: ObsKpi[], clauses: Clause[], text: string, p: Period): string | null {
  if (!rows.length) return null
  const scope = clauses.map((c) => c.label).join(' · ')
  const what = scope || (text ? `matching “${text}”` : 'across the portfolio')
  const n = rows.length
  const noun = `indicator${n === 1 ? '' : 's'}`

  const risky = rows.filter((k) => {
    const s = statusFor(k, p)
    return s === 'atRisk' || s === 'belowTarget'
  })
  if (!risky.length) {
    const nr = rows.filter((k) => statusFor(k, p) === 'notReported').length
    return `${n} ${noun} · ${what} — none behind target${nr ? `, though ${nr} ${nr === 1 ? 'has' : 'have'} not reported` : ''}.`
  }
  /* the two furthest behind, named, with the arithmetic that says so */
  const worst = risky.slice(0, 2).map((k) => k.name.trim())
  const att = attainmentOf(risky[0], p)
  const pct = att !== null && Number.isFinite(att) ? `${Math.round(att * 100)}% of target` : null
  const lead =
    worst.length > 1 ? `${worst[0]} and ${worst[1]} are furthest behind` : `${worst[0]} is furthest behind`
  return `${n} ${noun} · ${what} — ${lead}${pct ? ` (${pct})` : ''}.`
}

/**
 * A manually picked facet value — a dropdown selection, or a filter arriving
 * from a status card. It is the same thing as a resolved phrase, so it becomes
 * a clause and composes with the typed query rather than running beside it.
 */
export interface Pick {
  facet: Facet
  value: string
  label: string
}

/**
 * The one entry point the UI uses: what was typed, plus what was clicked.
 *
 * Manual picks of the SAME facet go into ONE clause, so choosing two entities
 * means "either" — the rule the brief states as "values within a facet OR,
 * different facets AND". Typed concepts each keep their own clause, and a
 * typed concept that spans facets ORs across them.
 */
export function searchWith(typed: string, picks: Pick[], p: Period, within: ObsKpi[] = obsKpis): SearchResult {
  const byFacet = new Map<Facet, Pick[]>()
  for (const pk of picks) byFacet.set(pk.facet, [...(byFacet.get(pk.facet) ?? []), pk])

  const manual: Clause[] = [...byFacet.entries()].map(([facet, list]) => ({
    term: list.map((x) => x.value).join(' '),
    label: list.map((x) => x.label).join(' or '),
    entries: list.map((x) => ({ facet, value: x.value, label: x.label, terms: [x.value.toLowerCase()] })),
    manual: true,
  }))

  const q = resolveQuery(typed)
  const clauses = [...manual, ...q.clauses]

  if (!clauses.length && !q.freeText) {
    const ranked = rank(within, p)
    return { rows: ranked, applied: [], appliedText: '', note: null, line: lineFor(ranked, [], '', p) }
  }

  const rows = runFilters(within, clauses, q.freeText, p)
  if (rows.length) {
    const ranked = rank(rows, p)
    return { rows: ranked, applied: clauses, appliedText: q.freeText, note: null, line: lineFor(ranked, clauses, q.freeText, p) }
  }

  /* nothing matched everything — relax exactly as `search` does, but never
     give up a filter the reader picked by hand before one we inferred */
  if (q.freeText && clauses.length) {
    const r = runFilters(within, clauses, '', p)
    if (r.length) {
      const ranked = rank(r, p)
      return {
        rows: ranked,
        applied: clauses,
        appliedText: '',
        note: `No indicator matches “${q.freeText}”, so that word was set aside.`,
        line: lineFor(ranked, clauses, '', p),
      }
    }
  }
  if (manual.length && q.clauses.length) {
    const r = runFilters(within, manual, '', p)
    if (r.length) {
      const ranked = rank(r, p)
      return {
        rows: ranked,
        applied: manual,
        appliedText: '',
        note: 'Nothing matched the question and the filters together — showing the filters alone.',
        line: lineFor(ranked, manual, '', p),
      }
    }
  }
  return { rows: [], applied: clauses, appliedText: q.freeText, note: null, line: null }
}

/**
 * The ambiguity the sheet cannot resolve, surfaced rather than hidden.
 *
 * A Q1 cell of 0 means both "nothing achieved yet" and "not reported this
 * quarter", and no column separates them. The platform reads a zero as an
 * absence where the row has closed years behind it or is a rate — and as a
 * real zero otherwise — but that is an inference, and a result set that turns
 * on it should say so.
 */
export function zeroAmbiguityNote(rows: ObsKpi[], p: Period): string | null {
  const zeros = rows.filter((k) => k.q1 === 0 && statusFor(k, p) === 'atRisk')
  if (zeros.length < 2) return null
  return `${zeros.length} of these read exactly 0 for Q1 2026. The sheet uses 0 for both “nothing yet” and “not reported”, so whether they are at risk or simply unreported is a question for the owner.`
}

export { STATUS_LABEL, entityOf, fmt }
export type { Clause, DashStatus }
