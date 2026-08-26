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
import { fmt } from '../../model/data'
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

export function BareFigureMark({ m, note }: { m: Extract<L1Mark, { kind: 'bareFigure' }>; note?: string }) {
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

export function NotReportedMark({ m, cadence }: { m: Extract<L1Mark, { kind: 'notReported' }>; cadence?: string }) {
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

export function IdleMark() {
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
const TREND_H = 132
const BASE_Y = 108

function trendScale(points: TrendPoint[]) {
  const vals = points.flatMap((p) => [p.actual, p.target]).filter((v): v is number => v !== null)
  const max = Math.max(...vals, 1)
  const min = Math.min(0, ...vals)
  const y = (v: number) => BASE_Y - ((v - min) / (max - min || 1)) * (BASE_Y - 24)
  const step = TREND_W / points.length
  const x = (i: number) => step * i + step / 2
  return { x, y, step }
}

/** X · counts — solid bars are actuals, hollow dashed are the committed path,
 *  and the red dashed target line is drawn only where a target exists. */
export function BarTrend({ m }: { m: Extract<L2Mark, { kind: 'bars' }> }) {
  const { x, y, step } = trendScale(m.points)
  const bw = Math.min(30, step * 0.62)
  const lastActual = m.points.filter((p) => p.actual !== null).slice(-1)[0]
  const firstActual = m.points.filter((p) => p.actual !== null)[0]
  const divider = m.points.findIndex((p) => p.future)
  /* target segments break wherever the sheet set none — never interpolated */
  const segs: string[][] = []
  let cur: string[] = []
  m.points.forEach((p, i) => {
    if (p.target === null) {
      if (cur.length) segs.push(cur)
      cur = []
      return
    }
    cur.push(`${x(i) - bw / 2},${y(p.target)}`, `${x(i) + bw / 2},${y(p.target)}`)
  })
  if (cur.length) segs.push(cur)

  return (
    <svg viewBox={`0 0 ${TREND_W} ${TREND_H}`} height={TREND_H} width="100%" style={{ overflow: 'visible' }} aria-hidden>
      {m.points.map((p, i) =>
        p.actual !== null ? (
          <rect
            key={p.year}
            x={x(i) - bw / 2}
            y={y(p.actual)}
            width={bw}
            height={Math.max(2, BASE_Y - y(p.actual))}
            rx="4"
            fill={p === lastActual ? BRAND : BAR_MUTED}
          />
        ) : p.target !== null ? (
          <rect
            key={p.year}
            x={x(i) - bw / 2}
            y={y(p.target)}
            width={bw}
            height={Math.max(2, BASE_Y - y(p.target))}
            rx="4"
            fill="none"
            stroke={BRAND}
            strokeWidth="1.4"
            strokeDasharray="4 3"
            opacity="0.55"
          />
        ) : null,
      )}
      {segs.map((s, i) => (
        <polyline key={i} points={s.join(' ')} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5 3" />
      ))}
      {divider > 0 && (
        <line x1={x(divider) - step / 2} y1="8" x2={x(divider) - step / 2} y2={BASE_Y} stroke={BORDER} strokeDasharray="3 3" />
      )}
      <line x1="0" y1={BASE_Y} x2={TREND_W} y2={BASE_Y} stroke={BORDER} />
      {firstActual && (
        <text x={x(m.points.indexOf(firstActual))} y={y(firstActual.actual as number) - 6} textAnchor="middle" fontSize="10" fill={GREY}>
          {compact(firstActual.actual as number)}
          {m.unit}
        </text>
      )}
      {lastActual && (
        <text x={x(m.points.indexOf(lastActual))} y={y(lastActual.actual as number) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={BRAND}>
          {compact(lastActual.actual as number)}
          {m.unit}
        </text>
      )}
      {m.points.map((p, i) =>
        i === 0 || i === m.points.length - 1 || p === lastActual ? (
          <text key={`y${p.year}`} x={x(i)} y={TREND_H - 8} textAnchor="middle" fontSize="10" fill={GREY}>
            {p.year}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** X · percentages — a level that persists, so a line. Solid actual, red
 *  dashed target, hollow points on the future path. */
export function LineTrend({ m }: { m: Extract<L2Mark, { kind: 'line' }> }) {
  const { x, y, step } = trendScale(m.points)
  const acts = m.points.map((p, i) => ({ ...p, i })).filter((p) => p.actual !== null)
  const last = acts.slice(-1)[0]
  const divider = m.points.findIndex((p) => p.future)
  const segs: string[][] = []
  let cur: string[] = []
  m.points.forEach((p, i) => {
    if (p.target === null) {
      if (cur.length > 1) segs.push(cur)
      cur = []
      return
    }
    cur.push(`${x(i)},${y(p.target)}`)
  })
  if (cur.length > 1) segs.push(cur)

  return (
    <svg viewBox={`0 0 ${TREND_W} ${TREND_H}`} height={TREND_H} width="100%" style={{ overflow: 'visible' }} aria-hidden>
      {segs.map((s, i) => (
        <polyline key={i} points={s.join(' ')} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5 3" opacity={i > 0 ? 0.7 : 1} />
      ))}
      <polyline points={acts.map((p) => `${x(p.i)},${y(p.actual as number)}`).join(' ')} fill="none" stroke={BRAND} strokeWidth="2.5" />
      {acts.map((p) => (
        <circle key={p.year} cx={x(p.i)} cy={y(p.actual as number)} r={p === last ? 5.5 : 3.5} fill={BRAND} />
      ))}
      {m.points.map((p, i) =>
        p.future && p.target !== null ? (
          <circle key={`f${p.year}`} cx={x(i)} cy={y(p.target)} r="4" fill="#fff" stroke={RED} strokeWidth="1.6" />
        ) : null,
      )}
      {divider > 0 && (
        <line x1={x(divider) - step / 2} y1="8" x2={x(divider) - step / 2} y2={BASE_Y} stroke={BORDER} strokeDasharray="3 3" />
      )}
      <line x1="0" y1={BASE_Y} x2={TREND_W} y2={BASE_Y} stroke={BORDER} />
      {acts[0] && (
        <text x={x(acts[0].i)} y={y(acts[0].actual as number) - 9} textAnchor="middle" fontSize="10" fill={GREY}>
          {val(acts[0].actual as number, m.unit)}
        </text>
      )}
      {last && (
        <text x={x(last.i)} y={y(last.actual as number) - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill={BRAND}>
          {val(last.actual as number, m.unit)}
        </text>
      )}
      {m.points.map((p, i) =>
        i === 0 || i === m.points.length - 1 || p === (last as unknown as TrendPoint) ? (
          <text key={`y${p.year}`} x={x(i)} y={TREND_H - 8} textAnchor="middle" fontSize="10" fill={GREY}>
            {p.year}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** Y · two readings — never a line, and never a shared value axis. */
export function TwoValueMark({ m }: { m: Extract<L2Mark, { kind: 'twoValue' }> }) {
  const cell = (c: { label: string; value: number; span: string; partial?: boolean }) => (
    <div
      key={c.label}
      className="flex-1 rounded-input px-3.5 py-3"
      style={c.partial ? { border: `1px dashed ${BORDER}` } : { background: '#f4f2f8' }}
    >
      <div className="text-[10px]" style={{ color: GREY }}>{c.label}</div>
      <div className="text-[24px] font-bold leading-none" style={{ color: c.partial ? '#53565a' : BRAND, marginTop: 4 }}>
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

export function L1MarkView({ mark, note, cadence }: { mark: L1Mark; note?: string; cadence?: string }) {
  switch (mark.kind) {
    case 'bullet':
      return <BulletMark m={mark} />
    case 'gauge':
      return <GaugeMark m={mark} />
    case 'centredGauge':
      return <CentredGaugeMark m={mark} />
    case 'bareFigure':
      return <BareFigureMark m={mark} note={note} />
    case 'notReported':
      return <NotReportedMark m={mark} cadence={cadence} />
    case 'idle':
      return <IdleMark />
  }
}

export function L2MarkView({ mark }: { mark: L2Mark }) {
  switch (mark.kind) {
    case 'bars':
      return <BarTrend m={mark} />
    case 'line':
      return <LineTrend m={mark} />
    case 'twoValue':
      return <TwoValueMark m={mark} />
    case 'baseline':
      return <BaselineMark m={mark} />
    case 'none':
      return null
  }
}

/* ─────────────────────────── the surface entry points ────────────────────── */

/**
 * What a CARD draws. The scoring marks win where a target exists; where there
 * is nothing to score against, the trend carries the story instead — which is
 * the reference's own reading of the D case. Either way the choice is the
 * selector's, never the card's.
 */
export function CardMark({ k, p }: { k: ObsKpi; p: Period }) {
  const l1 = selectL1(k, p)
  if (l1.kind === 'bullet' || l1.kind === 'gauge' || l1.kind === 'centredGauge') return <L1MarkView mark={l1} />
  const l2 = selectL2(k, p)
  if (l2.kind !== 'none') return <L2MarkView mark={l2} />
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
      {(scoring || !(l2.kind !== 'none')) && l2.kind !== 'none' && <L2MarkView mark={l2} />}
    </div>
  )
}
