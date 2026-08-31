/**
 * A question becomes clauses — and never becomes a filter it cannot justify.
 *
 * One CLAUSE per concept the reader named. Its entries OR together, even
 * across facets; clauses AND with each other. That distinction is the second
 * bug this rebuild kills: `education` names both a Category and the thematic
 * area "Progressive Education", and holding them as two required filters
 * intersected 45 rows with 50 to leave almost nothing. The reader meant
 * either.
 *
 * Anything that names nothing is free text, which the search is allowed to
 * drop. It can narrow a result set; it can never be the reason one is empty.
 */
import { isFiller, resolvePhrase, type LexEntry } from './lexicon'

export interface Clause {
  /** what the reader typed, for the chip */
  term: string
  label: string
  /** the sheet values it named — these OR */
  entries: LexEntry[]
  /** picked from a dropdown rather than resolved from the question — the UI
   *  removes the two differently, and a manual filter is never relaxed away */
  manual?: boolean
}

export interface ResolvedQuery {
  clauses: Clause[]
  /** everything that named nothing — soft, never required */
  freeText: string
}

/** How many words a single concept may span. "Reports and Strategic
 *  Publications" is four; nothing real in the sheet is longer. */
const MAX_SPAN = 4

export function resolveQuery(raw: string): ResolvedQuery {
  /* punctuation is part of asking, not of any indicator's name — left in,
     "at risk?" would search for a literal "?" */
  const words = raw
    .toLowerCase()
    .replace(/[?!.,;:'"“”‘’()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const clauses: Clause[] = []
  const leftover: string[] = []
  const seen = new Set<string>()

  let i = 0
  while (i < words.length) {
    let took = 0
    /* longest span first, so "on target" beats "target" and "social progress"
       is one concept rather than two */
    for (let n = Math.min(MAX_SPAN, words.length - i); n >= 1 && !took; n--) {
      const phrase = words.slice(i, i + n).join(' ')
      if (isFiller(phrase)) continue
      const entries = resolvePhrase(phrase)
      if (!entries.length) continue
      /* one concept, one clause — a term repeated must not filter twice */
      const key = entries.map((e) => `${e.facet}:${e.value}`).sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        clauses.push({ term: phrase, label: labelFor(phrase, entries), entries })
      }
      took = n
    }
    if (took) i += took
    else {
      /* names nothing — keep it only if it is not filler, so "under" and
         "show me" never reach the free-text requirement */
      if (!isFiller(words[i])) leftover.push(words[i])
      i++
    }
  }

  return { clauses, freeText: leftover.join(' ').trim() }
}

/**
 * Name the chip for the SHEET's value when the phrase is one — so "difi"
 * reads DIFI and "sustain" reads Sustainability, rather than echoing a
 * half-typed word back at the reader. Only an ambiguous phrase falls back to
 * what they typed, and a chip never lists the facets it expanded into.
 */
function labelFor(phrase: string, entries: LexEntry[]): string {
  /* the value that IS the phrase wins over one that merely contains it:
     "education" is the Category "Education", not "Higher Education", even
     though both resolve and both are kept in the clause */
  const whole = entries.find((e) => e.value.toLowerCase() === phrase)
  if (whole) return whole.label
  const exact = entries.find((e) => e.terms.includes(phrase))
  if (exact) return exact.label
  if (entries.length === 1) return entries[0].label
  return phrase.replace(/\b\w/g, (c) => c.toUpperCase())
}
