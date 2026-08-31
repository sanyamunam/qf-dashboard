/**
 * THE SHEET'S VOCABULARY — every word the search is allowed to act on.
 *
 * This is the inversion the rebuild turns on. The old parser asked "is this
 * word one of the phrases I know?" and made everything it did not recognise a
 * REQUIRED filter — so `under`, in "DIFI indicators under social progress",
 * became a hard requirement no indicator could satisfy and emptied the page.
 * One preposition, zero results.
 *
 * This asks the opposite question: "what in the sheet does this phrase name?"
 * A phrase that names something becomes a filter. A phrase that names nothing
 * becomes free text, which the fallback ladder is allowed to drop. Nothing
 * unrecognised can ever be a requirement, so no unanticipated word can empty a
 * result set — which is the only way a question nobody planned for can work.
 *
 * Every entry except the statuses is built FROM the data, so the vocabulary
 * cannot drift from the sheet it describes.
 */
import { obsKpis, type ObsKpi } from './obs'
import { entityOf, themeOf, dashOf, frameworkOf, inCategory, facetValues } from './facets'
import { STATUS_LABEL, type DashStatus } from './status'

export type Facet = 'entity' | 'theme' | 'cat' | 'framework' | 'dash' | 'status'

export interface LexEntry {
  facet: Facet
  /** the real sheet value, or the DashStatus key for a status */
  value: string
  /** what a chip shows for it */
  label: string
  /** lowercased surface forms that resolve here */
  terms: string[]
}

/* ─────────────────────────── status, and its words ───────────────────────────
 * The only facet whose vocabulary is NOT in the sheet: nobody types
 * "notReported". These are the words a QF executive actually uses, mapped onto
 * the five verdicts. Longer forms matter — "on target" and "no target" differ
 * by one letter and mean opposite things. */
const STATUS_TERMS: Record<DashStatus, string[]> = {
  atRisk: [
    'at risk',
    'risk',
    'struggling',
    'failing',
    'behind',
    'falling behind',
    'furthest behind',
    'worst',
    'underperforming',
    'under performing',
    'in trouble',
    'critical',
  ],
  belowTarget: ['below target', 'off target', 'short of target', 'missing target', 'under target', 'behind target'],
  onTarget: [
    'on target',
    'on track',
    'performing',
    'performing well',
    'doing well',
    'meeting target',
    'meets target',
    'ahead',
    'healthy',
    'good',
  ],
  noTarget: [
    'no target',
    'no target set',
    'without a target',
    'without target',
    'untargeted',
    'no targets',
    'nothing to measure against',
    'unmeasured',
  ],
  notReported: [
    'not reported',
    'unreported',
    'no reading',
    'no readings',
    'no data',
    'missing data',
    'missing',
    'stopped reporting',
    'gone quiet',
    'went quiet',
    'silent',
    'not submitted',
  ],
}

/** Words that name a facet but carry no value — "which ENTITY", "by THEME". */
const FACET_WORDS: Record<Facet, string[]> = {
  entity: ['entity', 'entities'],
  theme: ['theme', 'themes', 'thematic area', 'thematic areas'],
  cat: ['category', 'categories'],
  framework: ['framework', 'frameworks'],
  dash: ['dashboard', 'dashboards'],
  status: ['status', 'statuses'],
}

/**
 * Filler. Stripped BEFORE the sheet is consulted, so it can never be matched
 * and can never become a filter.
 *
 * `under` is on this list because of the bug that produced it: "DIFI
 * indicators UNDER social progress" returned nothing, because a preposition
 * survived into the free-text requirement. It is worth being explicit that
 * this list is a convenience, NOT the safety mechanism — the safety mechanism
 * is that unresolved words are soft. If a word is missing from here it costs a
 * slightly noisier chip, not an empty page.
 */
const FILLER = new Set(
  `show me us list find get give tell display see view
   all any anything everything something some each every
   which what whats whose who whom that this these those there their its it
   are is was were be been being am
   has have had do does did doing done
   the a an and or of for with within under over across from to in on at by about into
   kpi kpis indicator indicators metric metrics measure measures number numbers figure figures
   please can could would should will just now currently right
   how many much doing going`
    .split(/\s+/)
    .filter(Boolean),
)

