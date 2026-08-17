/**
 * Alternate explore views (R8): List (fast scan, in-place expand to the full
 * drawer detail) and By Entity (entity sections, multi-entity themes only).
 * One shared filter/search/sort state lives in L2; these only change the
 * arrangement. Chart marks are the platform's shared components — BulletMicro
 * for rows. Rationale: docs/r8-views.md
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, List as ListIcon, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Kpi } from '../model/types'
import { statusOf, STATUS_COLOR, type YearKey } from '../components/charts/builders'
import { BulletMicro } from '../components/marks'
import { KpiDetailBody } from '../components/KpiDrawer'
import { EntityIcon } from '../components/EntityIcon'
import { fmt } from '../model/data'
import { rankable } from '../model/spotlight'

export type ViewId = 'grid' | 'list' | 'entity'

const VIEW_IDS: ViewId[] = ['grid', 'list', 'entity']

/** A view id persisted by an earlier session may no longer exist (Compare was
 *  removed) — an unrecognised value falls back to Grid rather than rendering
 *  nothing. */
export const loadView = (themeId: string): ViewId => {
  const v = sessionStorage.getItem(`almishkat.view.${themeId}`) as ViewId | null
  return v && VIEW_IDS.includes(v) ? v : 'grid'
}
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
        <span className="flex min-w-0 items-center gap-2.5">
          <EntityIcon entity={k.entity} size={20} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{k.name}</span>
            <span className="block text-[11px] leading-tight text-ink-mute">
              {k.entity} · {k.category}
            </span>
          </span>
        </span>
        <span className="num text-right text-[15px] font-bold text-sidra">{figure}</span>
        <span className="flex justify-end">
          {/* snapshot, not history: current position against the 2026 target.
              Only a year-end reporter's or an off-cycle indicator's Q1 zero is
              an artifact and draws nothing — every other zero is a real
              reading and gets a bar, or the row hides the finding. */}
          {k.actuals['2026Q1'].value !== null &&
          (k.targets['2026'].value ?? 0) > 0 &&
          k.state !== 'REPORTS_AT_YEAR_END' &&
          k.state !== 'IDLE_THIS_CYCLE' ? (
            <BulletMicro
              actual={k.actuals['2026Q1'].value as number}
              target={k.targets['2026'].value as number}
              /* R10 fix 7: rows speak the same status language as the cards */
              hue={(() => {
                const st = statusOf(k)
                return st === 'met' || st === 'behind' || st === 'breach' ? STATUS_COLOR[st].fill : hue
              })()}
            />
          ) : null}
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
              <h3 className="flex items-center gap-2.5 text-[16px] font-semibold text-ink">
                <EntityIcon entity={e} size={24} /> {e}
              </h3>
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
