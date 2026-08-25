/**
 * The Executive Dashboard's period, status and category-tree model, and the
 * global-search machinery over all 240 OBS rows. One `statusFor` drives the
 * cards, the four counts, the AI summary and the search facet — none of them
 * can disagree.
 *
 * Brainstorm, rejected alternatives and verification:
 * docs/exec-dashboard-notes.md
 */
import {
  obsKpis,
  unitOf,
  isLowerBetter,
  histOf,
  targOf,
  q1Of,
  lift,
  obsAsKpi,
  A_YEARS,
  type ObsKpi,
} from './obs'
import { fmt } from './data'
import type { Kpi, CellReading } from './types'

/* ─────────────────────────── the two periods ───────────────────────────
 * Neither period alone is sufficient — the five Education KPIs have no Q1
 * 2026 reading, and Total Policy Adoptions exists ONLY in Q1 2026. One
 * filter, one period, applied to everything at once; the two periods are
 * never mixed on screen, and a missing reading shows the not-reported
 * treatment rather than a figure borrowed from the other year. */
export type Period = '2025' | 'q1'

export const PERIOD_LABEL: Record<Period, string> = {
  '2025': '2025 · full year',
  q1: 'Q1 2026 · quarter',
}

/** The actual for the selected period, unit-normalised — or null, honestly. */
export const actualFor = (k: ObsKpi, p: Period): number | null => (p === 'q1' ? q1Of(k) : histOf(k, '2025'))

/** The target the period is judged against. A numeric 0 (Budget Variance) IS
 *  a target; `TBU` is null, never zero. */
export const targetFor = (k: ObsKpi, p: Period): number | null => (p === 'q1' ? targOf(k, '2026') : targOf(k, '2025'))

/* ─────────────────────────── the four states ─────────────────────────── */

export type DashStatus = 'performing' | 'atRisk' | 'notReported' | 'monitoring'

export const STATUS_LABEL: Record<DashStatus, string> = {
  performing: 'Performing well',
  atRisk: 'At risk',
  notReported: 'Not reported',
  monitoring: 'Monitoring',
}

/** Dot colours from the build's own status palette (marks/builders). */
export const STATUS_DOT: Record<DashStatus, string> = {
  performing: '#3c6a5f',
  atRisk: '#8a1538',
  notReported: '#9aaba5',
  monitoring: '#b8860b',
}

export const STATUS_SENSE: Record<DashStatus, string> = {
  performing: 'meets or exceeds target',
  atRisk: 'below target',
  notReported: 'no reading this period',
  monitoring: 'a reading, but no target to judge it against',
}

/**
 * Polarity governs direction: Budget Variance is `Red` (lower is better), so
 * 18% against a target of 0 is AT RISK, never performing. Monitoring keeps
 * the model honest — a reading with no target gets no pass/fail verdict.
 */
export function statusFor(k: ObsKpi, p: Period): DashStatus {
  const a = actualFor(k, p)
  if (a === null) return 'notReported'
  const t = targetFor(k, p)
  if (t === null) return 'monitoring'
  const meets = isLowerBetter(k) ? a <= t : a >= t
  return meets ? 'performing' : 'atRisk'
}

/* ─────────────────────────── the dashboard ten ─────────────────────────── */

export const execRows: ObsKpi[] = obsKpis.filter((k) => (k.dashboard ?? '').startsWith('Exec'))

/** Read from the sheet's blue fill via the parser — never a hard-coded list. */
export const dashTen: ObsKpi[] = execRows.filter((k) => k.highlighted)

export function statusCounts(p: Period, within: ObsKpi[] = dashTen): Record<DashStatus, ObsKpi[]> {
  const out: Record<DashStatus, ObsKpi[]> = { performing: [], atRisk: [], notReported: [], monitoring: [] }
  for (const k of within) out[statusFor(k, p)].push(k)
  return out
}

/* ─────────────────────── the category tree, parsed ───────────────────────
 * `Category` is `Parent - Child`, split on the space-hyphen-space delimiter
 * at parse time. A value with no delimiter is a standalone group. A row with
 * no category at all (Patents Granted – Other) routes to an explicit
 * `Uncategorised` group — never a group called `None`. */
export const UNCAT = 'Uncategorised'

export const groupOf = (k: ObsKpi) => (k.category.trim() ? k.group : UNCAT)
export const subOf = (k: ObsKpi) => (k.category.trim() ? k.subgroup : UNCAT)

export interface CatNode {
  parent: string
  total: number
  /** empty = standalone: cards render directly under the parent */
  subs: { name: string; total: number }[]
}

export function buildTree(rows: ObsKpi[]): CatNode[] {
  const parents = new Map<string, Map<string, number>>()
  for (const k of rows) {
    const g = groupOf(k)
    if (!parents.has(g)) parents.set(g, new Map())
    const subs = parents.get(g)!
    const s = subOf(k)
    subs.set(s, (subs.get(s) ?? 0) + 1)
  }
  return [...parents].map(([parent, subs]) => {
    const total = [...subs.values()].reduce((a, b) => a + b, 0)
    const subList = [...subs].map(([name, n]) => ({ name, total: n }))
    const standalone = subList.length === 1 && subList[0].name === parent
    return { parent, total, subs: standalone ? [] : subList.sort((a, b) => b.total - a.total) }
  })
}

