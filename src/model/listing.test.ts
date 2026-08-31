import { describe, expect, it } from 'vitest'
import { kpis, THEMES } from './data'
import { obsForKpi } from './bridge'
import { statusFor } from './status'
import { sectionsFor, isBehind, type ListingMode } from './listing'
import { severityOf } from './status'

const themeKpis = (name: string) => kpis.filter((k) => k.theme === name)
const NAMES = THEMES.map((t) => t.name).filter((n) => themeKpis(n).length > 0)
const st = (k: (typeof kpis)[number]) => {
  const r = obsForKpi(k)
  return r ? statusFor(r, 'q1') : 'noTarget'
}

describe('every mode keeps every indicator exactly once', () => {
  for (const mode of ['attention', 'risk'] as ListingMode[])
    for (const name of NAMES)
      it(`${mode} · ${name}`, () => {
        const set = themeKpis(name)
        const secs = sectionsFor(set, 'q1', mode)
        const body = secs.filter((s) => !s.isBand).flatMap((s) => s.kpis)
        /* the band is a SUMMARY of rows that also appear below, so it is
           excluded from the completeness count rather than double-counted */
        expect(new Set(body.map((k) => k.id)).size).toBe(set.length)
        expect(body).toHaveLength(set.length)
      })
})

describe('needs-attention band', () => {
  it('leads the page wherever something is behind', () => {
    for (const name of NAMES) {
      const set = themeKpis(name)
      const secs = sectionsFor(set, 'q1', 'attention')
      const behind = set.filter((k) => isBehind(k, 'q1'))
      if (behind.length) {
        expect(secs[0].isBand).toBe(true)
        expect(secs[0].kpis).toHaveLength(behind.length)
      } else {
        expect(secs.every((s) => !s.isBand)).toBe(true)
      }
    }
  })

  it('holds only what is behind — never a reporting gap', () => {
    for (const name of NAMES) {
      const band = sectionsFor(themeKpis(name), 'q1', 'attention').find((s) => s.isBand)
      for (const k of band?.kpis ?? []) expect(['atRisk', 'belowTarget']).toContain(st(k))
    }
  })

  it('collapses what the taxonomy scatters', () => {
    /* the reason the band exists: on Sustainability the rows that are behind
       sit in 7 of 8 categories, so ordering categories cannot gather them */
    const set = themeKpis('Sustainability')
    const behind = set.filter((k) => isBehind(k, 'q1'))
    const spread = new Set(behind.map((k) => k.category)).size
    expect(spread).toBeGreaterThan(3)
    const band = sectionsFor(set, 'q1', 'attention').find((s) => s.isBand)!
    expect(band.kpis).toHaveLength(behind.length)
  })
})

describe('ordering', () => {
  it('puts the worst category first in every category-grouped mode', () => {
    for (const mode of ['attention'] as ListingMode[])
      for (const name of NAMES) {
        const cats = sectionsFor(themeKpis(name), 'q1', mode).filter((s) => !s.isBand)
        if (cats.length < 2) continue
        const worst = (s: (typeof cats)[number]) => Math.min(...s.kpis.map((k) => byRiskValue(k)))
        const vals = cats.map(worst)
        expect([...vals].sort((a, b) => a - b)).toEqual(vals)
      }
  })

  it('orders indicators worst-first inside every section', () => {
    for (const name of NAMES)
      for (const s of sectionsFor(themeKpis(name), 'q1', 'attention')) {
        const vals = s.kpis.map(byRiskValue)
        expect([...vals].sort((a, b) => a - b)).toEqual(vals)
      }
  })

  it('risk mode leads with At risk and ends with On target', () => {
    const secs = sectionsFor(themeKpis('Social Progress'), 'q1', 'risk')
    expect(secs[0].status).toBe('atRisk')
    expect(secs[secs.length - 1].status).toBe('onTarget')
  })

  it('risk mode emits no empty group', () => {
    for (const name of NAMES)
      for (const s of sectionsFor(themeKpis(name), 'q1', 'risk')) expect(s.kpis.length).toBeGreaterThan(0)
  })

  it('closing the band leaves exactly the plain category listing', () => {
    /* the third mode used to return this. It is now what you get by shutting
       the band, so nothing was lost when the mode went. */
    for (const name of NAMES) {
      const set = themeKpis(name)
      const withBand = sectionsFor(set, 'q1', 'attention')
      const closed = withBand.filter((s) => !s.isBand)
      expect(closed.every((s) => s.key.startsWith('cat:'))).toBe(true)
      expect(closed.flatMap((s) => s.kpis)).toHaveLength(set.length)
    }
  })

  it('is stable — the same input yields the same order', () => {
    const set = themeKpis('Social Progress')
    const a = sectionsFor(set, 'q1', 'attention').flatMap((s) => s.kpis.map((k) => k.id))
    const b = sectionsFor([...set].reverse(), 'q1', 'attention').flatMap((s) => s.kpis.map((k) => k.id))
    expect(a).toEqual(b)
  })
})

/* the same severity the module sorts by, read through the same bridge */
function byRiskValue(k: (typeof kpis)[number]): number {
  const r = obsForKpi(k)
  return r ? severityOf(r, 'q1') : Number.MAX_SAFE_INTEGER
}
