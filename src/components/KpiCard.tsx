/**
 * THE card (R8 fixes 3/6/9, R9 fixes 1/2/4): one component for spotlight and
 * explore grid, differing only in size. Every card carries the entity icon, a
 * polarity arrow whose colour reflects the judgement (favourable given the
 * indicator's direction — a falling number can be good news), the comparison
 * basis in words, and a snapshot chart only — trends live in the overlay.
 *
 * R9: the card is a FIXED TEMPLATE. Its four rows have declared heights, so a
 * three-bar grouped card and a single-figure card occupy the same footprint
 * wherever they appear. Content fits the card; it never dictates the card.
 */
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import type { Kpi } from '../model/types'
import { fmt } from '../model/data'
import { BUDGET } from '../model/prose'
import { EntityIcon } from './EntityIcon'
import { KpiIdentity } from './KpiIdentity'
import { EChart } from './charts/EChart'
import { snapshotFor, aiLineFor } from './charts/builders'
import { Spark } from './Shell'

/** The template. Every number here is deliberate; nothing is content-driven. */
const T = {
  sm: { pad: 14, head: 46, figure: 28, chart: 84, caption: 38, title: 'text-[13px]', figureText: 'text-[22px]', icon: 20 },
  lg: { pad: 16, head: 50, figure: 34, chart: 96, caption: 40, title: 'text-[13.5px]', figureText: 'text-[26px]', icon: 22 },
} as const

/** Total card height — exported so sibling surfaces (empty states) can match. */
export const CARD_H = {
  sm: T.sm.head + T.sm.figure + T.sm.chart + T.sm.caption + T.sm.pad * 2,
  lg: T.lg.head + T.lg.figure + T.lg.chart + T.lg.caption + T.lg.pad * 2,
} as const

const GOOD = '#3c6a5f'
const BAD = '#8a1538'
const FLAT = '#7e938d'

export interface Polarity {
  dir: 'up' | 'down' | 'flat'
  tone: string
  basis: string
}

/** Movement judged against the indicator's own direction of good. */
export function polarityOf(k: Kpi): Polarity {
  const s = k.movementSeries
  if (s.length >= 2) {
    const [prevY, prev] = s[s.length - 2]
    const last = s[s.length - 1][1]
    const delta = last - prev
    const basis = `vs ${prevY === '2026Q1' ? 'Q1 2026' : prevY}`
    if (Math.abs(delta) < Math.abs(prev || 1) * 0.02) return { dir: 'flat', tone: FLAT, basis }
    const favourable = k.polarity === 'Green' ? delta > 0 : delta < 0
    return { dir: delta > 0 ? 'up' : 'down', tone: favourable ? GOOD : BAD, basis }
  }
  if (k.actuals['2026Q1'].value !== null && (k.targets['2026'].value ?? 0) > 0)
    return { dir: 'flat', tone: FLAT, basis: 'vs 2026 target' }
  if (k.state === 'REPORTS_AT_YEAR_END') return { dir: 'flat', tone: FLAT, basis: 'reports at year end' }
  if (k.state === 'IDLE_THIS_CYCLE') return { dir: 'flat', tone: FLAT, basis: 'idle this cycle' }
  return { dir: 'flat', tone: FLAT, basis: 'first reading' }
}

/** A card earns extra visual weight only when its data does (Fix 3). */
export function isLoud(group: Kpi[]): boolean {
  return group.some(
    (k) =>
      (k.propChange !== null && Math.abs(k.propChange) >= 0.5 && k.movementSeries.length >= 3) ||
      k.overshoot ||
      k.state === 'ABOVE_CEILING',
  )
}

