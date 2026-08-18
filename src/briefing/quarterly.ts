/**
 * The Quarterly Brief — one screen, no scroll. BOTaina tells you the quarter.
 *
 * Release 1 only: the Executive View's own indicators. Every tile is one
 * finding — a figure, a small mark, and the line BOTaina says when you tap it.
 * Content is code so every sentence stays welded to the cells it cites. One
 * quarter-keyed read flag drives the lamp, which is the only way in.
 */
import { execFacts, execKpis, type ExecKpi } from '../model/exec'
import type { LedgerRow } from './briefCharts'

export const QBRIEF_KEY = 'almishkat.qbrief.2026q1'
export const isBriefUnread = () => !localStorage.getItem(QBRIEF_KEY)
export const markBriefRead = () => {
  localStorage.setItem(QBRIEF_KEY, String(Date.now()))
  window.dispatchEvent(new Event('brief-read'))
}

export type Mark =
  | { kind: 'trend'; series: [string, number][]; target?: number; targetLabel?: string; unit?: string }
  | { kind: 'ledger'; rows: LedgerRow[] }
  | { kind: 'figures'; cols: string[]; rows: { label: string; values: string[]; flag?: boolean }[]; flagCol?: number }
  | { kind: 'none' }

export type Verdict = 'well' | 'watch' | 'note'

export interface Tile {
  id: string
  verdict: Verdict
  /** the tile's own headline: a figure or a short claim */
  figure: string
  label: string
  source: string
  mark: Mark
  /** what BOTaina says when the tile is tapped */
  says: string
  trace: string
}

export interface QuarterlyBriefData {
  dateLine: string
  /** her opening — the quarter in two sentences */
  greeting: string
  /** the hero: the one finding that gets the big chart */
  hero: Tile
  /** the big number */
  lead: Tile
  tiles: Tile[]
  ask: { q: string; owner: string }
}

const monthSeries = (k: ExecKpi): [string, number][] =>
  (['jan', 'feb', 'mar'] as const)
    .filter((m) => typeof k.monthly[m] === 'number')
    .map((m) => [m === 'jan' ? 'Jan' : m === 'feb' ? 'Feb' : 'Mar', k.monthly[m] as number])
const yearSeries = (k: ExecKpi): [string, number][] =>
  (['2022', '2023', '2024', '2025'] as const)
    .filter((y) => typeof k.actuals[y] === 'number')
    .map((y) => [y, k.actuals[y] as number])
const N = (v: number | null | undefined) => new Intl.NumberFormat('en').format(v ?? 0)

