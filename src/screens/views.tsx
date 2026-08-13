/**
 * Alternate explore views (R8): List (fast scan, in-place expand to the full
 * drawer detail), Compare (small set on one normalised axis), By Entity
 * (entity sections, multi-entity themes only). One shared filter/search/sort
 * state lives in L2; these only change the arrangement. Chart marks are the
 * platform's shared components — MiniLine for rows, the EChart adapter for
 * anything larger. Rationale: docs/r8-views.md
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, List as ListIcon, BarChart3, Building2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Kpi } from '../model/types'
import type { YearKey } from '../components/charts/builders'
import { AXIS } from '../components/charts/EChart'
import { EChart } from '../components/charts/EChart'
import { MiniLine } from '../components/marks'
import { KpiDetailBody } from '../components/KpiDrawer'
import { fmt } from '../model/data'
import { rankable } from '../model/spotlight'

export type ViewId = 'grid' | 'list' | 'compare' | 'entity'

export const loadView = (themeId: string): ViewId =>
  (sessionStorage.getItem(`almishkat.view.${themeId}`) as ViewId) ?? 'grid'
export const saveView = (themeId: string, v: ViewId) => sessionStorage.setItem(`almishkat.view.${themeId}`, v)

/* ---------- the switcher ---------- */

export function ViewSwitcher({
  view,
  onChange,
  hue,
  multiEntity,
}: {
  view: ViewId
  onChange: (v: ViewId) => void
  hue: string
  multiEntity: boolean
}) {
  const options: { id: ViewId; label: string; Icon: typeof LayoutGrid }[] = [
    { id: 'grid', label: 'Grid', Icon: LayoutGrid },
    { id: 'list', label: 'List', Icon: ListIcon },
    { id: 'compare', label: 'Compare', Icon: BarChart3 },
    ...(multiEntity ? [{ id: 'entity' as ViewId, label: 'By Entity', Icon: Building2 }] : []),
  ]
  return (
    <div className="flex items-center gap-1 rounded-input bg-cream/80 p-1" role="tablist" aria-label="Explore view">
      {options.map(({ id, label, Icon }) => {
        const on = view === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(id)}
            className="flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200"
            style={on ? { background: '#fff', color: hue, boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-ink-soft)' }}
          >
            <Icon size={15} strokeWidth={1.7} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- shared row bits ---------- */

const BANDS = ['Impact', 'Strategic', 'Operational'] as const

function movementCell(k: Kpi): { text: string; tone: string } {
  if (k.propChange !== null && k.movementSeries.length >= 3 && rankable(k)) {
    const pct = Math.round(k.propChange * 100)
    return {
      text: `${pct > 0 ? '+' : ''}${pct}%`,
      tone: pct > 0 ? '#3c6a5f' : pct < 0 ? '#8a1538' : '#7e938d',
    }
  }
  const t = k.targets['2026'].value
  const a = k.actuals['2026Q1'].value
  if (a !== null && t) return { text: `${fmt(a)} of ${fmt(t)}`, tone: '#7e938d' }
  if (k.state === 'REPORTS_AT_YEAR_END') return { text: 'year end', tone: '#9aaba5' }
  if (k.state === 'IDLE_THIS_CYCLE') return { text: 'idle', tone: '#9aaba5' }
  return { text: '—', tone: '#9aaba5' }
}

function Row({
  k,
  hue,
  year,
  expanded,
  onToggle,
}: {
  k: Kpi
  hue: string
  year: YearKey
  expanded: boolean
  onToggle: () => void
}) {
  const mv = movementCell(k)
  const figure =
    year === '2026Q1'
      ? (k.actuals['2026Q1'].value !== null ? fmt(k.actuals['2026Q1'].value) : (k.actuals['2026Q1'].raw ?? '—'))
      : (k.actuals[year]?.value !== null ? fmt(k.actuals[year]?.value) : '—')
  return (
    <div className="border-b border-ink-mute/10">
      <button
        onClick={onToggle}
        className="grid w-full items-center gap-4 py-2.5 text-left transition-colors hover:bg-cream/50"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 130px 110px 20px' }}
        aria-expanded={expanded}
      >
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{k.name}</span>
          <span className="block text-[11px] leading-tight text-ink-mute">
            {k.entity} · {k.category}
          </span>
        </span>
        <span className="num text-right text-[15px] font-bold text-sidra">{figure}</span>
        <span className="flex justify-end">
          {k.movementSeries.length >= 3 ? <MiniLine series={k.movementSeries} hue={hue} w={110} h={24} /> : null}
        </span>
        <span className="num text-right text-[12.5px] font-semibold" style={{ color: mv.tone }}>
          {mv.text}
        </span>
        <span className="text-ink-mute">
          {expanded ? <ChevronUp size={15} strokeWidth={1.7} /> : <ChevronDown size={15} strokeWidth={1.7} />}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {/* the same detail the KPI drawer shows, in place — scanning stays uninterrupted */}
            <div className="mb-4 rounded-card bg-card p-5 shadow-(--shadow-card)">
              <KpiDetailBody kpi={k} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- List view ---------- */

export function ListView({
  kpis,
  hue,
  sort,
  year,
}: {
  kpis: Kpi[]
  hue: string
  sort: string
  year: YearKey
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const grouped = sort !== 'mover' && sort !== 'gap'

  if (!grouped)
    return (
      <div className="mt-5">
        {kpis.map((k) => (
          <Row key={k.id} k={k} hue={hue} year={year} expanded={expandedId === k.id} onToggle={() => setExpandedId((e) => (e === k.id ? null : k.id))} />
        ))}
      </div>
    )

  return (
    <div className="mt-5">
      {BANDS.map((band) => {
        const list = kpis.filter((k) => k.framework === band)
        if (list.length === 0) return null
        return (
          <div key={band}>
            <div
              className="label sticky z-10 border-b-2 bg-cream py-2 text-[11px]"
              style={{ top: 66, color: hue, borderColor: `color-mix(in srgb, ${hue} 25%, transparent)` }}
            >
              {band} · {list.length}
            </div>
            {list.map((k) => (
              <Row key={k.id} k={k} hue={hue} year={year} expanded={expandedId === k.id} onToggle={() => setExpandedId((e) => (e === k.id ? null : k.id))} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Compare view ---------- */

const CAP = 8
const comparable = (k: Kpi) =>
  k.polarity === 'Green' && (k.targets['2026'].value ?? 0) > 0 && k.actuals['2026Q1'].value !== null

export function CompareView({
  kpis,
  defaults,
  hue,
  onOpenKpi,
}: {
  kpis: Kpi[]
  defaults: Kpi[]
  hue: string
  onOpenKpi: (k: Kpi) => void
}) {
  const [ids, setIds] = useState<string[]>(() =>
    defaults.filter(comparable).slice(0, 4).map((k) => k.id),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const pool = useMemo(() => kpis.filter(comparable), [kpis])
  const selected = pool.filter((k) => ids.includes(k.id))
  const excludedCount = kpis.length - pool.length
  const atCap = selected.length >= CAP

  const rows = selected
    .map((k) => ({
      k,
      pct: Math.round(((k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number)) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((k) => (
          <span key={k.id} className="flex items-center gap-1.5 rounded-chip bg-card px-2.5 py-1 text-[12px] shadow-(--shadow-card)">
            <span className="font-medium text-ink">{k.name}</span>
            <span className="text-ink-mute">{k.entity}</span>
            <button onClick={() => setIds((s) => s.filter((i) => i !== k.id))} aria-label={`Remove ${k.name}`} className="text-ink-mute hover:text-maroon">
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={() => !atCap && setPickerOpen((o) => !o)}
            disabled={atCap}
            className="flex items-center gap-1 rounded-chip px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={atCap ? { color: '#9aaba5', cursor: 'default' } : { color: hue, background: 'var(--color-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <Plus size={13} strokeWidth={2} /> {atCap ? `${CAP} is the legible limit — remove one to add` : 'Add indicator'}
          </button>
          {pickerOpen && !atCap && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[280px] w-[340px] overflow-y-auto rounded-input bg-card p-1.5 shadow-(--shadow-card-hover)">
              {pool
                .filter((k) => !ids.includes(k.id))
                .map((k) => (
                  <button
                    key={k.id}
                    onClick={() => {
                      setIds((s) => [...s, k.id])
                      setPickerOpen(false)
                    }}
                    className="flex w-full items-baseline justify-between gap-3 rounded-chip px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-cream"
                  >
                    <span className="min-w-0 truncate text-ink">{k.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-mute">{k.entity}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-card bg-card p-6 text-[13.5px] italic text-ink-mute shadow-(--shadow-card)">
          Nothing comparable is selected — add indicators with a 2026 target and a Q1 reading.
        </div>
      ) : (
        <>
          {/* one shared axis: % of full-year 2026 target, so mixed units compare honestly */}
          <div className="mt-4 rounded-card bg-card p-5 shadow-(--shadow-card)">
            <div className="mb-1 text-[11.5px] text-ink-mute">
              Q1 actual as % of the full-year 2026 target — the only axis these units share
            </div>
            <EChart
              height={Math.max(160, rows.length * 44 + 60)}
              option={{
                grid: { left: 210, right: 70, top: 10, bottom: 24 },
                xAxis: { type: 'value', ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: '{value}%' } },
                yAxis: {
                  type: 'category',
                  data: rows.map((r) => `${r.k.name.length > 26 ? r.k.name.slice(0, 24) + '…' : r.k.name}  ·  ${r.k.entity}`).reverse(),
                  ...AXIS,
                  axisLabel: { ...AXIS.axisLabel, fontFamily: 'Instrument Sans', fontSize: 11.5 },
                },
                series: [
                  {
                    type: 'bar',
                    data: rows.map((r) => r.pct).reverse(),
                    barMaxWidth: 18,
                    itemStyle: { color: hue, borderRadius: [0, 4, 4, 0] },
                    label: {
                      show: true,
                      position: 'right',
                      fontFamily: 'Space Grotesk',
                      fontWeight: 700,
                      fontSize: 12,
                      color: '#47605a',
                      formatter: '{c}%',
                    },
                    markLine: {
                      silent: true,
                      symbol: 'none',
                      lineStyle: { type: 'dashed', color: '#9ca3af', width: 1.2 },
                      label: { formatter: 'full year', position: 'insideEndTop', color: '#9ca3af', fontSize: 10 },
                      data: [{ xAxis: 100 }],
                    },
                  },
                ],
              }}
            />
          </div>

          {/* the figures behind the visual */}
          <div className="mt-3 overflow-hidden rounded-card bg-card shadow-(--shadow-card)">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-cream text-left text-ink-mute">
                  <th className="px-4 py-2 font-medium">Indicator</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="num px-3 py-2 text-right font-medium">Q1 actual</th>
                  <th className="num px-3 py-2 text-right font-medium">2026 target</th>
                  <th className="num px-4 py-2 text-right font-medium">% of target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k.id} className="cursor-pointer border-b border-cream/70 last:border-0 hover:bg-cream/50" onClick={() => onOpenKpi(r.k)}>
                    <td className="px-4 py-2 font-medium text-ink">{r.k.name}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.k.entity}</td>
                    <td className="num px-3 py-2 text-right">{fmt(r.k.actuals['2026Q1'].value)}</td>
                    <td className="num px-3 py-2 text-right">{fmt(r.k.targets['2026'].value)}</td>
                    <td className="num px-4 py-2 text-right font-bold" style={{ color: hue }}>
                      {r.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {excludedCount > 0 && (
        <p className="mt-2.5 text-[11.5px] text-ink-mute">
          {excludedCount} of the current set can't sit on this axis (no 2026 target, no Q1 reading, or a
          ceiling indicator) — they're in Grid and List, not hidden.
        </p>
      )}
    </div>
  )
}

/* ---------- By Entity view ---------- */

export function EntityView({
  kpis,
  hue,
  year,
}: {
  kpis: Kpi[]
  hue: string
  year: YearKey
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const entities = [...new Set(kpis.map((k) => k.entity))]

  return (
    <div className="mt-5 flex flex-col gap-8">
      {entities.map((e) => {
        const slice = kpis.filter((k) => k.entity === e)
        const movers = slice
          .filter((k) => rankable(k) && k.propChange !== null && k.movementSeries.length >= 3)
          .sort((a, b) => Math.abs(b.movementScore ?? 0) - Math.abs(a.movementScore ?? 0))
        const top = movers[0]
        const withReading = slice.filter((k) => k.actuals['2026Q1'].value !== null).length
        const summary = top
          ? `Biggest movement: ${top.name}, ${Math.round((top.propChange ?? 0) * 100) > 0 ? 'up' : 'down'} ${Math.abs(Math.round((top.propChange ?? 0) * 100))}% across its readings.`
          : `Mostly first readings this quarter — no movement measurable yet.`
        return (
          <section key={e} aria-label={e}>
            <div className="flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: `color-mix(in srgb, ${hue} 25%, transparent)` }}>
              <h3 className="text-[16px] font-semibold text-ink">{e}</h3>
              <span className="num text-[12px] text-ink-mute">
                {slice.length} indicators · {withReading} with a Q1 reading
              </span>
            </div>
            <p className="voice mt-1.5 text-[13px] italic text-ink-soft">{summary}</p>
            <div className="mt-2">
              {slice.map((k) => (
                <Row key={k.id} k={k} hue={hue} year={year} expanded={expandedId === k.id} onToggle={() => setExpandedId((x) => (x === k.id ? null : k.id))} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
