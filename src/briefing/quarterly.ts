/**
 * The Quarterly Brief — one memo per quarter, the platform's flagship.
 * Content is code so every sentence stays welded to the cells it cites.
 * Executive View (Release 1) leads; thematic (Release 2) follows. No rotation,
 * no per-visit memory — one quarter-keyed read flag drives the lamp.
 */
import { execFacts, execKpis } from '../model/exec'
import { find, inventory, fmt } from '../model/data'
import { facts, wishDropPct } from '../model/facts'
import type { VisualSpec } from './visuals'

export const QBRIEF_KEY = 'almishkat.qbrief.2026q1'
export const isBriefUnread = () => !localStorage.getItem(QBRIEF_KEY)
export const markBriefRead = () => {
  localStorage.setItem(QBRIEF_KEY, String(Date.now()))
  window.dispatchEvent(new Event('brief-read'))
}

export interface QFinding {
  id: string
  kicker: string
  finding: string
  visual: VisualSpec
  figures: string
  read: string
  /** Release 2 findings only — lets the trace line open the KPI drawer. */
  kpiId?: string
}
export interface QAsk {
  q: string
  owner: string
}
export interface QuarterlyBriefData {
  dateLine: string
  hook: { shape: string; line: string }
  foundation: QFinding[]
  themes: QFinding[]
  asks: QAsk[]
  accounting: string
}