export function buildQuarterlyBrief(): QuarterlyBriefData {
  const x = execFacts
  const aiAdopt = execKpis.find((k) => k.row === 53)!
  const grads = x.gradEmployment
  const carbon = x.carbon

  const lead: Tile = {
    id: 'revenue',
    verdict: 'well',
    figure: 'QAR 545m',
    label: 'revenue by March',
    source: 'CFO Division · row 65',
    mark: { kind: 'trend', series: monthSeries(x.revenue), unit: 'QAR m, cumulative' },
    says: `Let me start with the money. QAR 545m by March, which is 27% of everything last year earned, in one quarter — and it came in evenly, 171, 342, 545. That is a rate, not one deal.`,
    trace: `171 → 342 → 545 cumulative · full-year 2025: ${N(x.revenue.actuals['2025'])}`,
  }

  const hero: Tile = {
    id: 'footfall',
    verdict: 'watch',
    figure: '−85%',
    label: 'Education City footfall, February to March',
    source: 'City Operations · row 56',
    mark: { kind: 'trend', series: monthSeries(x.footfall), unit: 'visitors per month' },
    says: `This is the one I would ask about. Footfall held above 200,000 in January and February, then dropped to 36,546 in March. That is not a slow month; something changed — the calendar, access, or how it is counted.`,
    trace: 'Jan 211,772 · Feb 237,801 · Mar 36,546 · full-year 2025: 3,051,433',
  }

  const unitBreak = [
    { k: x.excluded[0], label: 'Budget Variance' },
    { k: execKpis.find((k) => k.row === 70)!, label: 'Employee Turnover' },
    { k: x.qatarization, label: 'Qatarization' },
    { k: x.excluded[1], label: 'Diabetes Prevention' },
    { k: x.excluded[2], label: 'Diabetes Control' },
  ]

  const tiles: Tile[] = [
    {
      id: 'vacancies',
      verdict: 'watch',
      figure: '695',
      label: 'open vacancies, up every month',
      source: 'Human Capital · row 69',
      mark: { kind: 'trend', series: monthSeries(x.vacancies), target: 614, targetLabel: '2025 year-end', unit: 'vacancies' },
      says: `You are hiring. Open roles rose 610, 673, 695 — more than any year-end since 2022 — while leadership vacancies stayed at 14 all quarter. Growth in the body of the organisation, not its head.`,
      trace: '610 → 673 → 695 · year-ends 451 / 521 / 620 / 614 · leadership 15 → 14 → 14 (row 66)',
    },
    {
      id: 'ai-adoption',
      verdict: 'well',
      figure: '19 → 42',
      label: 'AI tools adopted outside QF',
      source: 'HBKU · row 53',
      mark: { kind: 'trend', series: yearSeries(aiAdopt), unit: 'tools adopted' },
      says: `Adoption of QF-built AI tools by outside organisations more than doubled, from 19 to 42. That is uptake beyond our own walls, which is the hardest thing for a research base to prove.`,
      trace: `${yearSeries(aiAdopt).map(([y, v]) => `${y} ${v}`).join(' · ')} · annual, 2025 is latest`,
    },
    {
      id: 'graduates',
      verdict: 'well',
      figure: '72%',
      label: 'graduates employed, target 80%',
      source: 'Higher Education · row 3',
      mark: {
        kind: 'trend',
        series: yearSeries(grads).map(([y, v]) => [y, Math.round(v * 100)]),
        target: 80,
        targetLabel: 'target 80%',
        unit: '% employed',
      },
      says: `Graduate employment reached 72%, up from 54% in 2022, against a target of 80% for 2026. It reports annually, so the next reading is at year end.`,
      trace: `54% → 65% → 65% → 72% · 2026 target 80%`,
    },
    {
      id: 'carbon',
      verdict: 'note',
      figure: `${N(Math.round(carbon.monthly.mar ?? 0))} t`,
      label: 'EC carbon footprint by March',
      source: 'City Operations · row 57',
      mark: { kind: 'trend', series: monthSeries(carbon).map(([m, v]) => [m, Math.round(v)]), unit: 'tonnes, cumulative' },
      says: `Carbon is tracking at ${N(Math.round(carbon.monthly.mar ?? 0))} tonnes by March against a full-year 2026 target of ${N(carbon.targets['2026'])}. On this pace the year lands near it — worth a look, not an alarm.`,
      trace: `20,877 → 42,831 → 61,379 cumulative · full-year 2025: 285,000 · 2026 target ${N(carbon.targets['2026'])}`,
    },
    {
      id: 'unit-break',
      verdict: 'watch',
      figure: '5',
      label: 'indicators that changed their unit',
      source: 'CFO Division · Human Capital · QDA',
      mark: {
        kind: 'figures',
        cols: ['2025', 'Q1 26', 'target'],
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
      says: `Five indicators changed their units between last year and this quarter — Qatarization stores 0.26 for 2025 and 25 for Q1. Until that is settled I cannot read them for you, and neither can anyone else.`,
      trace: 'rows 63, 70, 71, 51, 52 · the Q1 column is the one that breaks convention',
    },
  ]

  return {
    dateLine: `Q1 2026 · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    greeting: `Here is your quarter, from ${execKpis.length} executive indicators. Money came in well, Education City emptied out in March, and five numbers do not add up. Tap anything and I will explain.`,
    hero,
    lead,
    tiles,
    ask: {
      q: 'What happened at Education City in March — the events calendar, an access change, or a change in counting?',
      owner: 'City Operations',
    },
  }
}
