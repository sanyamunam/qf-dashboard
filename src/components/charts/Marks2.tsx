/**
 * The chart set. Every mark the platform draws lives here, and every one of
 * them is chosen by `selectL1` / `selectL2` — never by the calling component.
 *
 * Geometry follows Al-Mishkat-chart-types-reference.html: a 56px-radius
 * semicircle centred at (88,82) for both gauges, a 14px stroke, the target
 * tick ON the arc, and the shortfall shaded in the space between fill and
 * tick. Zones are flat, never a gradient sweep — they begin exactly where the
 * tolerance in the sheet ends, and a smooth ramp would imply graded severity
 * no column supports.
 */
import { fmt, themeByName } from '../../model/data'
import { TrendChart } from './TrendChart'
import {
  trendHues,
  TREND_NEUTRAL,
  TREND_TARGET,
  TREND_RULE,
  TREND_AXIS_INK,
  TREND_DARK,
  TREND_TARGET_DARK,
  TREND_RULE_DARK,
  TREND_AXIS_INK_DARK,
  type TrendHues,
} from './trendPalette'

/** Every colour a trend uses, so a dark surface swaps one object rather than
 *  threading four props through five components. */
interface TrendSkin {
  hues: TrendHues
  target: string
  rule: string
  axis: string
}
const skinFor = (hues: TrendHues, dark?: boolean): TrendSkin =>
  dark
    ? { hues: TREND_DARK, target: TREND_TARGET_DARK, rule: TREND_RULE_DARK, axis: TREND_AXIS_INK_DARK }
    : { hues, target: TREND_TARGET, rule: TREND_RULE, axis: TREND_AXIS_INK }
import { selectL1, selectL2, type L1Mark, type L2Mark, type TrendPoint, type Period } from '../../model/chartSelect'
import type { ObsKpi } from '../../model/obs'

/* the reference's own chart palette */
const TRACK = '#e8e8e6'
const BRAND = '#034638'
const GREEN = '#2e7d32'
const AMBER = '#f9a825'
const AMBER_GAP = '#f2c94c'
const AMBER_INK = '#b8860b'
const RED = '#c0392b'
const GREY = '#989a9c'
const BORDER = '#dedfdd'
const ZONE_UNDER = '#f5e2b8'
const ZONE_OVER = '#f2cfc9'
const ZONE_WITHIN = '#b9dcc2'
const BAR_MUTED = '#cfe0da'

const val = (n: number, unit: string) => `${fmt(n)}${unit}`
const compact = (n: number) => {
  const a = Math.abs(n)
  return a >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : a >= 10_000 ? `${Math.round(n / 1000)}k` : fmt(n)
}

/* ───────────────────────────── gauge geometry ───────────────────────────── */

