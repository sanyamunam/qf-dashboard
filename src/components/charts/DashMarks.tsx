/**
 * The Executive Dashboard's card marks.
 *
 * A KPI that cannot be scored against a target is still a trajectory — so no
 * card renders a placeholder where a chart could go. Which mark appears is
 * decided once in `markKindFor` (model/dash.ts), never here:
 *
 *   judged        → the platform's SnapshotMark (value against target)
 *   trend         → TrajectoryMark, the same area chart the theme cards use
 *   twoReadings   → two labelled bars, deliberately NOT joined by a line
 *   firstReading  → a single reading on a baseline rule
 *
 * Only completed annual years are plotted. The partial quarter is the card's
 * headline figure and never a point on an annual axis.
 */
import { TrajectoryMark } from '../marks'
import { SnapshotMark } from './SnapshotMark'
import {
  completedYears,
  partialReading,
  markKindFor,
  cardKpi,
  unitOf,
  type ObsKpi,
  type Period,
} from '../../model/dash'

const NEUTRAL = '#c8c9c7'
const AXIS = '#9aaba5'
const MUTE = '#7e938d'

/** Compact enough to label a point without crowding it: 2.03M, 486K, 72%. */
export const compactVal = (unit: string) => (n: number) => {
  const a = Math.abs(n)
  const body =
    a >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : a >= 10_000 ? `${Math.round(n / 1000)}K` : new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)
  return `${body}${unit}`
}

const yearLabel = (y: string) => (y === '2026Q1' ? 'Q1 26' : y)

/* ─────────────────── two readings — a pair, not a trajectory ───────────────────
 * Active QPHI reads 250 across all of 2025 and 28 for Q1 2026. Those two
 * numbers must not share a value axis: at the same scale the quarter looks
 * like an 89% collapse, when it is simply three months beside twelve. So they
 * are set side by side as separate readings, each carrying its own period and
 * its own length of time — no common baseline, no bar heights to compare, and
 * certainly no line joining them. */
export function TwoReadingsMark({
  items,
  hue,
  fmtVal,
  H = 104,
}: {
  items: { label: string; value: number; partial?: boolean }[]
  hue: string
  fmtVal: (n: number) => string
  H?: number
}) {
  return (
    <div className="flex w-full items-stretch gap-2.5" style={{ minHeight: H }} aria-hidden>
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-1 flex-col justify-center rounded-input px-3 py-2.5"
          style={
            it.partial
              ? { border: `1.4px dashed ${NEUTRAL}`, background: 'transparent' }
              : { border: '1.4px solid transparent', background: `${hue}12` }
          }
        >
          <span className="text-[9.5px] uppercase tracking-[0.08em]" style={{ color: AXIS }}>
            {it.label}
          </span>
          <span
            className="num mt-1 text-[24px] font-bold leading-none"
            style={{ color: it.partial ? MUTE : hue }}
          >
            {fmtVal(it.value)}
          </span>
          <span className="mt-1.5 text-[10px]" style={{ color: MUTE }}>
            {it.partial ? 'three months' : 'twelve months'}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────── one reading — a baseline, with nothing to compare ─────────────── */
export function FirstReadingMark({
  label,
  value,
  hue,
  fmtVal,
  H = 104,
}: {
  label: string
  value: number
  hue: string
  fmtVal: (n: number) => string
  H?: number
}) {
  return (
    <div className="relative flex w-full flex-col justify-end" style={{ height: H }} aria-hidden>
      <div className="flex items-end gap-2.5">
        <span className="num text-[26px] font-bold leading-none" style={{ color: hue }}>
          {fmtVal(value)}
        </span>
        <span className="pb-0.5 text-[10.5px]" style={{ color: MUTE }}>
          {label}
        </span>
      </div>
      {/* the baseline it starts from — the rest of the line is yet to happen */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: hue }} />
        <span className="h-px flex-1" style={{ background: `repeating-linear-gradient(to right, ${NEUTRAL} 0 4px, transparent 4px 8px)` }} />
      </div>
      <span className="mt-1.5 text-[9.5px]" style={{ color: AXIS }}>
        no prior period on record
      </span>
    </div>
  )
}

/**
 * The dispatcher. Every dashboard card gets a real mark; `emptyNote` is never
 * reached, because a KPI with history always has a trajectory to show.
 */
export function DashMark({ k, p, hue }: { k: ObsKpi; p: Period; hue: string }) {
  const kind = markKindFor(k, p)
  const unit = unitOf(k)
  const fmtVal = compactVal(unit)

  if (kind === 'judged') return <SnapshotMark group={[cardKpi(k, p)]} hue={hue} scale="card" />

  if (kind === 'trend') {
    const series = completedYears(k).map(([y, v]) => [yearLabel(y), v] as [string, number])
    return <TrajectoryMark series={series} hue={hue} fmtVal={fmtVal} H={104} gradient labelFirst />
  }

  if (kind === 'twoReadings') {
    const years = completedYears(k)
    const partial = partialReading(k)
    const items = [
      ...years.map(([y, v]) => ({ label: y, value: v })),
      ...(partial !== null ? [{ label: 'Q1 2026', value: partial, partial: true }] : []),
    ]
    return <TwoReadingsMark items={items} hue={hue} fmtVal={fmtVal} />
  }

  if (kind === 'firstReading') {
    const years = completedYears(k)
    const partial = partialReading(k)
    const one = years.length ? { label: years[0][0], value: years[0][1] } : { label: 'Q1 2026 · partial quarter', value: partial as number }
    return <FirstReadingMark label={one.label} value={one.value} hue={hue} fmtVal={fmtVal} />
  }

  return <SnapshotMark group={[cardKpi(k, p)]} hue={hue} scale="card" emptyNote="No readings on record for this indicator." />
}
