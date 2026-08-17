/**
 * The Quarterly Brief — The Two Findings.
 *
 * The quarter stated as two facts, one from each source: the largest verified
 * movement across QF's executive indicators (Release 1) and the largest across
 * the thematic areas (Release 2). Each is a hero. Everything else is a ledger
 * beneath the hero of its source. Then three asks.
 *
 * Heroes are chosen by magnitude of movement regardless of direction — honesty
 * over balance. Release 1 and Release 2 never cross. Content is code so every
 * sentence stays welded to the cells it cites. One quarter-keyed read flag
 * drives the lamp, which is the only way in.
 */
import { execFacts, execKpis, type ExecKpi } from '../model/exec'
import { find, inventory, themeById } from '../model/data'
import { facts } from '../model/facts'
import type { Kpi } from '../model/types'
import type { LedgerRow } from './briefCharts'

export const QBRIEF_KEY = 'almishkat.qbrief.2026q1'
export const isBriefUnread = () => !localStorage.getItem(QBRIEF_KEY)
export const markBriefRead = () => {
  localStorage.setItem(QBRIEF_KEY, String(Date.now()))
  window.dispatchEvent(new Event('brief-read'))
}

/** What a finding draws. Three treatments, all from the platform's own set. */
export type Mark =
  | { kind: 'trend'; series: [string, number][]; target?: number; targetLabel?: string; unit?: string }
  | { kind: 'ledger'; rows: LedgerRow[] }
  | { kind: 'figures'; cols: string[]; rows: { label: string; values: string[]; flag?: boolean }[]; flagCol?: number }

export type Verdict = 'well' | 'watch'

export interface QFinding {
  id: string
  verdict: Verdict
  /** Release 2 only: the theme whose colour this finding carries. */
  themeId?: string
  /** Who the indicator belongs to — entity or executive category. */
  source: string
  finding: string
  mark: Mark
  /** Verbatim cells, so the figure can be checked without leaving the page. */
  trace: string
  /** What it means — BOTaina's line. Never a restatement of the number. */
  means: string
  /** Release 2 only: opens this KPI's drawer. */
  kpiId?: string
}

export interface QSource {
  key: 'exec' | 'thematic'
  name: string
  release: string
  hero: QFinding
  ledger: QFinding[]
}
export interface QAsk {
  q: string
  owner: string
}
export interface QuarterlyBriefData {
  dateLine: string
  sources: [QSource, QSource]
  asks: QAsk[]
  accounting: string
  signoff: string
}

/* ————— helpers ————— */

const yearSeries = (k: ExecKpi): [string, number][] =>
  (['2022', '2023', '2024', '2025'] as const)
    .filter((y) => typeof k.actuals[y] === 'number')
    .map((y) => [y, k.actuals[y] as number])

const monthSeries = (k: ExecKpi): [string, number][] =>
  (['jan', 'feb', 'mar'] as const)
    .filter((m) => typeof k.monthly[m] === 'number')
    .map((m) => [m === 'jan' ? 'Jan' : m === 'feb' ? 'Feb' : 'Mar', k.monthly[m] as number])

const q1 = (k: Kpi) => k.actuals['2026Q1']?.value ?? 0
const t26 = (k: Kpi) => k.targets['2026']?.value ?? 0
const kpiSeries = (k: Kpi): [string, number][] =>
  k.movementSeries.map(([y, v]) => [y === '2026Q1' ? 'Q1 26' : y, v])
const N = (v: number | null | undefined) => new Intl.NumberFormat('en').format(v ?? 0)