/** Either level matches — selecting a parent includes all its children. */
export const inCategory = (k: ObsKpi, label: string): boolean => groupOf(k) === label || subOf(k) === label

/* ────────────── the card's Kpi, per period — no borrowed figures ────────────── */

const reading = (v: number | null): CellReading => ({ value: v, raw: null, flag: null })

/**
 * Under Q1 2026 an annual KPI gets an EMPTY series — the not-reported
 * treatment, never its 2025 figure standing in. Under 2025 the series stops
 * at 2025 and the year rides with the figure (the card does this itself).
 * The drawer reads the full history separately (obsAsKpi), where a chart
 * labelled by year is honest.
 */
export function cardKpi(k: ObsKpi, p: Period): Kpi {
  const base = obsAsKpi(k.row)
  const a = actualFor(k, p)
  if (a === null)
    return {
      ...base,
      id: `${base.id}-${p}`,
      actuals: { ...base.actuals, '2026Q1': reading(null) },
      movementSeries: [],
      historyPoints: 0,
      hasEnoughHistoryForLine: false,
      state: 'REPORTS_AT_YEAR_END',
    }
  if (p === 'q1') return { ...base, id: `${base.id}-q1` }
  return {
    ...base,
    id: `${base.id}-2025`,
    actuals: { ...base.actuals, '2026Q1': reading(null) },
    state: 'REPORTS_AT_YEAR_END',
  }
}

/* ─────────────────── the card's line, per KPI and period ─────────────────── */

const n = (k: ObsKpi, v: number) => `${fmt(v)}${unitOf(k)}`

export function lineFor(k: ObsKpi, p: Period): string {
  const a = actualFor(k, p)
  const t = targetFor(k, p)
  const label = p === 'q1' ? 'the first quarter' : '2025'
  if (a === null)
    return p === 'q1'
      ? 'No Q1 2026 reading — this indicator reports on the full year; the 2025 view carries its complete figure.'
      : 'No 2025 reading on record — this indicator first reported in Q1 2026.'
  if (t === null) {
    const prev = p === 'q1' ? histOf(k, '2025') : histOf(k, '2024')
    const move =
      prev !== null && prev !== 0
        ? ` — ${a >= prev ? 'up' : 'down'} from ${n(k, prev)} ${p === 'q1' ? 'across 2025' : 'in 2024'}`
        : ''
    return `${n(k, a)} in ${label}${move}. No ${p === 'q1' ? '2026' : '2025'} target is set, so this is watched, not judged.`
  }
  const meets = isLowerBetter(k) ? a <= t : a >= t
  const dir = isLowerBetter(k) ? ', where lower is better' : ''
  return meets
    ? `${n(k, a)} in ${label}, meeting the ${n(k, t)} target${dir}.`
    : `${n(k, a)} in ${label} against a target of ${n(k, t)}${dir} — off target.`
}

/* ─────────────────────── the AI summary, per period ─────────────────────── */

export interface DashSummary {
  collapsed: string
  prose: string
  performing: ObsKpi | null
  atRisk: ObsKpi | null
}

const missOf = (k: ObsKpi, p: Period): number => {
  const a = actualFor(k, p) as number
  const t = targetFor(k, p) as number
  return Math.abs(a - t) / Math.max(Math.abs(t), 1)
}

export function summaryFor(p: Period): DashSummary {
  const c = statusCounts(p)
  const atRisk = [...c.atRisk].sort((a, b) => missOf(b, p) - missOf(a, p))[0] ?? null
  const performing = c.performing[0] ?? null
  const label = p === 'q1' ? 'this quarter' : 'in 2025'
  const plural = (x: number, s: string, pl: string) => `${x} ${x === 1 ? s : pl}`
  const collapsed = `${c.performing.length} of ${dashTen.length} performing, ${c.atRisk.length} at risk ${label} — ${
    atRisk ? `${atRisk.name.trim()} is the one to look at` : 'nothing needs intervention'
  }; ${plural(c.monitoring.length, 'has', 'have')} no target and ${plural(c.notReported.length, 'has', 'have')} not reported.`
  const prose =
    p === 'q1'
      ? 'Only five of the ten report quarterly, so this is the mid-flight view. Spending variance has widened to 18% against a plan of zero while Qatarization holds its 25% target, and two of the six policy adoptions targeted for 2026 have landed. The five Education indicators report on the full year — the 2025 view carries their complete figures.'
      : 'The complete-year view. Qatarization closed 2025 a point over its target and budget variance closed at 10% against a plan of zero. Seven of the ten carry no 2025 target, so they are watched rather than judged; Total Policy Adoptions had not yet begun reporting.'
  return { collapsed, prose, performing, atRisk }
}

/* ───────────────────── search: filters, matching, NL ───────────────────── */