const CX = 88
const CY = 82
const R = 56
/** t runs 0→1 left to right across the semicircle */
const pt = (t: number) => {
  const ang = Math.PI * (1 - Math.min(1, Math.max(0, t)))
  return { x: CX + R * Math.cos(ang), y: CY - R * Math.sin(ang) }
}
const arc = (t0: number, t1: number) => {
  const a = pt(t0)
  const b = pt(t1)
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

/* ───────────────── B1 · count vs target — the bullet bar ───────────────── */

export function BulletMark({ m }: { m: Extract<L1Mark, { kind: 'bullet' }> }) {
  const W = 300
  const ceiling = Math.max(m.value, m.target) * (m.value > m.target ? 1.0 : 1.0)
  const fillW = Math.max(6, (m.value / (ceiling || 1)) * W)
  const tickX = Math.min(W, (m.target / (ceiling || 1)) * W)
  const inside = m.value > m.target
  return (
    <svg viewBox={`0 0 ${W} 42`} height="42" width="100%" style={{ overflow: 'visible' }} aria-hidden>
      <rect x="0" y="12" width={W} height="14" rx="7" fill={TRACK} />
      <rect x="0" y="12" width={fillW} height="14" rx="7" fill={m.met ? GREEN : AMBER} />
      {/* the target marker — when the value overshoots it sits INSIDE the fill,
          which is the thing an arc cannot do */}
      <line x1={tickX} y1="6" x2={tickX} y2="32" stroke={inside ? '#0e4a2a' : BRAND} strokeWidth="2.5" />
      <text x={Math.max(28, tickX - 8)} y="40" textAnchor="end" fontSize="10" fill={GREY}>
        target {val(m.target, m.unit)}
      </text>
      <text
        x={inside ? fillW - 8 : fillW + 6}
        y="23"
        textAnchor={inside ? 'end' : 'start'}
        fontSize="11"
        fontWeight="700"
        fill={inside ? '#fff' : m.met ? GREEN : AMBER}
      >
        {val(m.value, m.unit)}
      </text>
    </svg>
  )
}

/* ──────────── B2 · percentage vs target — arc with the tick on it ────────── */

export function GaugeMark({ m }: { m: Extract<L1Mark, { kind: 'gauge' }> }) {
  const tv = Math.min(1, Math.max(0, m.value / 100))
  const tt = Math.min(1, Math.max(0, m.target / 100))
  const short = tv < tt
  const tick = pt(tt)
  const tickIn = { x: CX + (R - 12) * Math.cos(Math.PI * (1 - tt)), y: CY - (R - 12) * Math.sin(Math.PI * (1 - tt)) }
  const tickOut = { x: CX + (R + 12) * Math.cos(Math.PI * (1 - tt)), y: CY - (R + 12) * Math.sin(Math.PI * (1 - tt)) }
  return (
    <svg viewBox="0 0 176 106" width="100%" height="118" style={{ overflow: 'visible' }} aria-hidden>
      <path d={arc(0, 1)} fill="none" stroke={TRACK} strokeWidth="14" strokeLinecap="round" />
      {/* the shortfall, drawn rather than implied: amber sits in the space
          between where the fill stops and where the target is */}
      {short && <path d={arc(tv, tt)} fill="none" stroke={AMBER_GAP} strokeWidth="14" />}
      <path d={arc(0, tv)} fill="none" stroke={GREEN} strokeWidth="14" strokeLinecap="round" />
      <line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y} stroke={BRAND} strokeWidth="3" />
      <text x={CX} y="74" textAnchor="middle" fontSize="26" fontWeight="700" fill={short ? AMBER_INK : BRAND}>
        {val(m.value, m.unit)}
      </text>
      <text x="28" y="98" fontSize="10" fill={GREY}>0%</text>
      <text x="148" y="98" textAnchor="end" fontSize="10" fill={GREY}>100%</text>
      <text
        x={Math.min(150, Math.max(6, tick.x + (tt > 0.5 ? 8 : -8)))}
        y={Math.max(12, tick.y - 12)}
        textAnchor={tt > 0.5 ? 'start' : 'end'}
        fontSize="10"
        fontWeight="700"
        fill={BRAND}
      >
        target {val(m.target, m.unit)}
      </text>
    </svg>
  )
}

/* ───────────── C · variance — zero at the top, flat zones either side ──────── */

export function CentredGaugeMark({ m }: { m: Extract<L1Mark, { kind: 'centredGauge' }> }) {
  const toT = (v: number) => 0.5 + v / (2 * m.span)
  const bandLo = toT(-m.tolerance)
  const bandHi = toT(m.tolerance)
  const nv = Math.min(1, Math.max(0, toT(m.value)))
  const n = pt(nv)
  const over = m.value > m.tolerance
  const under = m.value < -m.tolerance
  const tone = over ? RED : under ? AMBER_INK : GREEN
  return (
    <svg viewBox="0 0 176 112" width="100%" height="124" style={{ overflow: 'visible' }} aria-hidden>
      <path d={arc(0, 1)} fill="none" stroke={TRACK} strokeWidth="14" strokeLinecap="round" />
      {/* flat zones. They begin exactly where the sheet's tolerance ends — a
          smooth red-amber-green sweep would invent boundaries nobody set */}
      {bandLo > 0.01 && <path d={arc(0, bandLo)} fill="none" stroke={ZONE_UNDER} strokeWidth="14" strokeLinecap="round" />}
      {bandHi < 0.99 && <path d={arc(bandHi, 1)} fill="none" stroke={ZONE_OVER} strokeWidth="14" strokeLinecap="round" />}
      {m.tolerance > 0 && <path d={arc(bandLo, bandHi)} fill="none" stroke={ZONE_WITHIN} strokeWidth="14" />}
      {/* zero sits at the top, because variance runs both ways */}
      <line x1={CX} y1={CY - R + 20} x2={CX} y2={CY - R - 10} stroke={BRAND} strokeWidth="2.5" />
      <line x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={tone} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r="5" fill={tone} />
      <text x={CX} y="104" textAnchor="middle" fontSize="21" fontWeight="700" fill={tone}>
        {m.value > 0 ? '+' : ''}
        {val(m.value, m.unit)}
      </text>
      <text x="26" y="96" fontSize="10" fill={GREY}>−{m.span}%</text>
      <text x="150" y="96" textAnchor="end" fontSize="10" fill={GREY}>+{m.span}%</text>
      <text x={CX} y="10" textAnchor="middle" fontSize="10" fontWeight="700" fill={BRAND}>{m.zeroLabel}</text>
      <text x="40" y="48" fontSize="10" fontWeight="600" fill={AMBER_INK}>under</text>
      <text x="122" y="48" fontSize="10" fontWeight="600" fill="#b5493c">over</text>
    </svg>
  )
}