export function buildQuarterlyBrief(): QuarterlyBriefData {
  const x = execFacts
  const aiAdopt = execKpis.find((k) => k.row === 53)!

  /* ——————————————————————————————————————————————
   * EXECUTIVE VIEW — Release 1
   * —————————————————————————————————————————————— */

  const execHero: QFinding = {
    id: 'ec-footfall',
    verdict: 'watch',
    source: 'Education City · City Operations',
    finding: "Education City's footfall fell 85% in March.",
    mark: { kind: 'trend', series: monthSeries(x.footfall), unit: 'visitors per month' },
    trace: `Release 1 row 56 · Jan 211,772 · Feb 237,801 · Mar 36,546 · full-year 2025: 3,051,433`,
    means: 'Two strong months, then a cliff. Calendar, access or counting: three different owners.',
  }

  const unitBreak = [
    { k: x.excluded[0], label: 'Budget Variance' },
    { k: execKpis.find((k) => k.row === 70)!, label: 'Employee Turnover' },
    { k: x.qatarization, label: 'Qatarization' },
    { k: x.excluded[1], label: 'Diabetes Prevention' },
    { k: x.excluded[2], label: 'Diabetes Control' },
  ]

  const execLedger: QFinding[] = [
    {
      id: 'revenue',
      verdict: 'well',
      source: 'Financial Health · CFO Division',
      finding: 'Revenue reached QAR 545m by March — 27% of all of last year.',
      mark: { kind: 'trend', series: monthSeries(x.revenue), unit: 'QAR millions, cumulative' },
      trace: `Release 1 row 65 · 171 → 342 → 545 cumulative · full-year 2025: ${N(x.revenue.actuals['2025'])}`,
      means: 'Even month to month. A rate, not one deal landing in January.',
    },
    {
      id: 'ai-adoption',
      verdict: 'well',
      source: 'Research · HBKU',
      finding: 'External adoption of QF-built AI tools doubled, 19 to 42.',
      mark: { kind: 'trend', series: yearSeries(aiAdopt), unit: 'tools adopted externally' },
      trace: `Release 1 row 53 · ${yearSeries(aiAdopt).map(([y, v]) => `${y} ${v}`).join(' · ')} · annual, 2025 is latest`,
      means: "Uptake outside QF's own walls — the hardest thing for a research base to prove.",
    },
    {
      id: 'vacancies',
      verdict: 'watch',
      source: 'Operational Strength · Human Capital',
      finding: 'Vacancies rose every month to 695, above any year-end since 2022.',
      mark: {
        kind: 'trend',
        series: monthSeries(x.vacancies),
        target: x.vacancies.actuals['2025'] as number,
        targetLabel: '2025 year-end 614',
        unit: 'open vacancies',
      },
      trace: 'Release 1 row 69 · 610 → 673 → 695 · year-ends 451 / 521 / 620 / 614 · leadership steady at 14',
      means: 'Growth in the body of the organisation, not its leadership. Expansion, if the hiring plan agrees.',
    },
    {
      id: 'unit-break',
      verdict: 'watch',
      source: 'Five indicators · CFO Division, Human Capital, QDA',
      finding: 'Five indicators change unit between their history and their Q1 column.',
      mark: {
        kind: 'figures',
        cols: ['2025 actual', 'Q1 2026', '2026 target'],
        flagCol: 1,
        rows: unitBreak.map(({ k, label }) => ({
          label,
          values: [
            k.actuals['2025'] === null ? '—' : String(k.actuals['2025']),
            k.q1 === null ? '—' : String(k.q1),
            k.targets['2026'] === null ? '—' : String(k.targets['2026']),
          ],
          flag: true,
        })),
      },
      trace: 'Release 1 rows 63, 70, 71, 51, 52 · Qatarization stores 0.26 for 2025 and 25 for Q1',
      means: "This is a measurement problem. Until it's settled, none of the five can be read.",
    },
  ]

  /* ——————————————————————————————————————————————
   * THEMATIC AREAS — Release 2
   * —————————————————————————————————————————————— */
  const wish = facts.wish.kpi
  const ecoBenef = facts.eco.kpis.benef
  const training = facts.oe.training.kpi
  const wiseExact = ['WISE Prize Funding Awarded', 'Edtech Testbed Schools - Government', 'Edtech Testbed Schools - PUE', 'WISE Accelerator Beneficiaries', 'Products Supported']
    .map((nm) => find(nm, 'WISE'))
    .filter((k): k is Kpi => Boolean(k))

  const thematicHero: QFinding = {
    id: 'wish',
    verdict: 'watch',
    themeId: 'social',
    source: 'WISH · Social Progress',
    finding: 'WISH reached 900 people. Three years ago, 23,150.',
    mark: { kind: 'trend', series: kpiSeries(wish), target: t26(wish), targetLabel: 'full-year target 5,000', unit: 'people reached' },
    trace: 'Release 2 · WISH · 11,939 → 23,150 → 2,000 → 1,170 → 900 · target 5,000 · media mentions 700 → 12',
    means: 'Three reported years of decline is a delivery model, not a bad quarter — and nobody has minuted it.',
    kpiId: wish.id,
  }

  const thematicLedger: QFinding[] = [
    {
      id: 'eco-schools',
      verdict: 'well',
      themeId: 'sustain',
      source: 'Earthna · Sustainability',
      finding: `Eco-Schools reached ${N(facts.eco.beneficiaries)} students and teachers in ${facts.eco.registered} schools.`,
      mark: {
        kind: 'ledger',
        rows: [
          { label: 'Schools registered', value: facts.eco.registered ?? 0, target: t26(facts.eco.kpis.reg) },
          { label: 'Green Flag certified', value: facts.eco.certified ?? 0, target: t26(facts.eco.kpis.cert) },
        ],
      },
      trace: `Release 2 · Earthna · ${facts.eco.registered} registered of ${t26(facts.eco.kpis.reg)} · ${facts.eco.certified} certified of ${t26(facts.eco.kpis.cert)}`,
      means: 'National scale inside one quarter, and certification, the expensive part, is already following.',
      kpiId: ecoBenef.id,
    },
    {
      id: 'oe-training',
      verdict: 'well',
      themeId: 'oe',
      source: 'Human Capital · Organizational Excellence',
      finding: 'Training doubled over four years to 15 hours per employee, against a target of 4.',
      mark: { kind: 'trend', series: kpiSeries(training), target: t26(training), targetLabel: 'target 4 hours', unit: 'hours per employee' },
      trace: 'Release 2 · Human Capital · 6.02 → 10.7 → 11.4 → 15.0 hours · target 4 · attendance 41% → 66%',
      means: 'Four straight years up against a target untouched since 2022. The target stopped measuring the work.',
      kpiId: training.id,
    },
    {
      id: 'ai-theme',
      verdict: 'watch',
      themeId: 'ai',
      source: 'WISE · Artificial Intelligence',
      finding: "QF's newest priority has two indicators: one recommendation of three, no adoptions.",
      mark: {
        kind: 'ledger',
        rows: [
          { label: 'Policy recommendations', value: facts.ai.recommendations ?? 0, target: facts.ai.recTarget ?? 0 },
          { label: 'Policy adoptions', value: facts.ai.adoptions ?? 0, target: facts.ai.adoptTarget ?? 0 },
        ],
      },
      trace: 'Release 2 · WISE · recommendations 1 of 3 · adoptions 0 of 1 · the whole theme',
      means: 'Too early to judge adoption. Two indicators for the flagship priority is not too early to judge.',
      kpiId: facts.ai.recKpi?.id,
    },
    {
      id: 'wise-exact',
      verdict: 'watch',
      themeId: 'edu',
      source: 'WISE · Progressive Education',
      finding: 'Five WISE indicators landed exactly on their full-year number in the first quarter.',
      mark: {
        kind: 'ledger',
        rows: wiseExact.map((k) => ({
          label: k.name.replace('Edtech Testbed Schools - ', 'Edtech testbeds, ').replace('WISE ', ''),
          value: q1(k),
          target: t26(k),
          exact: true,
        })),
      },
      trace: `Release 2 · WISE · 27,375,000 of 27,375,000 · 9 of 9 · 7 of 7 · 8 of 8 · 6 of 6 · of ${inventory.targetMet} at target overall`,
      means: 'Landing on 27,375,000 of 27,375,000 is not measurement. Nine more months of ceremony.',
      kpiId: wiseExact[0]?.id,
    },
  ]

  const asks: QAsk[] = [
    {
      q: 'What happened at Education City in March — the events calendar, an access change, or a change in counting?',
      owner: 'City Operations',
    },
    {
      q: 'Five executive indicators store Q1 in different units from their own history. Whose numbers are right?',
      owner: 'CFO Division, Human Capital & QDA reporting leads',
    },
    {
      q: `Which of the ${inventory.targetMet} indicators already at their 2026 target are being re-based, and by whom?`,
      owner: 'Strategy & Performance',
    },
  ]

  return {
    dateLine: `Q1 2026 · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    sources: [
      {
        key: 'exec',
        name: 'Executive View',
        release: `Release 1 · ${execKpis.length} executive indicators`,
        hero: execHero,
        ledger: execLedger,
      },
      {
        key: 'thematic',
        name: 'Thematic areas',
        release: `Release 2 · ${inventory.total} thematic indicators`,
        hero: thematicHero,
        ledger: thematicLedger,
      },
    ],
    asks,
    accounting: `Every figure traces to a cell. The two workbooks never mix — Executive View is Release 1, the themes are Release 2. Precision Health has no Release 2 indicators, so it cannot appear. Genomes Sequenced reads 38,683 against 30,000 but is cumulative since 2022, so it is named, not counted.`,
    signoff: 'That is the quarter. Everything else is on the dashboard, and I am one tap away.',
  }
}

export const themeColour = (themeId?: string) => (themeId ? themeById(themeId).fill : '#034638')