/** Longest first, so "on target" wins over "target" and "no target" over "no". */
export const LEXICON: LexEntry[] = (() => {
  const out: LexEntry[] = []
  const v = facetValues()

  for (const [facet, values] of Object.entries(v) as [Facet, string[]][])
    for (const value of values)
      out.push({
        facet,
        value,
        label: value,
        /* the value itself, plus its significant words so "policy hub" and
           "hub" both reach Policy Hub, and "precision health" is reachable
           as "precision" */
        terms: [value.toLowerCase(), ...value.toLowerCase().split(/[\s/&-]+/).filter((w) => w.length >= 3)],
      })

  for (const [status, terms] of Object.entries(STATUS_TERMS) as [DashStatus, string[]][])
    out.push({
      facet: 'status',
      value: status,
      label: STATUS_LABEL[status],
      terms: [...terms, STATUS_LABEL[status].toLowerCase()],
    })

  return out
})()

/** A phrase is filler if EVERY word in it is. */
export const isFiller = (phrase: string): boolean =>
  phrase.split(/\s+/).every((w) => FILLER.has(w))

/**
 * Every lexicon entry a phrase names — across facets, deliberately.
 *
 * "education" is both a Category and half of the thematic area "Progressive
 * Education"; the reader meant either, so both come back and the caller ORs
 * them. Held as two separate required filters they intersected to almost
 * nothing, which is the second bug this rebuild exists to kill.
 *
 * Matching is case-insensitive, trimmed, and prefix-partial on a word
 * boundary: `difi`→DIFI, `qatariz`→Qatarization, `sustain`→Sustainability.
 */
export function resolvePhrase(phrase: string): LexEntry[] {
  const p = phrase.trim().toLowerCase()
  if (p.length < 2 || isFiller(p)) return []

  const exact = LEXICON.filter((e) => e.terms.some((t) => t === p))
  if (exact.length) return dedupe(exact)

  /**
   * Prefix from the START of a term, never mid-phrase.
   *
   * A word-boundary match let a bare word reach the tail of a multi-word term:
   * "well" matched "doing well" and quietly became an On-target filter, which
   * is how a stray adverb in "related to well" acquired meaning it never had.
   * Anchoring at ^ costs nothing, because every significant word of a value is
   * already its own term above — "education" reaches "Progressive Education"
   * that way rather than by matching inside the phrase.
   */
  const prefix = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  const partial = LEXICON.filter((e) => e.terms.some((t) => prefix.test(t)))
  return dedupe(partial)
}

/** A parent category already covers its children (`inCategory`), so listing
 *  both only lengthens the chip. */
function dedupe(entries: LexEntry[]): LexEntry[] {
  const seen = new Set<string>()
  const uniq = entries.filter((e) => {
    const key = `${e.facet}:${e.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const parents = uniq.filter((e) => e.facet === 'cat').map((e) => e.value)
  return uniq.filter(
    (e) => e.facet !== 'cat' || !parents.some((p) => p !== e.value && e.value.startsWith(`${p} `)),
  )
}

/** Does this row satisfy one lexicon entry? Status needs the period, so it is
 *  resolved by the caller and never here. */
export function rowMatches(k: ObsKpi, e: LexEntry, statusOfRow: DashStatus): boolean {
  switch (e.facet) {
    case 'entity':
      return facetOf(k, 'entity') === e.value
    case 'theme':
      return facetOf(k, 'theme') === e.value
    case 'framework':
      return facetOf(k, 'framework') === e.value
    case 'dash':
      return facetOf(k, 'dash') === e.value
    case 'cat':
      return inCat(k, e.value)
    case 'status':
      return statusOfRow === (e.value as DashStatus)
  }
}

const facetOf = (k: ObsKpi, f: 'entity' | 'theme' | 'framework' | 'dash') =>
  f === 'entity' ? entityOf(k) : f === 'theme' ? themeOf(k) : f === 'framework' ? frameworkOf(k) : dashOf(k)
const inCat = inCategory

/** Free text looks only where a human would: the name and what it measures. */
export const haystackOf = (k: ObsKpi): string =>
  `${k.name} ${entityOf(k)} ${k.category} ${themeOf(k)} ${k.definition ?? ''}`.toLowerCase()

export { FACET_WORDS }
export const allKpiNames = () => obsKpis.map((k) => k.name.trim().toLowerCase())