/* ─────────────────────── D / A / idle — the no-chart states ───────────────── */

/**
 * `compact` is for a card that ALREADY prints the headline figure and its
 * basis above the mark. Repeating them made a no-target card say `545` twice
 * and an unreported one say "no reading this period" twice. Compact keeps only
 * what the card has not already said — and where that is nothing, draws
 * nothing, which is the honest outcome for a state with no chart in it.
 */
export function BareFigureMark({ m, note, compact }: { m: Extract<L1Mark, { kind: 'bareFigure' }>; note?: string; compact?: boolean }) {
  if (compact) return null
  return (
    <div>
      <div className="text-[30px] font-bold leading-none" style={{ color: '#1e2422' }}>
        {val(m.value, m.unit)}
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: '#75787b' }}>
        {note ?? 'no target ever set'}
      </p>
    </div>
  )
}

export function NotReportedMark({
  m,
  cadence,
  compact,
  dark,
}: {
  m: Extract<L1Mark, { kind: 'notReported' }>
  cadence?: string
  compact?: boolean
  dark?: boolean
}) {
  /* the last real reading IS new information — the card's headline is a dash */
  if (compact)
    return m.lastValue === null ? null : (
      <p className="text-[12px]" style={{ color: dark ? 'rgba(255,255,255,0.62)' : '#75787b' }}>
        Last reported <span className="num font-semibold">{val(m.lastValue, m.unit)}</span> · FY {m.lastYear}
      </p>
    )
  return (
    <div>
      {/* never an em-dash in a numeric slot — that reads as a value */}
      <div className="text-[22px] font-semibold" style={{ color: GREY }}>
        Not reported
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: '#75787b' }}>
        {cadence ?? 'no reading this period'}
        {m.lastValue !== null && ` · last ${val(m.lastValue, m.unit)} · FY ${m.lastYear}`}
      </p>
    </div>
  )
}

export function IdleMark({ compact }: { compact?: boolean }) {
  if (compact) return null
  return (
    <div>
      <div className="text-[22px] font-semibold" style={{ color: GREY }}>
        Idle this cycle
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: '#75787b' }}>
        target of zero — nothing expected this period
      </p>
    </div>
  )
}

/* ───────────────────────────── L2 · trend marks ──────────────────────────── */

const TREND_W = 320
/**
 * ONE row of labels, and it holds the actual.
 *
 * Two rows stacked a target over an actual with nothing saying which was
 * which — `500` sitting above `23k` read as nonsense until you worked out that
 * 500 was that year's target. The target is a MARK now, a tick across the bar
 * at its height, exactly as the L1 bullet does it; its value is named once, in
 * the key, for the most recent period that has one. Seven target labels across
 * a card-width chart is what created the second row in the first place.
 *
 * The band is still a fixed height, so no label can reach a mark or another
 * label and every card in a row keeps one baseline grid.
 */
const TREND_H = 156
const ACTUAL_Y = 13
const PLOT_TOP = 26
const BASE_Y = 128
const YEAR_Y = 143
/** a value of any size still has to render as a BAR, not a hairline */
const MIN_BAR = 6
/** breathing room either side of the reported/committed divider */
const DIVIDER_GAP = 12

