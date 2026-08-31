/**
 * The numeric contract for the status model.
 *
 * Attainment is measured against the TARGET. It was briefly measured against a
 * quarter of the target instead — arithmetically defensible, and it produced a
 * card reading "Beneficiaries · 8 of 30 · On target" plus figures like "560%
 * of pace". The first test below is the one that would have caught it, and it
 * fails the moment any multiplier returns.
 */
import { describe, expect, it } from 'vitest'
import { obsKpis, q1Of, isLowerBetter } from './obs'
import { selectL1 } from './chartSelect'
import { trendHues } from '../components/charts/trendPalette'
import { THEMES } from './data'

const THEME_IDS = Object.fromEntries(THEMES.map((t) => [t.id, t.name]))
import {
  RISK,
  STATUS_ORDER,
  attainmentOf,
  bySeverity,
  statusCountsOf,
  statusFor,
  actualFor,
  targetFor,
  expectedBy,
  accrualOf,
  STATUS_DOT,
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

describe('attainment is measured against the target', () => {
  it('NEVER calls an indicator on target while it sits below its target', () => {
    /* THE SANITY CHECK. Attainment used to be measured against a quarter of
       the target, so "Beneficiaries · 8 of 30" scored 107% and read On
       target. Any reappearance of a multiplier fails here. */
    const wrong = obsKpis.filter((k) => {
      const a = actualFor(k, 'q1')
      const t = targetFor(k, 'q1')
      if (a === null || t === null || t === 0 || isLowerBetter(k)) return false
      return a < t && statusFor(k, 'q1') === 'onTarget'
    })
    expect(wrong.map((k) => k.name.trim())).toEqual([])
  })

  it('never reports attainment above 100% while the actual is below target', () => {
    for (const k of obsKpis) {
      const a = actualFor(k, 'q1')
      const t = targetFor(k, 'q1')
      const att = attainmentOf(k, 'q1')
      if (a === null || t === null || t === 0 || isLowerBetter(k) || att === null) continue
      if (a < t) expect(att).toBeLessThan(1)
    }
  })

  it('THE MARK AND THE VERDICT CAN NEVER DISAGREE', () => {
    /* At risk is tied to the pace line, so no indicator may be called at risk
       while its fill sits past the dashed "by now" tick on its own bar. 31
       cards used to contradict themselves this way. */
    const contradictory = obsKpis.filter((k) => {
      const a = actualFor(k, 'q1')
      const by = expectedBy(k, 'q1')
      if (a === null || by === null || isLowerBetter(k)) return false
      return statusFor(k, 'q1') === 'atRisk' && a > by
    })
    expect(contradictory.map((x) => x.name.trim())).toEqual([])
  })

  it('and the converse: behind the tick is never called merely below target', () => {
    const contradictory = obsKpis.filter((k) => {
      const a = actualFor(k, 'q1')
      const by = expectedBy(k, 'q1')
      if (a === null || by === null || isLowerBetter(k)) return false
      if (accrualOf(k) !== 'cumulative') return false
      return statusFor(k, 'q1') === 'belowTarget' && a < by
    })
    expect(contradictory.map((x) => x.name.trim())).toEqual([])
  })

  it('grades the six Progressive Education indicators against the pace line', () => {
    /* Three of these moved when At risk was tied to the pace line: each is
       past its own "by now" tick, so each is behind its ANNUAL number without
       being in trouble a quarter into the year. */
    const expected: [string, number, string][] = [
      ['Beneficiaries', 27, 'belowTarget'],
      ['International Engagements', 30, 'belowTarget'],
      ['National Engagements', 40, 'belowTarget'],
      ['International Partnerships', 67, 'belowTarget'],
      ['Multiversity', 80, 'belowTarget'],
      ['National Partnerships', 140, 'onTarget'],
    ]
    for (const [name, pct, status] of expected) {
      const k = obsKpis.find((x) => x.name.trim() === name && x.theme === 'Progressive Education')!
      expect(Math.round((attainmentOf(k, 'q1') ?? 0) * 100)).toBe(pct)
      expect(statusFor(k, 'q1')).toBe(status)
    }
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

  it('puts both thresholds in a settings object so QF can tune them', () => {
    expect(RISK.onTarget).toBe(1)
    expect(RISK.belowTarget).toBe(0.5)
    /* elapsed survives for the CAPTION only — it must never reach the maths */
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

describe('L1 is RAG, L2 is thematic', () => {
  it('gives every judged mark the SAME verdict the filter uses', () => {
    /* the guarantee behind "filter to At risk and every card is red": the
       mark's tone is not a second opinion, it is statusFor itself */
    for (const k of obsKpis)
      for (const p of ['q1', '2025'] as const) {
        const m = selectL1(k, p)
        if (m.kind === 'bullet' || m.kind === 'gauge' || m.kind === 'centredGauge')
          expect(m.tone).toBe(statusFor(k, p))
      }
  })

  it('draws no mark at all where nothing was reported', () => {
    const nr = obsKpis.filter((k) => statusFor(k, 'q1') === 'notReported')
    expect(nr.length).toBeGreaterThan(0)
    for (const k of nr) expect(selectL1(k, 'q1').kind).toBe('notReported')
  })

  it('never gives a judged mark to an indicator with no target', () => {
    for (const k of obsKpis.filter((k) => statusFor(k, 'q1') === 'noTarget'))
      expect(['bareFigure', 'idle', 'notReported']).toContain(selectL1(k, 'q1').kind)
  })

  it('keeps every trend on its theme, never on a status colour', () => {
    const statusColours = new Set(Object.values(STATUS_DOT).map((c) => c.toLowerCase()))
    for (const t of Object.keys(THEME_IDS)) {
      const h = trendHues(t)
      expect(statusColours.has(h.now.toLowerCase())).toBe(false)
      expect(statusColours.has(h.past.toLowerCase())).toBe(false)
    }
  })
})