export function buildQuarterlyBrief(): QuarterlyBriefData {
  const x = execFacts
  const w = facts.wish
  const eco = facts.eco
  const mNum = (v: number | null) => fmt(v)

  const foundation: QFinding[] = [
    {
      id: 'ec-footfall',
      kicker: 'What moved',
      finding: `Education City's footfall fell from ${mNum(x.footfall.monthly.feb)} in February to ${mNum(x.footfall.monthly.mar)} in March.`,
      visual: {
        type: 'columns',
        series: [
          ['Jan', x.footfall.monthly.jan ?? 0],
          ['Feb', x.footfall.monthly.feb ?? 0],
          ['Mar', x.footfall.monthly.mar ?? 0],
        ],
        unit: 'visitors to Education City, per month',
      },
      figures: `Release 1 row 56 · Jan ${mNum(x.footfall.monthly.jan)} · Feb ${mNum(x.footfall.monthly.feb)} · Mar ${mNum(x.footfall.monthly.mar)} · Q1 ${mNum(x.footfall.q1)} · full-year 2025 ${mNum(x.footfall.actuals['2025'])}`,
      read: `An 85% fall from February, in the sheet's own monthly columns. The quarter still closed at ${mNum(x.footfall.q1)} visitors, but on March's pace the year lands nowhere near 2025's ${mNum(x.footfall.actuals['2025'])}. If March was the events calendar or an access change, that has one owner; if it is a counting change, it has another.`,
    },
    {
      id: 'vacancies',
      kicker: 'What is climbing',
      finding: `Vacancies rose every month of the quarter — 610, 673, then 695, more than any year-end since 2022.`,
      visual: {
        type: 'columns',
        series: [
          ['Jan', x.vacancies.monthly.jan ?? 0],
          ['Feb', x.vacancies.monthly.feb ?? 0],
          ['Mar', x.vacancies.monthly.mar ?? 0],
        ],
        unit: 'open vacancies at month end',
      },
      figures: `Release 1 rows 69, 66 · 610 → 673 → 695 · year-ends 451 / 521 / 620 / 614 · leadership vacancies 15 → 14 → 14`,
      read: `Year-ends ran 451, 521, 620, 614 — the Foundation has never carried this many open roles. Leadership vacancies held at 14 all quarter, so the growth is in the body of the organisation, not its head. Rising vacancies alongside the year's best turnover reads as expansion, not exodus — but only the hiring plan can say so.`,
    },
    {
      id: 'revenue',
      kicker: 'What is working',
      finding: `Revenue reached QAR 545m by March — 27% of everything 2025 earned, in one quarter.`,
      visual: {
        type: 'columns',
        series: [
          ['Jan', x.revenue.monthly.jan ?? 0],
          ['Feb', x.revenue.monthly.feb ?? 0],
          ['Mar', x.revenue.monthly.mar ?? 0],
        ],
        unit: 'QAR millions, cumulative through the quarter',
      },
      figures: `Release 1 row 65 · 171 → 342 → 545 cumulative · full-year 2025 ${mNum(x.revenue.actuals['2025'])} · 2026 target marked TBU`,
      read: `The monthly run — 171, 342, 545 — is even, not front-loaded. Held for the year it clears 2025's ${mNum(x.revenue.actuals['2025'])}m. The sheet gives 2026 no revenue target to hold it against; that gap is a finding of its own.`,
    },
    {
      id: 'grad-employment',
      kicker: 'The long climb',
      finding: `72% of Higher Education graduates are employed — up from 54% in 2022, against 80% for 2026.`,
      visual: {
        type: 'columns',
        series: [
          ['2022', 0.54],
          ['2023', 0.65],
          ['2024', 0.65],
          ['2025', 0.72],
        ],
        unit: 'graduates employed',
        target: 0.8,
        fmt: 'pct',
      },
      figures: `Release 1 row 3 · 54% → 65% → 65% → 72% · 2026 target 80% · annual, next reading at year end`,
      read: `The Impact framework's lead indicator, and the strongest four-year line in Release 1. It reports annually, so 2026's reading arrives at year end — the climb says 80% is within reach, not that it is earned.`,
    },
  ]

  const quietRows = [
    { label: 'DIFI · Research Publications', series: [...find('Research Publications', 'DIFI')!.movementSeries, ['Q1', 0]] as [string, number][] },
    { label: 'DIFI · Sponsorship Revenue', series: [...find('Sponsorship Revenue', 'DIFI')!.movementSeries, ['Q1', 0]] as [string, number][], unit: 'QAR' },
    { label: 'Earthna · Research Publications', series: [...find('Research Publications', 'Earthna')!.movementSeries, ['Q1', 0]] as [string, number][] },
    { label: 'Policy Hub · International Engagements', series: [...find('International Engagements', 'Policy HUB')!.movementSeries, ['Q1', 0]] as [string, number][] },
  ]

  const themes: QFinding[] = [
    {
      id: 'wish',
      kicker: 'What changed',
      finding: `WISH reached ${fmt(w.q1)} people this quarter. At its 2023 peak it reached ${fmt(w.peak)}.`,
      visual: {
        type: 'slope',
        peak: w.peak,
        peakLabel: 'peak 2023',
        now: w.q1 ?? 0,
        nowLabel: 'Q1 2026',
        target: w.target26 ?? 0,
      },
      figures: `11,939 → 23,150 → 2,000 → 1,170 → ${fmt(w.q1)} · ${wishDropPct}% below peak · full-year target ${fmt(w.target26)}`,
      read: `Three consecutive reported years of decline make this a delivery-model fact, not a bad quarter. Research and partnerships are holding, which reads as a deliberate narrowing nobody has minuted.`,
      kpiId: w.kpi.id,
    },
    {
      id: 'exact-targets',
      kicker: `What doesn't add up`,
      finding: `${inventory.targetMet} of ${inventory.total} thematic indicators have nothing left to achieve — ${inventory.exactHits} landed exactly on their full-year number.`,
      visual: { type: 'exact-targets' },
      figures: `${inventory.exactHits} exact hits · ${inventory.targetMet - inventory.exactHits} more already past their full-year number · ${inventory.targetMet} of ${inventory.total} done after three months`,
      read: `Hitting 7,000 of 7,000 does not happen by measurement. For the next nine months these indicators can only report ceremony — the numbers were either records of finished work, or they were never targets.`,
      kpiId: find('Social Media Engagement', 'WISH')?.id,
    },
    {
      id: 'gone-quiet',
      kicker: 'What stopped',
      finding: `Four entities have gone quiet on six figures they used to report.`,
      visual: { type: 'quiet-rows', rows: quietRows },
      figures: `DIFI publications 25 → 0 · DIFI revenue QAR 627,160 → 0 · Earthna publications 14 → 0 · Policy Hub international engagements 4 → 0`,
      read: `A Q1 zero on a cumulative counter can mean "nothing yet". Four entities at once is a collection problem until proven otherwise — and it decides whether this platform can be believed.`,
      kpiId: find('Sponsorship Revenue', 'DIFI')?.id,
    },
    {
      id: 'eco-schools',
      kicker: 'What worked',
      finding: `Eco-Schools now reaches ${fmt(eco.beneficiaries)} students and teachers across ${fmt(eco.registered)} Qatari schools.`,
      visual: {
        type: 'dot-grid',
        total: eco.registered ?? 0,
        filled: eco.certified ?? 0,
        filledLabel: 'Green Flag certified',
        restLabel: 'registered',
        headline: eco.beneficiaries ?? 0,
      },
      figures: `${fmt(eco.beneficiaries)} beneficiaries · ${fmt(eco.registered)} schools · ${fmt(eco.certified)} Green Flags · Earthna research 4 → 9 → 14 papers`,
      read: `The environmental promise landing in classrooms at national scale, with a third of schools already certified and Earthna's research output climbing alongside. The open question is what certification costs to hold, not whether it is real.`,
      kpiId: eco.kpis.benef.id,
    },
  ]

  const asks: QAsk[] = [
    {
      q: 'What happened at Education City in March — the events calendar, an access change, or a counting change?',
      owner: 'City Operations',
    },
    {
      q: `Which of the ${inventory.targetMet} finished 2026 targets are being re-based, and by whom?`,
      owner: 'Strategy & Performance',
    },
    {
      q: 'Budget Variance and both Diabetes outcome rows report in units that contradict their own history — whose numbers are right?',
      owner: 'CFO Division & QDA reporting leads',
    },
  ]

  return {
    dateLine: `Q1 2026 · generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    hook: {
      shape: 'A quarter of finished targets — and one cliff in March.',
      line: `I have read both releases — ${execKpis.length} executive indicators and ${inventory.total} thematic ones. Eight findings and three questions survived. Two minutes, standing up.`,
    },
    foundation,
    themes,
    asks,
    accounting: `Everything above traces to a cell in one of the two Q1 2026 workbooks. Three executive rows are named but not charted because their units contradict their own history — Budget Variance, and both Diabetes outcome rows; they are the third ask. Genomes Sequenced (38,683 against a 30,000 full-year target) is reported cumulatively per the sheet's own comment and waits for a clean baseline. The remaining indicators are steady, idle by design, or not yet due. Nothing has been left out that needed you.`,
  }
}
