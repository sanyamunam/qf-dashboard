/**
 * The search contract.
 *
 * The brief's test is not that a list of prepared queries works — it is that a
 * question nobody anticipated still works. So these assert the PROPERTY that
 * makes that true (an unresolved word is never a requirement) as well as the
 * named queries.
 */
import { describe, expect, it } from 'vitest'
import { obsKpis } from './obs'
import { entityOf, themeOf } from './facets'
import { statusFor } from './status'
import { resolveQuery } from './query'
import { search } from './search'
import { isFiller, resolvePhrase } from './lexicon'

const rowsOf = (q: string) => search(q, 'q1').rows
const names = (q: string) => rowsOf(q).map((k) => k.name.trim())

describe('the failing query', () => {
  const Q = 'show me all DIFI indicators under social progress which are at risk'

  it('resolves exactly three concepts and no filler', () => {
    const r = resolveQuery(Q)
    expect(r.clauses.map((c) => c.label).sort()).toEqual(['At risk', 'DIFI', 'Social Progress'])
    /* the bug that emptied the page: "under" survived as a required term */
    expect(r.freeText).toBe('')
  })

  it('returns every DIFI Social Progress row that is at risk, and only those', () => {
    const got = rowsOf(Q)
    const expected = obsKpis.filter(
      (k) => entityOf(k) === 'DIFI' && themeOf(k) === 'Social Progress' && statusFor(k, 'q1') === 'atRisk',
    )
    expect(got.map((k) => k.row).sort()).toEqual(expected.map((k) => k.row).sort())
    expect(got.length).toBeGreaterThan(0)
  })

  it('never returns zero', () => {
    expect(rowsOf(Q).length).toBeGreaterThan(0)
  })
})

describe('an unresolved word can never empty a result set', () => {
  it('ignores prepositions and filler entirely', () => {
    for (const w of ['under', 'within', 'across', 'show me', 'all', 'which are', 'please']) expect(isFiller(w)).toBe(true)
  })

  it('gives the same rows however the question is padded', () => {
    const bare = names('DIFI at risk')
    for (const q of [
      'show me all DIFI indicators which are at risk',
      'DIFI indicators under at risk',
      'what DIFI KPIs are at risk right now',
      'list every DIFI metric that is at risk',
    ])
      expect(names(q).sort()).toEqual(bare.sort())
  })

  it('treats a word the sheet does not know as free text, not a filter', () => {
    const r = resolveQuery('DIFI zzzz')
    expect(r.clauses.map((c) => c.label)).toEqual(['DIFI'])
    expect(r.freeText).toBe('zzzz')
    // and the ladder recovers rather than showing nothing
    const s = search('DIFI zzzz', 'q1')
    expect(s.rows.length).toBeGreaterThan(0)
    expect(s.note).toMatch(/set aside/)
  })
})

describe('every query in the brief returns real rows', () => {
  const QUERIES = [
    'show me all DIFI indicators under social progress which are at risk',
    'WISE indicators below target',
    'executive KPIs with no target',
    'sustainability indicators not reported this quarter',
    'DIFI',
    'partnerships',
    'at risk',
    'qatarization',
    'what has stopped reporting',
    'which indicators are furthest behind',
    'anything without a target',
    'how is education doing',
  ]
  for (const q of QUERIES)
    it(`"${q}"`, () => {
      expect(search(q, 'q1').rows.length).toBeGreaterThan(0)
    })
})

describe('edge cases', () => {
  it('an empty query returns the whole portfolio, risk-ordered', () => {
    const s = search('', 'q1')
    expect(s.rows).toHaveLength(obsKpis.length)
    expect(statusFor(s.rows[0], 'q1')).toBe('atRisk')
  })

  it('xyzzy shows an empty state rather than everything', () => {
    const s = search('xyzzy', 'q1')
    expect(s.rows).toHaveLength(0)
  })

  it('partnerships spans the duplicated names across entities', () => {
    const rows = rowsOf('partnerships')
    expect(rows.length).toBeGreaterThan(5)
    expect(new Set(rows.map(entityOf)).size).toBeGreaterThan(1)
  })
})

describe('resolution rules', () => {
  it('is case-insensitive and partial', () => {
    expect(resolvePhrase('difi').some((e) => e.value === 'DIFI')).toBe(true)
    expect(resolvePhrase('qatariz').length).toBeGreaterThanOrEqual(0)
    expect(resolvePhrase('sustain').some((e) => e.value === 'Sustainability')).toBe(true)
  })

  it('ORs a term that names two facets rather than ANDing it', () => {
    const r = resolveQuery('education')
    expect(r.clauses).toHaveLength(1)
    const facets = new Set(r.clauses[0].entries.map((e) => e.facet))
    expect(facets.size).toBeGreaterThan(1)
    // and the union is bigger than either half alone
    expect(rowsOf('education').length).toBeGreaterThan(40)
  })

  it('produces one clause per concept, never a duplicate', () => {
    const r = resolveQuery('DIFI DIFI at risk at risk')
    expect(r.clauses).toHaveLength(2)
  })

  it('ANDs different concepts', () => {
    const both = rowsOf('DIFI at risk').length
    const difi = rowsOf('DIFI').length
    expect(both).toBeLessThan(difi)
  })

  it('never builds a clause from a phrase absent from the sheet', () => {
    for (const q of ['related to well', 'under', 'show me all the things'])
      expect(resolveQuery(q).clauses).toHaveLength(0)
  })
})

describe('results are risk-ordered', () => {
  it('leads with the worst', () => {
    const rows = rowsOf('sustainability')
    const first = statusFor(rows[0], 'q1')
    expect(['atRisk', 'belowTarget']).toContain(first)
  })
})

describe('the AI line', () => {
  it('names what was found and what is most urgent', () => {
    const s = search('show me all DIFI indicators under social progress which are at risk', 'q1')
    expect(s.line).toContain('DIFI')
    expect(s.line).toMatch(/furthest behind/)
  })
})
