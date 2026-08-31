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
import { obsKpis, q1Of } from './obs'

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
