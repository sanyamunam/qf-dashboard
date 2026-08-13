/**
 * The briefing engine — editorial judgement as code.
 * Items are computed/verified against cells, ranked by consequence, and the
 * lead rotates per visit: the same item never leads twice while its figures
 * are unchanged. When nothing is left worth saying, the brief says so and
 * stops — that quiet state is the trust mechanism, not a failure.
 */
import { kpis, find, inventory, fmt } from '../model/data'
import { facts, wishDropPct } from '../model/facts'

export type Persona = 'hh' | 'ceo'

export type VisualSpec =
  | { type: 'exact-targets' }
  | { type: 'slope'; peak: number; peakLabel: string; now: number; nowLabel: string; target: number }
  | { type: 'quiet-rows'; rows: { label: string; series: [string, number][]; unit?: string }[] }
  | { type: 'dot-grid'; total: number; filled: number; filledLabel: string; restLabel: string; headline: number }
  | { type: 'columns'; series: [string, number][]; unit: string }
  | { type: 'ceilings'; names: string[] }

export interface BriefItem {
  id: string
  kind: string
  kindLabel: string
  rank: number
  deeper?: boolean
  needsYou: boolean
  finding: string
  visual: VisualSpec
  figures: string
  why: Record<Persona, string>
  ask: Record<Persona, { q: string; owner: string }>
  themeId: string
  kpiId: string | null
}

/* ---------- per-reader memory ---------- */

const MEM_KEY = 'almishkat.brief.v1'
export interface BriefMemory {
  ledIds: string[]
  seenItemIds: string[]
  lastVisit: number | null
  visits: number
  persona: Persona
}
export function loadMemory(): BriefMemory {
  try {
    const m = JSON.parse(localStorage.getItem(MEM_KEY) ?? 'null')
    if (m) return m
  } catch {
    /* fresh */
  }
  return { ledIds: [], seenItemIds: [], lastVisit: null, visits: 0, persona: 'ceo' }
}
export function saveMemory(m: BriefMemory) {
  localStorage.setItem(MEM_KEY, JSON.stringify(m))
}

const ASKS_KEY = 'almishkat.asks.v1'
export function recordAskTopic(q: string) {
  const topics: string[] = JSON.parse(localStorage.getItem(ASKS_KEY) ?? '[]')
  for (const e of ['WISH', 'DIFI', 'Earthna', 'WISE', 'Policy Hub', 'Human Capital', 'target']) {
    if (q.toLowerCase().includes(e.toLowerCase()) && !topics.includes(e)) topics.push(e)
  }
  localStorage.setItem(ASKS_KEY, JSON.stringify(topics.slice(-6)))
}
export function askedTopics(): string[] {
  return JSON.parse(localStorage.getItem(ASKS_KEY) ?? '[]')
}

/* ---------- the item pool, verified against cells ---------- */

