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
  isPercentRow,
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

/* ─────────────── annual counts — bars, anchored at zero ───────────────
 * The chart type follows the KIND OF NUMBER, so the rule holds everywhere:
 * a COUNT accumulated over a period takes bars. Four graduate totals are four
 * discrete figures — a line between them would claim a value existed in
 * between, and that the series flows, and neither is true of a yearly count.
 *
 * Bars anchor at zero, which is the whole reason to use them: Footfall's
 * 2.03M reads as two-thirds of its 3.05M rather than as a gentle slope.
 *
 * Grammar borrowed wholesale from PortfolioBrief's DeltaColumns — rounded
 * caps, earlier periods at 0.38, the most recent at full strength — and the
 * label geometry is TrajectoryMark's, so a bar card and a line card differ in
 * nothing but the mark. */
export function BarTrendMark({
  series,
  hue,
  fmtVal,
  H = 104,
  peakHue = '#7e938d',
  axisHue = '#9aaba5',
}: {
  series: [string, number][]
  hue: string
  fmtVal: (n: number) => string
  H?: number
  peakHue?: string
  axisHue?: string
}) {
  /* the same reserves TrajectoryMark uses, so both marks sit on one baseline */
  const padT = 22
  const padB = 16
  const area = H - padT - padB
  const vals = series.map(([, v]) => v)
  const max = Math.max(...vals, 1)
  const lastIdx = vals.length - 1
  const centre = (i: number) => `${((i + 0.5) / vals.length) * 100}%`
  const barTop = (v: number) => padT + (1 - v / max) * area

  return (
    <div className="relative w-full" style={{ height: H }} aria-hidden>
      <div className="absolute inset-x-0 flex items-end gap-[6px]" style={{ top: padT, height: area }}>
        {vals.map((v, i) => (
          <div
            key={series[i][0]}
            className="flex-1"
            style={{
              height: `${Math.max(2, (v / max) * 100)}%`,
              background: hue,
              opacity: i === lastIdx ? 1 : 0.38,
              borderRadius: '3px 3px 0 0',
            }}
          />
        ))}
      </div>
      {/* both endpoints direct-labelled — no axis needed at card size */}
      {[0, lastIdx].map((i) =>
        i === 0 && lastIdx === 0 ? null : (
          <span
            key={`v${i}`}
            className={`num absolute whitespace-nowrap ${i === lastIdx ? 'text-[12px] font-bold' : 'text-[10.5px]'}`}
            style={{
              left: centre(i),
              top: barTop(vals[i]) - 4,
              color: i === lastIdx ? hue : peakHue,
              transform: 'translate(-50%,-100%)',
            }}
          >
            {fmtVal(vals[i])}
          </span>
        ),
      )}
      {[0, lastIdx].map((i) => (
        <span
          key={`y${i}`}
          className="absolute whitespace-nowrap text-[9.5px]"
          style={{ left: centre(i), bottom: 0, color: axisHue, transform: 'translateX(-50%)' }}
        >
          {series[i][0]}
        </span>
      ))}
    </div>
  )
}

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
    /* the ONE rule a reader has to learn: a rate is a level that persists and
       takes a line; a count accrues over a period and takes bars */
    return isPercentRow(k) ? (
      <TrajectoryMark series={series} hue={hue} fmtVal={fmtVal} H={104} gradient labelFirst zeroSuppress />
    ) : (
      <BarTrendMark series={series} hue={hue} fmtVal={fmtVal} H={104} />
    )
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
