/**
 * The four L1 card grammars — hand-rolled SVG, not charts.
 * Identical container (100% x 96px), theme hue + one neutral, no axis chrome.
 * The shape of the mark tells the reader what kind of evidence this is.
 */
const NEUTRAL = '#c8c9c7'

/* 1 · Trajectory — >=3 readings. Area micro-chart, last point labelled.
 *
 * Height is FIXED at H whatever the card's width. The geometry stretches
 * horizontally (preserveAspectRatio="none" + non-scaling strokes) while the
 * dots and labels are HTML positioned by percentage, so they never distort.
 * The old version sized itself from its width — a half-width card drew a mark
 * nearly twice as tall as a third-width one, which is what made cards of the
 * same row disagree about their height. */
export function TrajectoryMark({
  series,
  hue,
  fmtVal,
  H = 96,
  peakHue = '#7e938d',
  axisHue = '#9aaba5',
}: {
  series: [string, number][]
  hue: string
  fmtVal: (n: number) => string
  H?: number
  /** label colours — overridable so the mark can sit on a dark ground */
  peakHue?: string
  axisHue?: string
}) {
  const W = 300
  const pad = { t: 18, b: 16, l: 6, r: 52 }
  const vals = series.map(([, v]) => v)
  const max = Math.max(...vals)
  const min = Math.min(0, ...vals)
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (series.length - 1)
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b)
  const line = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
  const area = `${line} L${x(vals.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const last = vals[vals.length - 1]
  const peakIdx = vals.indexOf(max)
  const lx = (v: number) => `${(v / W) * 100}%`
  const ly = (v: number) => `${(v / H) * 100}%`
  return (
    <div className="relative w-full" style={{ height: H }} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={area} fill={hue} opacity="0.13" />
        <path
          d={line}
          stroke={hue}
          strokeWidth="2.2"
          fill="none"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {peakIdx !== vals.length - 1 && (
        <>
          <span
            className="absolute rounded-full"
            style={{ left: lx(x(peakIdx)), top: ly(y(max)), width: 5, height: 5, background: NEUTRAL, transform: 'translate(-50%,-50%)' }}
          />
          <span
            className="num absolute text-[10.5px] whitespace-nowrap"
            style={{
              left: lx(x(peakIdx)),
              top: ly(y(max) - 6),
              color: peakHue,
              transform: peakIdx === 0 ? 'translate(0,-100%)' : 'translate(-50%,-100%)',
            }}
          >
            {fmtVal(max)}
          </span>
        </>
      )}
      <span
        className="absolute rounded-full"
        style={{ left: lx(x(vals.length - 1)), top: ly(y(last)), width: 7, height: 7, background: hue, transform: 'translate(-50%,-50%)' }}
      />
      <span
        className="num absolute text-[12px] font-bold whitespace-nowrap"
        style={{ left: lx(x(vals.length - 1)), top: ly(y(last)), color: hue, transform: 'translate(7px,-50%)' }}
      >
        {fmtVal(last)}
      </span>
      <span className="absolute text-[9.5px]" style={{ left: lx(pad.l), bottom: 0, color: axisHue }}>
        {series[0][0]}
      </span>
      <span
        className="absolute text-[9.5px]"
        style={{ left: lx(x(vals.length - 1)), bottom: 0, color: axisHue, transform: 'translateX(-50%)' }}
      >
        {series[series.length - 1][0] === '2026Q1' ? 'Q1 26' : series[series.length - 1][0]}
      </span>
    </div>
  )
}

/* Single-point position vs target for dense rows — a snapshot, never a history. */
export function BulletMicro({ actual, target, hue, w = 110, h = 14 }: { actual: number; target: number; hue: string; w?: number; h?: number }) {
  const max = Math.max(actual, target) * 1.05 || 1
  const x = (v: number) => 2 + (v / max) * (w - 8)
  return (
    <svg width={w} height={h} aria-hidden>
      <rect x={2} y={h / 2 - 3} width={w - 8} height={6} rx={3} fill="rgba(200,201,199,0.3)" />
      <rect x={2} y={h / 2 - 3} width={Math.max(2, x(actual) - 2)} height={6} rx={3} fill={hue} />
      <rect x={x(target) - 1} y={1} width={2} height={h - 2} fill="#9ca3af" />
    </svg>
  )
}

/* (MiniLine removed in R8 — no card or row draws a multi-point history; trends
   live only in the detail overlay.) */

/* 2 · Composition — a whole made of named parts, single reading.
   Now an ECharts ring: see components/charts/RingMark.tsx. A literal dot per
   school stopped reading as a count at 86 marks and became texture. */

/* 3 · Progress to a real commitment — single reading + credible target. */
export function ProgressMark({
  rows,
  hue,
}: {
  rows: { label: string; value: number; target: number }[]
  hue: string
}) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {rows.map((r) => (
        <div key={r.label}>
          <svg viewBox="0 0 300 12" width="100%" height="12" preserveAspectRatio="none">
            <rect x="0" y="3" width="300" height="6" rx="3" fill={NEUTRAL} opacity="0.35" />
            <rect x="0" y="3" width={Math.min(300, (r.value / r.target) * 300)} height="6" rx="3" fill={hue} />
          </svg>
          <div className="mt-1 flex justify-between text-[10.5px] text-ink-mute">
            <span>{r.label}</span>
            <span className="num">
              {new Intl.NumberFormat('en').format(r.value)} of {new Intl.NumberFormat('en').format(r.target)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* 4 · Sparse — 1–2 readings. The emptiness is the message: solid actual bars, hollow target outlines. */
export function SparseMark({
  items,
  hue,
}: {
  items: { label: string; actual: number; target: number }[]
  hue: string
}) {
  const W = 300
  const H = 96
  const max = Math.max(...items.map((i) => Math.max(i.actual, i.target)), 1)
  const bw = 26
  const gap = W / (items.length + 1)
  const y = (v: number) => 14 + (1 - v / max) * 58
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="96" aria-hidden>
      <line x1="0" y1="72.5" x2={W} y2="72.5" stroke={NEUTRAL} strokeWidth="1" opacity="0.6" />
      {items.map((it, i) => {
        const cx = gap * (i + 1)
        return (
          <g key={it.label}>
            {/* target: hollow outline at its would-be height */}
            <rect x={cx - bw / 2} y={y(it.target)} width={bw} height={72 - y(it.target) || 1} fill="none" stroke={NEUTRAL} strokeWidth="1.3" strokeDasharray="3 3" rx="3" />
            {/* actual: solid, however small */}
            {it.actual > 0 ? (
              <rect x={cx - bw / 2} y={y(it.actual)} width={bw} height={72 - y(it.actual)} fill={hue} rx="3" />
            ) : (
              <line x1={cx - bw / 2} y1="72" x2={cx + bw / 2} y2="72" stroke={hue} strokeWidth="2.6" />
            )}
            <text x={cx} y={y(it.target) - 5} fontSize="10.5" fill="#7e938d" textAnchor="middle" fontFamily="var(--font-num)">
              {it.actual} of {it.target}
            </text>
            <text x={cx} y={H - 3} fontSize="9.5" fill="#9aaba5" textAnchor="middle" fontFamily="var(--font-ui)">
              {it.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