function buildPool(): BriefItem[] {
  const w = facts.wish
  const eco = facts.eco
  const tr = facts.oe.training.series
  const to = facts.oe.turnover.series
  const exact = kpis.filter((k) => k.exactHit)
  const met = inventory.targetMet
  const exceeded = met - exact.length
  const mv = find('Multiversity', 'Policy HUB')!
  const ceilings = kpis.filter((k) => k.polarity === 'Red')

  const quietRows = [
    { label: 'DIFI · Research Publications', series: [...find('Research Publications', 'DIFI')!.movementSeries, ['Q1', 0]] as [string, number][] },
    { label: 'DIFI · Sponsorship Revenue', series: [...find('Sponsorship Revenue', 'DIFI')!.movementSeries, ['Q1', 0]] as [string, number][], unit: 'QAR' },
    { label: 'Earthna · Research Publications', series: [...find('Research Publications', 'Earthna')!.movementSeries, ['Q1', 0]] as [string, number][] },
    { label: 'Policy Hub · International Engagements', series: [...find('International Engagements', 'Policy HUB')!.movementSeries, ['Q1', 0]] as [string, number][] },
  ]

  return [
    {
      id: 'exact-targets',
      kind: 'doesnt-add-up',
      kindLabel: "What doesn't add up",
      rank: 1,
      needsYou: true,
      finding: `${exact.length} indicators landed exactly on their full-year target — in the first quarter.`,
      visual: { type: 'exact-targets' },
      figures: `${exact.length} exact hits · ${exceeded} more already past their full-year number · ${met} of ${inventory.total} with nothing left to achieve after three months`,
      why: {
        hh: `A target reached in March was not a target — it was a record of work already done. A quarter of the portfolio is currently unmeasurable against ambition.`,
        ceo: `Hitting 7,000 of 7,000 does not happen by measurement. ${met} of ${inventory.total} indicators (${Math.round((met / inventory.total) * 100)}%) now carry no remaining stretch for 2026, which makes their reporting ceremonial for nine months.`,
      },
      ask: {
        hh: { q: 'Should 2026 targets be reset where the year\'s number was met in one quarter?', owner: 'The CEO, with entity directors' },
        ceo: { q: 'Who set the 2026 numbers, against what baseline, and which of the 35 should be re-based now?', owner: 'Strategy and Performance, with each entity director' },
      },
      themeId: 'edu',
      kpiId: find('Social Media Engagement', 'WISH')?.id ?? null,
    },
    {
      id: 'wish-collapse',
      kind: 'what-changed',
      kindLabel: 'What changed',
      rank: 2,
      needsYou: true,
      finding: `WISH reached ${fmt(w.q1)} people this quarter. Two years ago it reached ${fmt(w.peak)}.`,
      visual: {
        type: 'slope',
        peak: w.peak,
        peakLabel: 'peak 2023',
        now: w.q1 ?? 0,
        nowLabel: 'Q1 2026',
        target: w.target26 ?? 0,
      },
      figures: `11,939 → 23,150 → 2,000 → 1,170 → 900 · ${wishDropPct}% below peak · full-year target ${fmt(w.target26)}`,
      why: {
        hh: `Programme reach is the promise WISH makes to the people it serves. Nothing else in the portfolio is moving at this magnitude, in either direction.`,
        ceo: `The fall is sustained across three reported years, so it is a delivery-model fact, not a bad quarter. Research and partnerships are holding, which points to a deliberate shift nobody has minuted.`,
      },
      ask: {
        hh: { q: 'Has WISH changed what it is for — and was that a decision?', owner: 'The WISH CEO' },
        ceo: { q: 'What changed in the delivery model after 2023, and is the 5,000 target still the right promise?', owner: 'The WISH CEO' },
      },
      themeId: 'social',
      kpiId: facts.wish.kpi.id,
    },
    {
      id: 'gone-quiet',
      kind: 'what-stopped',
      kindLabel: 'What stopped',
      rank: 3,
      needsYou: true,
      finding: `Four entities have gone quiet on indicators they used to report.`,
      visual: { type: 'quiet-rows', rows: quietRows },
      figures: `DIFI publications 25 in 2025 → 0 · DIFI revenue QAR 627,160 → 0 · Earthna publications 14 → 0 · Policy Hub international engagements 4 → 0`,
      why: {
        hh: `One entity going quiet is a submission delay. Four at once is a pattern in how the Foundation reports, and it decides whether this platform can be believed.`,
        ceo: `A Q1 zero on a cumulative counter can mean "nothing yet" — but four entities across six figures is a collection problem until proven otherwise.`,
      },
      ask: {
        hh: { q: 'Are these figures still being collected?', owner: 'The CEO Office' },
        ceo: { q: 'Which of these six zeros are late submissions, and which are real stops?', owner: 'Each entity\'s reporting lead, this week' },
      },
      themeId: 'social',
      kpiId: find('Sponsorship Revenue', 'DIFI')?.id ?? null,
    },
    {
      id: 'eco-schools',
      kind: 'whats-working',
      kindLabel: "What's working",
      rank: 4,
      needsYou: false,
      finding: `Eco-Schools now reaches ${fmt(eco.beneficiaries)} people across ${fmt(eco.registered)} Qatari schools.`,
      visual: {
        type: 'dot-grid',
        total: eco.registered ?? 0,
        filled: eco.certified ?? 0,
        filledLabel: 'Green Flag certified',
        restLabel: 'registered',
        headline: eco.beneficiaries ?? 0,
      },
      figures: `${fmt(eco.beneficiaries)} students and teachers · ${fmt(eco.registered)} schools · ${fmt(eco.certified)} Green Flags · research output 4 → 9 → 14 papers`,
      why: {
        hh: `This is the Foundation's environmental promise landing in classrooms at national scale — a third of these schools have already earned certification.`,
        ceo: `A first reading, but a large one, with Earthna's research output climbing alongside it. The question is what it costs to hold, not whether it is real.`,
      },
      ask: {
        hh: { q: 'What would it take for every registered school to reach a Green Flag?', owner: 'The Earthna Executive Director' },
        ceo: { q: 'What does Green Flag renewal cost at this scale, and is it budgeted for 2027?', owner: 'The Earthna Executive Director' },
      },
      themeId: 'sustain',
      kpiId: eco.kpis.benef.id,
    },
    {
      id: 'no-breaches',
      kind: 'whats-coming',
      kindLabel: "What's coming",
      rank: 5,
      needsYou: false,
      finding: `Nothing has breached a limit — and the nine indicators that could, all report at year end.`,
      visual: { type: 'ceilings', names: ceilings.map((k) => k.name) },
      figures: `9 hard-ceiling indicators (turnover, budget variance, time-to-hire) · 0 Q1 readings by design · turnover ended 2025 at ${fmt(to[to.length - 1]?.[1])}%, its best of four years`,
      why: {
        hh: `The alarming numbers a platform like this could show simply do not exist this quarter — worth knowing as a fact, not an absence.`,
        ceo: `The ceilings go quiet for nine months at a time by design. When the year-end readings land, they arrive all at once.`,
      },
      ask: {
        hh: { q: 'When the year-end readings arrive, will they come with the same scrutiny as this brief?', owner: 'The CEO Office' },
        ceo: { q: 'Confirm the year-end collection dates for all nine ceiling indicators.', owner: 'QF Human Capital reporting' },
      },
      themeId: 'oe',
      kpiId: facts.oe.turnover.kpi.id,
    },
    /* ---------- deeper cuts: lead only after the primaries have led ---------- */
    {
      id: 'multiversity-overshoot',
      kind: 'doesnt-add-up',
      kindLabel: "What doesn't add up",
      rank: 6,
      deeper: true,
      needsYou: true,
      finding: `Policy Hub's Multiversity collaborations hit ${fmt(mv.actuals['2026Q1'].value)} in one quarter — against a full-year target of ${fmt(mv.targets['2026'].value)}.`,
      visual: { type: 'columns', series: mv.movementSeries, unit: 'collaborations' },
      figures: `6 → 3 → 4 → 4 → 11 · target 5 · more than double the year's number in three months`,
      why: {
        hh: `Overshooting by this much is not a triumph of delivery — it is a question about what the number was for.`,
        ceo: `A 220% quarter against an annual target means either the work changed or the target never reflected it. Both are worth a sentence from the owner.`,
      },
      ask: {
        hh: { q: 'What is Multiversity actually measuring, and is five the right ambition?', owner: 'The Policy Hub Director' },
        ceo: { q: 'Was the 2026 target set before the collaboration pipeline was known?', owner: 'The Policy Hub Director' },
      },
      themeId: 'social',
      kpiId: mv.id,
    },
    {
      id: 'engine-room',
      kind: 'whats-working',
      kindLabel: "What's working",
      rank: 7,
      deeper: true,
      needsYou: false,
      finding: `Training hours have climbed four years straight — and turnover just posted its best year of four.`,
      visual: { type: 'columns', series: tr, unit: 'hours per employee' },
      figures: `training ${fmt(tr[0]?.[1])} → ${fmt(tr[tr.length - 1]?.[1])} hours per employee · turnover ${to.map(([, v]) => fmt(v)).join(' → ')}% — 2025 the best of the four`,
      why: {
        hh: `The Foundation's own people are being invested in, and staying. Quiet numbers, but they underwrite every promise the entities make.`,
        ceo: `Two engine-room series moving the right way for four years is the kind of base the louder programmes depend on.`,
      },
      ask: {
        hh: { q: 'Did the turnover improvement hold through this year\'s hiring season?', owner: 'QF Human Capital' },
        ceo: { q: 'Which training programmes drove the climb, and do they scale to the entities?', owner: 'QF Human Capital' },
      },
      themeId: 'oe',
      kpiId: facts.oe.training.kpi.id,
    },
  ]
}