export function KpiCard({
  group,
  title,
  hue,
  size = 'sm',
  onOpen,
  meta,
  className = '',
}: {
  group: Kpi[]
  title?: string
  hue: string
  size?: 'sm' | 'lg'
  onOpen: () => void
  meta?: string
  className?: string
}) {
  const k = group[0]
  const pol = polarityOf(k)
  const loud = isLoud(group)
  const snap = snapshotFor(group, hue)
  const lg = size === 'lg'
  const t = lg ? T.lg : T.sm
  const s = k.movementSeries
  const figure =
    s.length > 0 ? fmt(s[s.length - 1][1]) : (k.actuals['2026Q1'].value !== null ? fmt(k.actuals['2026Q1'].value) : (k.actuals['2026Q1'].raw ?? '—'))
  const Arrow = pol.dir === 'up' ? ArrowUpRight : pol.dir === 'down' ? ArrowDownRight : Minus
  // the caption is written to fit its two lines rather than clipped (R9 fix 2)
  const caption = aiLineFor(group, lg ? BUDGET.captionLg : BUDGET.captionSm)
  const hidden = snap.kind === 'none' ? 0 : snap.hidden
  const snapBasis = snap.kind === 'none' ? undefined : snap.basis

  return (
    <button
      onClick={onOpen}
      className={`kpi-card relative min-w-0 overflow-hidden rounded-card bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) ${className}`}
      style={
        {
          boxShadow: loud ? 'var(--shadow-loud)' : 'var(--shadow-card)',
          padding: t.pad,
          '--kc-h': `${lg ? CARD_H.lg : CARD_H.sm}px`,
          '--kc-head': `${t.head}px`,
          '--kc-figure': `${t.figure}px`,
          '--kc-chart': `${t.chart}px`,
          '--kc-caption': `${t.caption}px`,
        } as React.CSSProperties
      }
      data-kpis={group.map((x) => x.id).join(',')}
      aria-label={`${title ?? k.name} — open detail`}
    >
      {/* a finding earns an accent edge; a quiet card stays quiet */}
      {loud && <span aria-hidden className="absolute inset-y-0 start-0 w-[3px]" style={{ background: pol.tone }} />}

      {/* the entity mark belongs to the card's corner, not to a column of it */}
      <span className="absolute z-10" style={{ top: t.pad, insetInlineEnd: t.pad }}>
        <EntityIcon entity={k.entity} size={t.icon} />
      </span>

      <div className="kc-head flex min-w-0 items-start overflow-hidden" style={{ paddingInlineEnd: t.icon + 8 }}>
        <span className="min-w-0">
          {title && group.length > 1 ? (
            <>
              <span className="block text-[11px] leading-tight text-ink-mute">
                {k.entity} · {group.length} indicators
              </span>
              <span className={`mt-0.5 line-clamp-2 block font-semibold leading-tight text-ink ${t.title}`} title={title}>
                {title}
              </span>
            </>
          ) : (
            <KpiIdentity kpi={k} lines={2} />
          )}
        </span>
      </div>

      {group.length > 1 ? (
        /* a grouped card's figures live on its chart rows — one headline number
           would crown the first indicator and bury the rest. The basis line
           still states what the reader is looking at (R8 fix 3), including
           when the mark reports a year other than this quarter (R9 fix 3). */
        <div className="kc-figure self-center text-[11px] font-medium leading-tight text-ink-mute">
          {snapBasis ?? 'Q1 2026 · against 2026 targets'}
        </div>
      ) : (
        <div className="kc-figure flex items-baseline gap-2 self-center">
          <span className={`num font-bold leading-none text-sidra ${t.figureText}`}>{figure}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: pol.tone }}>
            <Arrow size={13} strokeWidth={2.4} />
            <span className="font-medium text-ink-mute">{pol.basis}</span>
          </span>
        </div>
      )}

      {/* the chart area is a fixed box: what goes in it adapts, it does not */}
      <div className="kc-chart flex min-h-0 flex-col justify-center">
        {snap.kind !== 'none' ? (
          <>
            <div className="min-h-0 flex-1">
              <EChart option={snap.option} height="100%" />
            </div>
            {hidden > 0 && (
              <div className="shrink-0 text-[10.5px] text-ink-mute">
                +{hidden} more in this group — open to see {hidden === 1 ? 'it' : 'them'}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center rounded-input bg-cream/60 px-3 text-[11px] italic leading-snug text-ink-mute">
            {meta ?? 'No comparable Q1 position — the overlay carries what exists.'}
          </div>
        )}
      </div>

      <p className="kc-caption flex items-start gap-1.5 self-end overflow-hidden border-t border-cream pt-2 text-[11.5px] italic leading-snug text-ink-soft">
        <span className="mt-0.5 shrink-0">
          <Spark size={10} />
        </span>
        <span>{caption}</span>
      </p>
    </button>
  )
}
