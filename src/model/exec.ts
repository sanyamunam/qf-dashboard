/**
 * Release 1 — the Executive View's own data, the senior source in the
 * Quarterly Brief. Facts are pulled by sheet row so a moved row fails loudly
 * (thrown) rather than silently reading a neighbour's numbers.
 */
import raw from '../data/exec.json'

export interface ExecKpi {
  row: number
  framework: string | null
  theme: string | null
  entity: string | null
  level: string | null
  category: string | null
  name: string
  definition: string | null
  source: string | null
  frequency: string | null
  monthly: { jan: number | null; feb: number | null; mar: number | null }
  q1: number | null
  q1Note: string | null
  actuals: Record<string, number | null>
  actualNotes: Record<string, string | null>
  targets: Record<string, number | null>
  targetNotes: Record<string, string | null>
  comment: string | null
}

export const execKpis = (raw as { kpis: ExecKpi[] }).kpis
export const execMeta = raw as { generatedFrom: string; sheet: string; period: string }

const byRow = (r: number): ExecKpi => {
  const k = execKpis.find((x) => x.row === r)
  if (!k) throw new Error(`exec row ${r} missing`)
  return k
}

export const execFacts = {
  footfall: byRow(56), // EC total footfall — the March cliff, monthly
  carbon: byRow(57), // EC carbon footprint
  vacancies: byRow(69), // total vacancies, climbing monthly
  leadershipVacancies: byRow(66), // steady at 14
  revenue: byRow(65), // QAR millions, cumulative monthly
  gradEmployment: byRow(3), // fraction of graduates employed, vs 0.8
  genomes: byRow(49), // cumulative-reporting caveat lives in .comment
  cultural: byRow(62), // cultural events footfall, Q1 = 0
  qatarization: byRow(71),
  /** Units contradict their own history — named in the accounting, never
   *  charted: Budget Variance, and both Diabetes outcome rows. */
  excluded: [byRow(63), byRow(51), byRow(52)],
}
