/**
 * The Quarterly Brief — a one-page written report, in BOTaina's hand.
 *
 * Prose leads, numbers support. Her opening paragraph, then four short titled
 * paragraphs each with one small mark set into the margin as evidence, then
 * one question and her sign-off. Release 1 only. Content is code so every
 * sentence stays welded to the cells it cites. One quarter-keyed read flag
 * drives the lamp, which is the only way in.
 */
import { execFacts, execKpis, type ExecKpi } from '../model/exec'

export const QBRIEF_KEY = 'almishkat.qbrief.2026q1'
export const isBriefUnread = () => !localStorage.getItem(QBRIEF_KEY)
export const markBriefRead = () => {
  localStorage.setItem(QBRIEF_KEY, String(Date.now()))
  window.dispatchEvent(new Event('brief-read'))
}

/** The small mark in the margin beside a paragraph. */
export type Margin =
  | { kind: 'bars'; series: [string, number][]; emphasisLast?: boolean; target?: number }
  | { kind: 'pair'; a: { value: string; label: string }; b: { value: string; label: string } }
  | { kind: 'table'; rows: { label: string; was: string; now: string }[] }

export interface Paragraph {
  id: string
  title: string
  /** 2–3 sentences. The figures are IN the sentences. */
  text: string
  margin: Margin
  /** verbatim cells, small, under the mark */
  trace: string
}

export interface QuarterlyBriefData {
  dateLine: string
  opening: string
  paragraphs: Paragraph[]
  question: { q: string; owner: string }
  signoff: string
}

const months = (k: ExecKpi): [string, number][] =>
  (['jan', 'feb', 'mar'] as const)
    .filter((m) => typeof k.monthly[m] === 'number')
    .map((m) => [m === 'jan' ? 'Jan' : m === 'feb' ? 'Feb' : 'Mar', k.monthly[m] as number])
const N = (v: number | null | undefined) => new Intl.NumberFormat('en').format(v ?? 0)

export function buildQuarterlyBrief(): QuarterlyBriefData {
  const x = execFacts
  const aiAdopt = execKpis.find((k) => k.row === 53)!
  const turnover = execKpis.find((k) => k.row === 70)!

  return {
    dateLine: `Q1 2026 · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,

    opening: `Here is the quarter, from ${execKpis.length} executive indicators. Revenue came in strongly and evenly. Education City emptied out in March and I do not yet know why. We are hiring faster than at any point since 2022. And five indicators cannot be read this quarter because they changed their units.`,

    paragraphs: [
      {
        id: 'money',
        title: 'The money',
        text: `Revenue reached QAR 545 million by March — 27% of everything last year earned, in one quarter. It arrived evenly, 171 then 342 then 545, so this is a rate rather than one deal landing in January. Held for the year it clears 2025's ${N(x.revenue.actuals['2025'])} million.`,
        margin: { kind: 'bars', series: months(x.revenue), emphasisLast: true },
        trace: 'CFO Division · row 65 · QAR m, cumulative',
      },
      {
        id: 'footfall',
        title: 'Education City in March',
        text: `Footfall held above 200,000 in January and February, then fell to 36,546 in March — an 85% drop in one month. Last year the site drew ${N(x.footfall.actuals['2025'])} visitors; on March's pace this year would not come close. Whether that is the events calendar, an access change or a change in counting has three different owners, and I would ask.`,
        margin: { kind: 'bars', series: months(x.footfall), emphasisLast: true },
        trace: 'City Operations · row 56 · visitors per month',
      },
      {
        id: 'hiring',
        title: 'Hiring',
        text: `Open vacancies rose every month — 610, 673, 695 — and 695 is more than any year-end since 2022. Leadership vacancies held at 14 throughout, so the growth is in the body of the organisation, not its head. Alongside the best turnover in four years this reads as expansion, though only the hiring plan can confirm it. External adoption of QF-built AI tools also doubled, from 19 to 42.`,
        margin: {
          kind: 'pair',
          a: { value: '695', label: 'open vacancies, March' },
          b: { value: '14', label: 'leadership vacancies, steady' },
        },
        trace: `Human Capital · rows 69, 66 · HBKU row 53: ${aiAdopt.actuals['2024']} → ${aiAdopt.actuals['2025']}`,
      },
      {
        id: 'units',
        title: 'Five numbers that do not add up',
        text: `Five indicators changed their unit between last year and this quarter. Qatarization stores 0.26 for 2025 and 25 for the quarter; Employee Turnover 0.07 then 1.32; Budget Variance 0.1 then 18. The 2025 actual and the 2026 target agree with each other, so the Q1 column is the one out of step. Until it is settled these five cannot be read against their own targets — by me or by anyone.`,
        margin: {
          kind: 'table',
          rows: [
            { label: 'Qatarization', was: String(x.qatarization.actuals['2025']), now: String(x.qatarization.q1) },
            { label: 'Employee Turnover', was: String(turnover.actuals['2025']), now: String(turnover.q1) },
            { label: 'Budget Variance', was: String(x.excluded[0].actuals['2025']), now: String(x.excluded[0].q1) },
            { label: 'Diabetes Prevention', was: String(x.excluded[1].actuals['2025']), now: String(x.excluded[1].q1) },
            { label: 'Diabetes Control', was: String(x.excluded[2].actuals['2025']), now: String(x.excluded[2].q1) },
          ],
        },
        trace: 'rows 71, 70, 63, 51, 52 · 2025 actual → Q1 2026',
      },
    ],

    question: {
      q: 'What happened at Education City in March — the events calendar, an access change, or a change in counting?',
      owner: 'City Operations',
    },
    signoff: 'That is the quarter. The rest is on the dashboard, and I am one tap away.',
  }
}