function trendScale(points: TrendPoint[]) {
  const vals = points.flatMap((p) => [p.actual, p.target]).filter((v): v is number => v !== null)
  const max = Math.max(...vals, 1)
  const min = Math.min(0, ...vals)
  const y = (v: number) => BASE_Y - ((v - min) / (max - min || 1)) * (BASE_Y - PLOT_TOP)

  /**
   * Reported years get the width; the committed path takes what is left.
   *
   * An even split gave three future outlines the same room as four years of
   * actuals and left a visible void on the right of the card. The reported
   * series is the story, so it takes the larger share and the divider gets a
   * real gap rather than sitting in the middle of one.
   */
  const firstFuture = points.findIndex((p) => p.future)
  const nPast = firstFuture < 0 ? points.length : firstFuture
  const nFuture = points.length - nPast
  const pastW = nFuture === 0 ? TREND_W : (TREND_W - DIVIDER_GAP) * 0.68
  const futureW = TREND_W - DIVIDER_GAP - pastW
  const pastStep = pastW / Math.max(1, nPast)
  const futureStep = nFuture ? futureW / nFuture : 0
  const x = (i: number) =>
    i < nPast ? pastStep * i + pastStep / 2 : pastW + DIVIDER_GAP + futureStep * (i - nPast) + futureStep / 2
  const step = (i: number) => (i < nPast ? pastStep : futureStep)
  const dividerX = pastW + DIVIDER_GAP / 2
  return { x, y, step, dividerX, nPast, nFuture }
}

/** Every reading labelled once, on one line. The latest carries the weight. */
function TrendLabels({
  points,
  x,
  unit,
  latest,
  skin,
}: {
  points: TrendPoint[]
  x: (i: number) => number
  unit: string
  /** index of the most recent reported actual */
  latest: number
  skin: TrendSkin
}) {
  return (
    <>
      {points.map((p, i) =>
        p.actual !== null ? (
          <text
            key={`a${p.year}`}
            x={x(i)}
            y={ACTUAL_Y}
            textAnchor="middle"
            fontSize={i === latest ? 11.5 : 9.5}
            fontWeight={i === latest ? 700 : 500}
            fill={i === latest ? skin.hues.now : skin.axis}
          >
            {compact(p.actual)}
            {unit}
          </text>
        ) : null,
      )}
    </>
  )
}

/**
 * Two words inline, and the current commitment named once — the only target
 * figure on the chart, so it cannot collide with anything.
 */
function TrendKey({ shape, skin, target, unit }: { shape: 'bar' | 'line'; skin: TrendSkin; target: number | null; unit: string }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px]" style={{ color: skin.axis }}>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="8" aria-hidden>
          {shape === 'bar' ? (
            <rect x="4" y="0" width="6" height="8" rx="1.5" fill={skin.hues.now} />
          ) : (
            <line x1="0" y1="4" x2="14" y2="4" stroke={skin.hues.now} strokeWidth="2.5" />
          )}
        </svg>
        actual
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="8" aria-hidden>
          <line x1="0" y1="4" x2="14" y2="4" stroke={skin.target} strokeWidth="2" strokeDasharray={shape === 'bar' ? undefined : '4 2.5'} />
          {shape === 'line' && <circle cx="7" cy="4" r="2.6" fill="none" stroke={skin.target} strokeWidth="1.5" />}
        </svg>
        {target === null ? 'target' : `target ${compact(target)}${unit}`}
      </span>
    </div>
  )
}

/** Every year on the axis. Two labels and five unlabelled bars left a reader
 *  unable to say which bar was which year. */
function AxisYears({
  points,
  x,
  skin,
  latest,
}: {
  points: TrendPoint[]
  x: (i: number) => number
  skin: TrendSkin
  latest: number
}) {
  return (
    <>
      {points.map((p, i) => (
        <text
          key={`y${p.year}`}
          x={x(i)}
          y={YEAR_Y}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight={i === latest ? 700 : 400}
          fill={skin.axis}
          opacity={p.future ? 0.75 : 1}
        >
          {p.year}
        </text>
      ))}
    </>
  )
}

/** Every year and its readings, for the tooltip the labels no longer carry. */
const trendTitle = (points: TrendPoint[], unit: string) =>
  points
    .map(
      (p) =>
        `${p.year}: ${p.actual !== null ? `${fmt(p.actual)}${unit}` : p.future ? 'not yet due' : 'not reported'}${
          p.target !== null ? ` (target ${fmt(p.target)}${unit})` : ''
        }`,
    )
    .join(' · ')

