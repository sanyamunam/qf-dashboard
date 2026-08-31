/**
 * The numeric contract for the status model.
 *
 * The brief that specified `At Risk` came with its own tripwire: measured
 * against the raw annual target, 69–75 of the 151 Thematic indicators sit
 * below 25% of target — which is not 69 emergencies, it is a quarter of the
 * year elapsing. These tests exist to catch the day someone removes the pace
 * adjustment and the CEO's dashboard turns maroon.
 */
import { describe, expect, it } from 'vitest'
import { obsKpis, q1Of, isLowerBetter } from './obs'
import {
  RISK,
  STATUS_ORDER,
  attainmentOf,
  bySeverity,
  statusCountsOf,
  statusFor,
  worstSeverityOf,
} from './status'

const execRows = obsKpis.filter((k) => (k.dashboard ?? '').startsWith('Exec'))
const thematicRows = obsKpis.filter((k) => !(k.dashboard ?? '').startsWith('Exec'))

const byName = (n: string) => {
  const k = obsKpis.find((x) => x.name.trim() === n)
  if (!k) throw new Error(`no row named ${n}`)
  return k
}

describe('a Q1 zero that is not a reading', () => {
  it('reads a 0% satisfaction score as an absence, not a collapse', () => {
    expect(q1Of(byName('% Satisfaction with Ya Hala program'))).toBeNull()
  })

  it('reads a 0 NPS as an absence', () => {
    expect(q1Of(byName('Summit NPS'))).toBeNull()
  })

  it('still reads a count of zero deliveries as a real reading', () => {
    // 0 policy adoptions in Q1 is a fact about delivery, not a missing cell
    expect(q1Of(byName('Policy Hub - Policy Adoption'))).toBe(0)
  })

  it('leaves a non-zero reading alone, normalised', () => {
    expect(q1Of(byName('Budget Variance'))).toBe(18)
  })
})

describe('At Risk is measured against expected pace, never the annual total', () => {
  it('does not flag a quarter of the portfolio', () => {
    const n = thematicRows.filter((k) => statusFor(k, 'q1') === 'atRisk').length
    /* THE TRIPWIRE. Against the raw annual target 75 of these 151 sit below
       25% — a quarter of the year elapsing, not 75 emergencies. If this
       assertion fails upward, the pace adjustment has been lost. */
    expect(n).toBeLessThan(40)
    expect(n).toBeGreaterThan(10)
  })

  it('leaves the Executive set small enough to act on', () => {
    const n = execRows.filter((k) => statusFor(k, 'q1') === 'atRisk').length
    expect(n).toBeGreaterThan(2)
    expect(n).toBeLessThan(15)
  })

  it('counts sum to the size of each dashboard, on both periods', () => {
    for (const rows of [execRows, thematicRows])
      for (const p of ['q1', '2025'] as const) {
        const c = statusCountsOf(rows, p)
        const sum = Object.values(c).reduce((a, b) => a + b.length, 0)
        expect(sum).toBe(rows.length)
      }
  })

  it('never classifies an indicator with no reading as At Risk', () => {
    const bad = obsKpis.filter((k) => statusFor(k, 'q1') === 'atRisk' && q1Of(k) === null)
    expect(bad.map((k) => k.name)).toEqual([])
  })

  it('never classifies a zeroed satisfaction score as At Risk', () => {
    const ya = obsKpis.find((k) => k.name.trim() === '% Satisfaction with Ya Hala program')!
    expect(statusFor(ya, 'q1')).toBe('notReported')
  })

  it('inverts the test where lower is better', () => {
    // 18% against a ceiling of 0 — the overshoot IS the risk
    const bv = obsKpis.find((k) => k.name.trim() === 'Budget Variance')!
    expect(isLowerBetter(bv)).toBe(true)
    expect(statusFor(bv, 'q1')).toBe('atRisk')
    // 5,567 against a ceiling of 15,000 — comfortably under
    const cph = obsKpis.find((k) => k.name.trim() === 'Cost Per Hire (QAR)')!
    expect(statusFor(cph, 'q1')).toBe('onTarget')
  })

  it('keeps all 15 lower-is-better rows judged by direction, not sign', () => {
    expect(obsKpis.filter(isLowerBetter)).toHaveLength(15)
  })

  it('puts the threshold in a settings object so QF can tune it', () => {
    expect(RISK.threshold).toBe(0.5)
    expect(RISK.elapsed).toBe(0.25)
  })

  it('exposes an attainment figure wherever a verdict was reached', () => {
    for (const k of obsKpis) {
      const s = statusFor(k, 'q1')
      if (s === 'atRisk' || s === 'belowTarget' || s === 'onTarget')
        expect(attainmentOf(k, 'q1')).not.toBeNull()
    }
  })
})

describe('risk-first ordering', () => {
  it('puts the worst indicator first and the healthy ones last', () => {
    const sorted = [...thematicRows].sort(bySeverity('q1'))
    expect(statusFor(sorted[0], 'q1')).toBe('atRisk')
    expect(statusFor(sorted[sorted.length - 1], 'q1')).toBe('onTarget')
  })

  it('orders the At Risk band worst-attainment first', () => {
    const risk = thematicRows.filter((k) => statusFor(k, 'q1') === 'atRisk').sort(bySeverity('q1'))
    const att = risk.map((k) => attainmentOf(k, 'q1') ?? 0)
    expect([...att].sort((a, b) => a - b)).toEqual(att)
  })

  it('is stable — equal severity falls back to name, so order never flickers', () => {
    const a = [...thematicRows].sort(bySeverity('q1')).map((k) => k.row)
    const b = [...thematicRows].reverse().sort(bySeverity('q1')).map((k) => k.row)
    expect(a).toEqual(b)
  })

  it('ranks a category by its worst indicator', () => {
    const risky = thematicRows.filter((k) => statusFor(k, 'q1') === 'atRisk').slice(0, 1)
    const healthy = thematicRows.filter((k) => statusFor(k, 'q1') === 'onTarget').slice(0, 3)
    expect(worstSeverityOf(risky, 'q1')).toBeLessThan(worstSeverityOf(healthy, 'q1'))
  })

  it('severity order runs At Risk first and On target last', () => {
    expect(STATUS_ORDER[0]).toBe('atRisk')
    expect(STATUS_ORDER[STATUS_ORDER.length - 1]).toBe('onTarget')
  })
})
