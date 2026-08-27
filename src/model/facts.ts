/**
 * Curated headline facts for L1, each located from cells at module load —
 * if the sheet changes, these change. Nothing here is a typed-in number.
 */
import { find, fmt } from './data'

const wish = find('Beneficiaries', 'WISH')!
const ecoBenef = find('Ecoschool Beneficiaries', 'Earthna')!
const ecoReg = find('Ecoschool Registrations', 'Earthna')!
const ecoCert = find('Ecoschool Certification', 'Earthna')!
const earthnaPubs = find('Research Publications', 'Earthna')!
const earthnaMulti = find('Multiversity', 'Earthna')!
const prizeValue = find('WISE Prize Funding Awarded', 'WISE')!
const prizeCount = find('WISE Prize and Awards', 'WISE')!
const testbedGov = find('Edtech Testbed Schools - Government', 'WISE')!
const testbedPue = find('Edtech Testbed Schools - PUE', 'WISE')!
const aiRec = find('Policy Recommendations', 'WISE')!
const aiAdopt = find('Policy Adoption', 'WISE')!
const turnover = find('% Employee Turnover', 'Human Capital')!
const training = find('Average training hours', 'Human Capital')!
const budgetVar = find('% Variance on the BoD approved staff costs budget', 'Human Capital')!
const difiRevenue = find('Sponsorship Revenue', 'DIFI')

const q1 = (k: { actuals: Record<string, { value: number | null }> } | undefined) =>
  k?.actuals['2026Q1']?.value ?? null

export const facts = {
  wish: {
    kpi: wish,
    series: wish.movementSeries,
    q1: q1(wish),
    peak: Math.max(...wish.movementSeries.map(([, v]) => v)),
    first: wish.movementSeries[0]?.[1],
    /* the last CLOSED year — the only figure a quarter can be set beside
       without comparing three months against twelve */
    lastClosedYear: wish.movementSeries.filter(([y]) => y !== '2026Q1').slice(-1)[0] ?? null,
    target26: wish.targets['2026'].value,
  },
  /* the Sustainability spotlight moved to Multiversity: it is the only Earthna
     indicator with BOTH a current reading and four closed years, so the card
     can carry a live figure and a real trend rather than one or the other */
  sustain: { kpi: earthnaMulti, q1: q1(earthnaMulti), target26: earthnaMulti.targets['2026'].value },
  eco: {
    kpi: ecoBenef,
    beneficiaries: q1(ecoBenef),
    registered: q1(ecoReg),
    certified: q1(ecoCert),
    kpis: { benef: ecoBenef, reg: ecoReg, cert: ecoCert },
  },
  earthnaPubs: { kpi: earthnaPubs, series: earthnaPubs.movementSeries },
  wise: {
    prizeValue: q1(prizeValue),
    prizeCount: q1(prizeCount),
    prizeCountTarget: prizeCount.targets['2026'].value,
    prizeValueKpi: prizeValue,
    prizeCountKpi: prizeCount,
    testbeds: (q1(testbedGov) ?? 0) + (q1(testbedPue) ?? 0),
    testbedsTarget: (testbedGov.targets['2026'].value ?? 0) + (testbedPue.targets['2026'].value ?? 0),
    testbedsKpi: testbedGov,
  },
  ai: {
    kpi: aiRec,
    recommendations: q1(aiRec),
    recTarget: aiRec?.targets['2026'].value ?? null,
    adoptions: q1(aiAdopt),
    adoptTarget: aiAdopt?.targets['2026'].value ?? null,
    recKpi: aiRec,
    adoptKpi: aiAdopt,
  },
  oe: {
    turnover: { kpi: turnover, series: turnover.movementSeries },
    training: { kpi: training, series: training.movementSeries },
    budgetVar: { kpi: budgetVar, series: budgetVar.movementSeries },
  },
  difiRevenue: { kpi: difiRevenue, series: difiRevenue?.movementSeries ?? [] },
}

export const wishDropPct = facts.wish.q1 !== null
  ? Math.round((1 - (facts.wish.q1 as number) / facts.wish.peak) * 100)
  : null

export { fmt }