/** The commitment a chart's key should name: the newest one it carries. */
const currentTarget = (points: TrendPoint[]): number | null =>
  [...points].reverse().find((p) => p.target !== null)?.target ?? null

/**
 * X · counts — the bar is the actual, and where a target exists a tick sits
 * across the bar at the target's height.
 *
 * NEVER a stacked bar. Stacking means parts of a whole, and actual + target
 * sum to nothing: 1,027 delivered against a 1,100 commitment is not 2,127 of
 * anything. The tick is the L1 bullet bar's target marker rotated vertical, so
 * there is no new grammar to learn — bar below the tick is short, bar past it
 * has passed. A year with no target simply has no tick.
 */
/**
 * X · counts — a clustered pair per year: the actual solid, the target beside
 * it as a dashed outline. Drawn by ECharts (charts/TrendChart.tsx) rather than
 * by hand; the SELECTOR still decides that this KPI gets bars, and the
 * reference's rules still hold — target never back-filled, status colour never
 * in a series, Q1 never on this axis.
 */
export function BarTrend({ m, hues = TREND_NEUTRAL, dark, narrow }: { m: Extract<L2Mark, { kind: 'bars' }>; hues?: TrendHues; dark?: boolean; narrow?: boolean }) {
  return <TrendChart points={m.points} unit={m.unit} hues={hues} kind="bars" dark={dark} narrow={narrow} />
}

/** X · percentages — a level that persists, so two lines: the actual solid,
 *  the commitment dashed with hollow points, breaking where none was set. */
export function LineTrend({ m, hues = TREND_NEUTRAL, dark, narrow }: { m: Extract<L2Mark, { kind: 'line' }>; hues?: TrendHues; dark?: boolean; narrow?: boolean }) {
  return <TrendChart points={m.points} unit={m.unit} hues={hues} kind="line" dark={dark} narrow={narrow} />
}

/** Y · two readings — never a line, and never a shared value axis. */
export function TwoValueMark({ m, hues = TREND_NEUTRAL, dark }: { m: Extract<L2Mark, { kind: 'twoValue' }>; hues?: TrendHues; dark?: boolean }) {
  const skin = skinFor(hues, dark)
  const cell = (c: { label: string; value: number; span: string; partial?: boolean }) => (
    <div
      key={c.label}
      className="flex-1 rounded-input px-3.5 py-3"
      style={c.partial ? { border: `1px dashed ${BORDER}` } : { background: '#f4f2f8' }}
    >
      <div className="text-[10px]" style={{ color: GREY }}>{c.label}</div>
      {/* neutral ink, like every other L2 reading — in brand green these two
          figures read as a verdict on an indicator with too few readings to
          call a direction at all */}
      <div className="text-[24px] font-bold leading-none" style={{ color: c.partial ? '#53565a' : skin.hues.now, marginTop: 4 }}>
        {val(c.value, m.unit)}
      </div>
      <div className="mt-1.5 text-[10px]" style={{ color: GREY }}>{c.span}</div>
    </div>
  )
  return <div className="flex gap-3">{[cell(m.a), cell(m.b)]}</div>
}

/** Z · one reading is a starting position, said as one. */
export function BaselineMark({ m }: { m: Extract<L2Mark, { kind: 'baseline' }> }) {
  return (
    <div>
      <div className="text-[30px] font-bold leading-none" style={{ color: '#1e2422' }}>
        {val(m.value, m.unit)}
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: '#75787b' }}>
        first reading · {m.period} · baseline
      </p>
    </div>
  )
}

/* ───────────────────────────── the dispatchers ───────────────────────────── */

export function L1MarkView({
  mark,
  note,
  cadence,
  compact,
  dark,
}: {
  mark: L1Mark
  note?: string
  cadence?: string
  /** the caller already prints the figure and its basis — see the marks above */
  compact?: boolean
  /** on the navy enabling-function band */
  dark?: boolean
}) {
  switch (mark.kind) {
    case 'bullet':
      return <BulletMark m={mark} />
    case 'gauge':
      return <GaugeMark m={mark} />
    case 'centredGauge':
      return <CentredGaugeMark m={mark} />
    case 'bareFigure':
      return <BareFigureMark m={mark} note={note} compact={compact} />
    case 'notReported':
      return <NotReportedMark m={mark} cadence={cadence} compact={compact} dark={dark} />
    case 'idle':
      return <IdleMark compact={compact} />
  }
}