export interface SearchFilters {
  q: string
  dash: string[]
  status: DashStatus[]
  cats: string[]
  entities: string[]
  themes: string[]
}

export const entityOf = (k: ObsKpi) => k.proposedEntity ?? k.entity ?? 'Unassigned'
export const themeOf = (k: ObsKpi) => k.theme ?? 'Unassigned'
export const dashOf = (k: ObsKpi) => ((k.dashboard ?? '').startsWith('Exec') ? 'Executive' : 'Thematic')

export function matches(k: ObsKpi, f: SearchFilters, p: Period, skip?: keyof SearchFilters): boolean {
  const term = f.q.trim().toLowerCase()
  if (skip !== 'q' && term) {
    const hay = `${k.name} ${entityOf(k)} ${k.category} ${themeOf(k)} ${k.definition ?? ''}`.toLowerCase()
    if (!term.split(/\s+/).every((w) => hay.includes(w))) return false
  }
  if (skip !== 'dash' && f.dash.length && !f.dash.includes(dashOf(k))) return false
  if (skip !== 'status' && f.status.length && !f.status.includes(statusFor(k, p))) return false
  if (skip !== 'cats' && f.cats.length && !f.cats.some((c) => inCategory(k, c))) return false
  if (skip !== 'entities' && f.entities.length && !f.entities.includes(entityOf(k))) return false
  if (skip !== 'themes' && f.themes.length && !f.themes.includes(themeOf(k))) return false
  return true
}

export interface Chip {
  kind: 'dash' | 'status' | 'cat' | 'entity' | 'theme'
  value: string
  label: string
  /** derived from typed text — replaced when a new query is submitted */
  fromText?: boolean
}

const STATUS_PHRASES: [RegExp, DashStatus][] = [
  [/\bat risk\b|\brisk\b|\bbehind\b|\bfailing\b|\boff target\b/, 'atRisk'],
  [/\bperforming\b|\bdoing well\b|\bon target\b|\bmeets? target\b/, 'performing'],
  [/\bnot reported\b|\bmissing (?:data|readings?)\b|\bno readings?\b/, 'notReported'],
  [/\bno targets?\b|\bwithout (?:a )?targets?\b|\bmonitoring\b/, 'monitoring'],
]

/**
 * `which KPIs are at risk`, `what has no target`, `education indicators` all
 * resolve to structured chips; whatever remains is a text term. The chips are
 * shown, removable, so the reader sees how the question was understood.
 */
export function interpret(rawQ: string): { chips: Chip[]; residue: string } {
  let q = ` ${rawQ.toLowerCase()} `
  const chips: Chip[] = []
  const take = (re: RegExp) => {
    const m = q.match(re)
    if (m) q = q.replace(re, ' ')
    return m
  }

  for (const [re, s] of STATUS_PHRASES) if (take(re)) chips.push({ kind: 'status', value: s, label: STATUS_LABEL[s] })
  if (take(/\bexecutive\b/)) chips.push({ kind: 'dash', value: 'Executive', label: 'Executive dashboard' })
  if (take(/\bthematic\b/)) chips.push({ kind: 'dash', value: 'Thematic', label: 'Thematic dashboard' })

  const tree = buildTree(obsKpis)
  const catNames = [...new Set(tree.flatMap((t) => [t.parent, ...t.subs.map((s) => s.name)]))].filter((c) => c !== UNCAT)
  const themes = [...new Set(obsKpis.map((k) => k.theme).filter((t): t is string => !!t && t !== 'All'))]
  const entities = [...new Set(obsKpis.map((k) => k.proposedEntity).filter((e): e is string => !!e))]
  const vocab: { kind: Chip['kind']; value: string }[] = [
    ...catNames.map((v) => ({ kind: 'cat' as const, value: v })),
    ...themes.map((v) => ({ kind: 'theme' as const, value: v })),
    ...entities.map((v) => ({ kind: 'entity' as const, value: v })),
  ].sort((a, b) => b.value.length - a.value.length)
  for (const v of vocab) {
    const re = new RegExp(`\\b${v.value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (take(re)) chips.push({ kind: v.kind, value: v.value, label: v.value })
  }

  q = q.replace(/\b(which|what|kpis?|indicators?|show|me|all|are|is|has|have|the|a|an|in|of|for|with)\b/g, ' ')
  return { chips, residue: q.replace(/\s+/g, ' ').trim() }
}

export function chipsToFilters(chips: Chip[], residue: string): SearchFilters {
  const f: SearchFilters = { q: residue, dash: [], status: [], cats: [], entities: [], themes: [] }
  for (const c of chips) {
    if (c.kind === 'dash') f.dash.push(c.value)
    else if (c.kind === 'status') f.status.push(c.value as DashStatus)
    else if (c.kind === 'cat') f.cats.push(c.value)
    else if (c.kind === 'entity') f.entities.push(c.value)
    else if (c.kind === 'theme') f.themes.push(c.value)
  }
  return f
}

export { obsAsKpi, unitOf, lift }
export type { ObsKpi }
