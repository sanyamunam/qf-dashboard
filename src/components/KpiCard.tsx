/**
 * THE card (R8 fixes 3/6/9): one component for spotlight and explore grid,
 * differing only in size. Every card carries the entity icon, a polarity
 * arrow whose colour reflects the judgement (favourable given the indicator's
 * direction — a falling number can be good news), the comparison basis in
 * words, and a snapshot chart only — trends live in the overlay.
 */
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import type { Kpi } from '../model/types'
import { fmt } from '../model/data'
import { EntityIcon } from './EntityIcon'
import { KpiIdentity } from './KpiIdentity'
import { EChart } from './charts/EChart'
import { snapshotFor, aiLineFor, STATUS_COLOR, type GroupStyle, type SnapshotRow } from './charts/builders'
import { Spark } from './Shell'

const nfLedger = (n: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)

/**
 * Treatment B — the status ledger (R10 fix 5). HTML, not canvas: full labels
 * that never truncate, numbers with real weight, a dashed target the eye can
 * find. Rows share one axis so members stay comparable.
 */
function LedgerRows({ rows, max, hue }: { rows: SnapshotRow[]; max: number; hue: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const fill = r.status === 'met' || r.status === 'behind' || r.status === 'breach' ? STATUS_COLOR[r.status].fill : hue
        const text = r.status === 'met' || r.status === 'behind' || r.status === 'breach' ? STATUS_COLOR[r.status].text : '#122822'
        const w = Math.max(2, (r.value / max) * 100)
        const tx = (r.target / max) * 100
        return (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[11.5px] leading-tight text-ink-soft">{r.label}</span>
              <span className="num shrink-0 text-[15px] font-bold leading-none" style={{ color: text }}>
                {nfLedger(r.value)}
                {r.status === 'met' && <span className="ml-0.5 text-[11px]">✓</span>}
                <span className="ml-1 text-[10.5px] font-normal text-ink-mute">of {nfLedger(r.target)}</span>
              </span>
            </div>
            <div className="relative mt-1 h-[12px] overflow-visible rounded-full" style={{ background: 'rgba(200,201,199,0.3)' }}>
              <div
                className="ledger-fill h-full rounded-full"
                style={{
                  width: `${w}%`,
                  background: fill,
                  boxShadow: r.status === 'met' ? '0 0 7px rgba(120,190,32,0.45)' : undefined,
                }}
              />
              {/* the target marker: dashed, darker than the bar, unmissable */}
              <span
                aria-hidden
                className="absolute -top-[3px] h-[18px] w-0 border-l-2 border-dashed"
                style={{ left: `${Math.min(99, tx)}%`, borderColor: '#47605a' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
  groupStyle = 'arcs',
}: {
  group: Kpi[]
  title?: string
  hue: string
  size?: 'sm' | 'lg'
  onOpen: () => void
  meta?: string
  className?: string
  /** R10 review toggle: which treatment grouped cards render */
  groupStyle?: GroupStyle
}) {
  const k = group[0]
  const pol = polarityOf(k)
  const loud = isLoud(group)
  const snap = snapshotFor(group, hue, groupStyle, title)
  const lg = size === 'lg'
  const s = k.movementSeries
  const figure =
    s.length > 0 ? fmt(s[s.length - 1][1]) : (k.actuals['2026Q1'].value !== null ? fmt(k.actuals['2026Q1'].value) : (k.actuals['2026Q1'].raw ?? '—'))
  const Arrow = pol.dir === 'up' ? ArrowUpRight : pol.dir === 'down' ? ArrowDownRight : Minus

  return (
    <button
      onClick={onOpen}
      /* flex-col, not the default: a stretched <button> centres its content
         vertically, which left a short card's text floating mid-height beside
         a taller sibling. Content starts at the top of every card. */
      className={`relative flex min-w-0 flex-col items-stretch justify-start overflow-hidden rounded-card bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) ${lg ? 'p-4' : 'p-3.5'} ${className}`}
      style={{
        boxShadow: loud ? 'var(--shadow-loud)' : 'var(--shadow-card)',
      }}
      data-kpis={group.map((x) => x.id).join(',')}
      aria-label={`${title ?? k.name} — open detail`}
    >
      {/* a finding earns an accent edge; a quiet card stays quiet */}
      {loud && <span aria-hidden className="absolute inset-y-0 start-0 w-[3px]" style={{ background: pol.tone }} />}

      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          {title && group.length > 1 ? (
            <>
              <span className="block text-[11px] leading-tight text-ink-mute">{k.entity} · {group.length} indicators</span>
              <span className={`mt-0.5 block font-semibold leading-tight text-ink ${lg ? 'text-[13.5px]' : 'text-[13px]'}`}>{title}</span>
            </>
          ) : (
            <KpiIdentity kpi={k} />
          )}
        </span>
        <EntityIcon entity={k.entity} size={lg ? 22 : 20} />
      </div>

      {group.length > 1 ? (
        /* a grouped card's figures live on its chart rows — one headline number
           would crown the first indicator and bury the rest. The basis line
           still states what the reader is looking at (Fix 3). */
        <div className="mt-2 text-[11px] font-medium text-ink-mute">Q1 2026 · against 2026 targets</div>
      ) : (
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`num font-bold leading-none text-sidra ${lg ? 'text-[26px]' : 'text-[22px]'}`}>{figure}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: pol.tone }}>
            <Arrow size={13} strokeWidth={2.4} />
            <span className="font-medium text-ink-mute">{pol.basis}</span>
          </span>
        </div>
      )}

      {snap.kind === 'group-ledger' ? (
        <div className="mt-2.5">
          <LedgerRows rows={snap.rows} max={snap.max} hue={hue} />
        </div>
      ) : snap.kind === 'group-arcs' ? (
        <div className="mt-1.5">
          <div onClick={(e) => e.stopPropagation()}>
            <div onClick={onOpen}>
              <EChart option={snap.option} height={snap.height} />
            </div>
          </div>
          {/* labels live in HTML so they wrap instead of truncating (fix 1) */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${snap.rows.length}, minmax(0, 1fr))` }}>
            {snap.rows.map((r) => (
              <span key={r.label} className="text-center text-[10.5px] leading-tight text-ink-soft">
                {r.label}
              </span>
            ))}
          </div>
        </div>
      ) : snap.kind !== 'none' ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <div onClick={onOpen}>
            <EChart option={snap.option} height={snap.height} />
          </div>
        </div>
      ) : meta ? (
        <div className="mt-2 rounded-input bg-cream/60 px-2.5 py-1.5 text-[11px] italic text-ink-mute">{meta}</div>
      ) : null}

      <p className={`mt-2 flex items-start gap-1.5 border-t border-cream pt-2 text-[11.5px] italic leading-snug text-ink-soft`}>
        <span className="mt-0.5 shrink-0">
          <Spark size={10} />
        </span>
        <span className={lg ? 'line-clamp-2' : 'line-clamp-1'}>{aiLineFor(group)}</span>
      </p>
    </button>
  )
}
