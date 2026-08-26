/**
 * THE card (R8 fixes 3/6/9): one component for spotlight and explore grid,
 * differing only in size. Every card carries the entity icon, a polarity
 * arrow whose colour reflects the judgement (favourable given the indicator's
 * direction — a falling number can be good news), the comparison basis in
 * words, and a snapshot chart only — trends live in the overlay.
 *
 * R10: chart colour/shape carries the verdict (statusOf in builders.ts) so it
 * never disagrees with the arrow. Grouped cards render the status-ledger
 * treatment — the client's pick after comparing it live against a
 * small-multiple-arc alternative (docs/r10-notes.md).
 */
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import type { Kpi } from '../model/types'
import { fmt } from '../model/data'
import { EntityIcon } from './EntityIcon'
import { KpiIdentity } from './KpiIdentity'
import { aiLineFor } from './charts/builders'
import { SnapshotMark } from './charts/SnapshotMark'
import { Spark } from './Shell'

const GOOD = '#3c6a5f'
const BAD = '#8a1538'
const FLAT = '#7e938d'

export interface Polarity {
  dir: 'up' | 'down' | 'flat'
  tone: string
  basis: string
}

/**
 * The readings a card judges on: the movement series, PLUS this quarter's
 * reading when it is real and the series omits it.
 *
 * The parser strips trailing Q1 zeros from `movementSeries` so that a zero can
 * never be ranked as a decline. Reading the card's headline figure straight off
 * that series therefore printed a closed year's number as though it were now —
 * "12" on a card whose actual Q1 reading is 0. Only a year-end reporter or an
 * off-cycle indicator has no real current reading.
 */
export function judgedSeries(k: Kpi): [string, number][] {
  const s = k.movementSeries
  const v = k.actuals['2026Q1'].value
  const currentIsReal = v !== null && k.state !== 'REPORTS_AT_YEAR_END' && k.state !== 'IDLE_THIS_CYCLE'
  return currentIsReal && s[s.length - 1]?.[0] !== '2026Q1' ? [...s, ['2026Q1', v] as [string, number]] : s
}

/** Movement judged against the indicator's own direction of good. */
export function polarityOf(k: Kpi): Polarity {
  const s = judgedSeries(k)
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
  status,
  line,
  mark,
  figure: figureOverride,
  delta,
  className = '',
}: {
  group: Kpi[]
  title?: string
  hue: string
  size?: 'sm' | 'lg'
  onOpen: () => void
  meta?: string
  /** a status chip row, for mixed listings where placement alone does not
   *  state the verdict (the Executive Dashboard's four states) */
  status?: React.ReactNode
  /** the card's own sentence, where the caller knows better than aiLineFor */
  line?: string
  /** a caller-supplied mark, replacing the shared SnapshotMark entirely —
   *  used where the caller knows what the data can honestly support */
  mark?: React.ReactNode
  /** the headline figure, where the caller's period model owns it */
  figure?: string
  /** the movement read, where a naive series comparison would be dishonest
   *  (a partial quarter against a completed year) */
  delta?: Polarity
  className?: string
}) {
  const k = group[0]
  const pol = delta ?? polarityOf(k)
  const loud = isLoud(group)
  const lg = size === 'lg'
  const s = judgedSeries(k)
  const last = s[s.length - 1]
  /* the headline is this quarter's reading whenever one exists — and when it
     genuinely doesn't, the year rides with the number so a closed year's
     figure can never be mistaken for a current one */
  const figure =
    figureOverride !== undefined
      ? figureOverride
      : s.length > 0
      ? `${fmt(last[1])}${k.unit ?? ''}${last[0] === '2026Q1' ? '' : ` (${last[0]})`}`
      : k.actuals['2026Q1'].value !== null
        ? `${fmt(k.actuals['2026Q1'].value)}${k.unit ?? ''}`
        : (k.actuals['2026Q1'].raw ?? '—')
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

      {status && <div className="mb-1.5 flex items-center gap-2">{status}</div>}

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

      <div className="mt-2.5">
        {mark ?? <SnapshotMark group={group} hue={hue} title={title} scale="card" emptyNote={meta} />}
      </div>

      <p className={`mt-2 flex items-start gap-1.5 border-t border-cream pt-2 text-[11.5px] italic leading-snug text-ink-soft`}>
        <span className="mt-0.5 shrink-0">
          <Spark size={10} />
        </span>
        <span className={lg ? 'line-clamp-2' : 'line-clamp-1'}>{line ?? aiLineFor(group)}</span>
      </p>
    </button>
  )
}