export function L2MarkView({ mark, hues = TREND_NEUTRAL, dark, narrow }: { mark: L2Mark; hues?: TrendHues; dark?: boolean; narrow?: boolean }) {
  switch (mark.kind) {
    case 'bars':
      return <BarTrend m={mark} hues={hues} dark={dark} narrow={narrow} />
    case 'line':
      return <LineTrend m={mark} hues={hues} dark={dark} narrow={narrow} />
    case 'twoValue':
      return <TwoValueMark m={mark} hues={hues} dark={dark} />
    case 'baseline':
      return <BaselineMark m={mark} />
    case 'none':
      return null
  }
}

/* ─────────────────────────── the surface entry points ────────────────────── */

/**
 * A trend's colour is its indicator's THEMATIC identity, resolved here rather
 * than passed down — a caller that had to supply the hue is a caller that
 * could supply the wrong one. `themeByName` degrades an unknown or missing
 * theme to the fallback id, which maps to the neutral ink.
 */
const huesFor = (k: ObsKpi) => trendHues(themeByName(k.theme ?? '').id)

/**
 * L1 ONLY — every listing card outside the Executive Dashboard.
 *
 * A listing is for FINDING an indicator, not studying one. 240 cards each
 * carrying a four-year trend with a target path was the single biggest source
 * of overload on the search page, and it also broke the rule the platform
 * already holds elsewhere: the card answers "where does this stand now", the
 * overlay answers "what is the story". So this never falls through to L2 —
 * a value with no target shows its figure and context line, an unreported
 * period shows the not-reported state, an off-cycle row shows idle. The mark
 * is still the shared selector's choice, never the component's.
 */
export function CardMarkL1({ k, p, dark }: { k: ObsKpi; p: Period; dark?: boolean }): React.ReactElement | null {
  const l1 = selectL1(k, p)
  /* returning the ELEMENT for a state that renders to nothing would still hand
     KpiCard a truthy child and leave an empty slot with its margin — so decide
     here, where the mark kind is known */
  if (l1.kind === 'idle' || l1.kind === 'bareFigure') return null
  if (l1.kind === 'notReported' && l1.lastValue === null) return null
  return <L1MarkView mark={l1} compact dark={dark} />
}

/** L1 + L2 — the current-value mark with the trend beneath it. */
export function CardMarkL1L2({ k, p, dark }: { k: ObsKpi; p: Period; dark?: boolean }) {
  const l2 = selectL2(k, p)
  const top = CardMarkL1({ k, p, dark })
  if (!top && l2.kind === 'none') return null
  return (
    <div className="flex flex-col gap-3">
      {top}
      {l2.kind !== 'none' && <L2MarkView mark={l2} hues={huesFor(k)} dark={dark} />}
    </div>
  )
}

/**
 * What an EXECUTIVE DASHBOARD card draws — the deliberate exception. The
 * scoring marks win where a target exists; where there is nothing to score
 * against, the trend carries the story instead. Ten cards is not the overload
 * problem, and those charts are working.
 */
export function CardMark({ k, p }: { k: ObsKpi; p: Period }) {
  const l1 = selectL1(k, p)
  if (l1.kind === 'bullet' || l1.kind === 'gauge' || l1.kind === 'centredGauge') return <L1MarkView mark={l1} />
  const l2 = selectL2(k, p)
  if (l2.kind !== 'none') return <L2MarkView mark={l2} hues={huesFor(k)} />
  return <L1MarkView mark={l1} />
}

/**
 * What an OVERLAY draws: the same mark the card showed, then the trend beneath
 * it. Depth added, never a different chart substituted.
 */
export function OverlayMarks({ k, p }: { k: ObsKpi; p: Period }) {
  const l1 = selectL1(k, p)
  const l2 = selectL2(k, p)
  const scoring = l1.kind === 'bullet' || l1.kind === 'gauge' || l1.kind === 'centredGauge'
  return (
    <div className="flex flex-col gap-5">
      <L1MarkView mark={l1} />
      {/* the card's mark is the trend when nothing scores it — don't draw it twice */}
      {(scoring || !(l2.kind !== 'none')) && l2.kind !== 'none' && <L2MarkView mark={l2} hues={huesFor(k)} />}
    </div>
  )
}