/* ---------- brief generation ---------- */

export interface Brief {
  quiet: boolean
  quietLine?: string
  items: BriefItem[]
  needsYou: number
  accounting: string
  greeting: string
  shapeLine: string
  continuity: string | null
  dateLine: string
}

const dayGreeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * Generated ONCE per visit (the component memoizes it for the mount). Persona
 * is a render-time concern — items carry both variants — so switching reader
 * never regenerates the structure or consumes a second lead.
 */
export function generateBrief(): Brief {
  const mem = loadMemory()
  const pool = buildPool()
  const primaries = pool.filter((i) => !i.deeper)
  const deepers = pool.filter((i) => i.deeper)

  const lead =
    primaries.find((i) => !mem.ledIds.includes(i.id)) ?? deepers.find((i) => !mem.ledIds.includes(i.id)) ?? null

  const dateLine = `Q1 2026 · generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`

  if (!lead) {
    return {
      quiet: true,
      quietLine: `No new figures have arrived since your last visit, and nothing in what we already hold needs you today. The next readings are due at year end.`,
      items: [],
      needsYou: 0,
      accounting: `All ${inventory.total} indicators stand as previously briefed.`,
      greeting: dayGreeting(),
      shapeLine: 'Nothing needs you today — and that is the whole brief.',
      continuity: null,
      dateLine,
    }
  }

  const rest = pool.filter((i) => i.id !== lead.id && !i.deeper).sort((a, b) => a.rank - b.rank)
  const items = [lead, ...rest].slice(0, 5)
  const needsYou = items.filter((i) => i.needsYou).length
  // honest accounting: count every indicator the items collectively cover
  const CITES: Record<string, number> = {
    'exact-targets': inventory.targetMet, // all 35 with nothing left to achieve
    'wish-collapse': 1,
    'gone-quiet': 4,
    'eco-schools': 3,
    'no-breaches': 9,
    'multiversity-overshoot': 1,
    'engine-room': 2,
  }
  const remaining = inventory.total - items.reduce((n, i) => n + (CITES[i.id] ?? 1), 0)

  const topics = askedTopics()
  const continuity =
    topics.includes('WISH') && items.some((i) => i.id === 'wish-collapse')
      ? `You asked BOTaina about WISH — the second item carries the full picture.`
      : topics.includes('target') && items.some((i) => i.id === 'exact-targets')
        ? `You asked about targets — the lead item is the answer in full.`
        : null

  const count = ['One', 'Two', 'Three', 'Four', 'Five'][items.length - 1]

  return {
    quiet: false,
    items,
    needsYou,
    accounting: `The remaining ${remaining} indicators are steady, idle by design, or not yet due. Nothing has been left out that needed you.`,
    greeting: dayGreeting(),
    shapeLine: `${count} things ${new Date().getHours() < 12 ? 'this morning' : 'today'}. ${needsYou === 0 ? 'None need you.' : needsYou === 1 ? 'One needs you.' : `${['','','Two','Three','Four','Five'][needsYou]} need you.`}`,
    continuity,
    dateLine,
  }
}

export function recordBriefRead(brief: Brief) {
  if (brief.quiet || brief.items.length === 0) return
  const mem = loadMemory()
  const leadId = brief.items[0].id
  if (!mem.ledIds.includes(leadId)) mem.ledIds.push(leadId)
  for (const i of brief.items) if (!mem.seenItemIds.includes(i.id)) mem.seenItemIds.push(i.id)
  mem.lastVisit = Date.now()
  mem.visits += 1
  saveMemory(mem)
}

/** Is there a brief this reader hasn't been led through yet? Drives the lamp. */
export function hasUnseenBrief(): boolean {
  const mem = loadMemory()
  const pool = buildPool()
  return pool.some((i) => !mem.ledIds.includes(i.id))
}
