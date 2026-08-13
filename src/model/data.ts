import raw from '../data/kpis.json'
import type { Kpi, KpiModel, KpiState } from './types'

export const model = raw as unknown as KpiModel
export const kpis = model.kpis

export interface ThemeMeta {
  id: string
  name: string
  hue: string
  fill: string
  soft: string
  isBanner?: boolean
}

/** Theme identity colours. Lime and maroon are semantic and are never used here. */
export const THEMES: ThemeMeta[] = [
  { id: 'social', name: 'Social Progress', hue: 'var(--color-th-social)', fill: '#556bb4', soft: 'rgba(85,107,180,0.10)' },
  { id: 'sustain', name: 'Sustainability', hue: 'var(--color-th-sustain)', fill: '#2e7d5b', soft: 'rgba(46,125,91,0.10)' },
  { id: 'edu', name: 'Progressive Education', hue: 'var(--color-th-edu)', fill: '#e5a823', soft: 'rgba(201,143,27,0.10)' },
  { id: 'ai', name: 'Artificial Intelligence', hue: 'var(--color-th-ai)', fill: '#0cc1e9', soft: 'rgba(14,147,181,0.10)' },
  { id: 'health', name: 'Precision Health', hue: 'var(--color-th-health)', fill: '#5b2e8a', soft: 'rgba(91,46,138,0.08)' },
  { id: 'oe', name: 'Organizational Excellence', hue: 'var(--color-th-oe)', fill: '#1f2a44', soft: 'rgba(31,42,68,0.08)', isBanner: true },
]

const FALLBACK_THEME: ThemeMeta = {
  id: 'unknown',
  name: 'Unknown',
  hue: 'var(--color-sidra)',
  fill: '#034638',
  soft: 'rgba(3,70,56,0.08)',
}
/** Never throws: an unmatched id degrades to brand green rather than crashing a card. */
export const themeById = (id: string): ThemeMeta => THEMES.find((t) => t.id === id) ?? FALLBACK_THEME
export const themeByName = (name: string): ThemeMeta => THEMES.find((t) => t.name === name) ?? FALLBACK_THEME
export const themeKpis = (themeName: string) => kpis.filter((k) => k.theme === themeName)

export const find = (namePart: string, entity?: string): Kpi | undefined =>
  kpis.find(
    (k) =>
      k.name.toLowerCase().includes(namePart.toLowerCase()) &&
      (!entity || k.entity.toLowerCase().includes(entity.toLowerCase())),
  )

export const stateCount = (list: Kpi[], state: KpiState) => list.filter((k) => k.state === state).length

export const fmt = (n: number | null | undefined, opts: Intl.NumberFormatOptions = {}): string =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: 1, ...opts }).format(n)

/* ---------- the findings engine: what "needs you" is computed, never hardcoded ---------- */

export interface Finding {
  id: string
  kind: 'movement' | 'calibration' | 'overshoot' | 'breach'
  kpi: Kpi
  headline: string
  detail: string
  ask: string
}

function buildFindings(): Finding[] {
  const out: Finding[] = []

  // 1. Hard-ceiling breaches (Polarity Red, actual above target). Empty at Q1 2026 — and that emptiness is rendered as truth.
  for (const k of kpis.filter((k) => k.state === 'ABOVE_CEILING')) {
    out.push({
      id: `breach-${k.id}`,
      kind: 'breach',
      kpi: k,
      headline: `${k.name} is above its ceiling`,
      detail: `${k.entity} reported ${fmt(k.actuals['2026Q1'].value)} against a limit of ${fmt(k.targets['2026'].value)}.`,
      ask: `Ask ${k.entity} what is driving the breach.`,
    })
  }

  // 2. Largest scale-weighted movement in a real-world quantity, with real history.
  const movers = kpis
    .filter((k) => k.movementScore !== null && k.movementSeries.length >= 3 && (k.propChange ?? 0) < -0.3)
    .sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))
  if (movers[0]) {
    const k = movers[0]
    const s = k.movementSeries
    out.push({
      id: `movement-${k.id}`,
      kind: 'movement',
      kpi: k,
      headline: `${k.entity} ${k.name.toLowerCase()}: ${fmt(s[0][1])} in ${s[0][0]} to ${fmt(s[s.length - 1][1])} now`,
      detail: `The largest sustained movement in the portfolio. Nothing else is moving at this magnitude.`,
      ask: `Ask ${k.entity} what changed in the delivery model.`,
    })
  }

  // 3. Target calibration: full-year targets landed exactly, inside the first quarter.
  const exact = kpis.filter((k) => k.exactHit)
  if (exact.length >= 3) {
    out.push({
      id: 'calibration',
      kind: 'calibration',
      kpi: exact[0],
      headline: `${exact.length} indicators sit exactly on their full-year target after one quarter`,
      detail: `Several landed on the number precisely — a signal about how the 2026 targets were set, not about performance.`,
      ask: 'Ask who set the 2026 targets, and against what baseline.',
    })
  }

  // 4. Overshoot beyond 2x: a target-setting question, not a win.
  const over = kpis.filter((k) => k.overshoot).sort((a, b) => (b.propChange ?? 0) - (a.propChange ?? 0))
  if (over[0]) {
    const k = over[0]
    out.push({
      id: `overshoot-${k.id}`,
      kind: 'overshoot',
      kpi: k,
      headline: `${k.name} came in at more than double its target`,
      detail: `${k.entity}: ${fmt(k.actuals['2026Q1'].value)} against ${fmt(k.targets['2026'].value)}. Large overshoots are a calibration flag, not confetti.`,
      ask: `Ask ${k.entity} whether the 2026 target reflects a real commitment.`,
    })
  }

  return out
}

export const findings = buildFindings()
export const needsYouCount = findings.length

/* ---------- state inventory ---------- */
export const inventory = {
  total: kpis.length,
  inProgress: kpis.filter((k) => k.state === 'IN_PROGRESS').length,
  targetMet: kpis.filter((k) => k.state === 'TARGET_ALREADY_MET').length,
  yearEnd: kpis.filter((k) => k.state === 'REPORTS_AT_YEAR_END').length,
  idle: kpis.filter((k) => k.state === 'IDLE_THIS_CYCLE').length,
  breaches: kpis.filter((k) => k.state === 'ABOVE_CEILING').length,
  exactHits: kpis.filter((k) => k.exactHit).length,
  entities: [...new Set(kpis.map((k) => k.entity))],
}
