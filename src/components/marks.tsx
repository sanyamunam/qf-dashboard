/**
 * The four L1 card grammars — hand-rolled SVG, not charts.
 * Identical container (100% x 96px), theme hue + one neutral, no axis chrome.
 * The shape of the mark tells the reader what kind of evidence this is.
 */
const NEUTRAL = '#c8c9c7'

/* 1 · Trajectory — >=3 readings. Area micro-chart, last point labelled. */
export function TrajectoryMark({
  series,
  hue,
  fmtVal,
  H = 96,
}: {
  series: [string, number][]
  hue: string
  fmtVal: (n: number) => string
  H?: number
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
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 'auto' }} aria-hidden>
      <path d={area} fill={hue} opacity="0.13" />
      <path d={line} stroke={hue} strokeWidth="2.2" fill="none" strokeLinejoin="round" />
      {peakIdx !== vals.length - 1 && (
        <>
          <circle cx={x(peakIdx)} cy={y(max)} r="2.6" fill={NEUTRAL} />
          <text x={x(peakIdx) + (peakIdx === 0 ? 4 : 0)} y={y(max) - 6} fontSize="10.5" fill="#7e938d" fontFamily="var(--font-num)" textAnchor={peakIdx === 0 ? 'start' : 'middle'}>
            {fmtVal(max)}
          </text>
        </>
      )}
      <circle cx={x(vals.length - 1)} cy={y(last)} r="3.4" fill={hue} />
      <text x={x(vals.length - 1) + 7} y={y(last) + 4} fontSize="12" fontWeight="700" fill={hue} fontFamily="var(--font-num)">
        {fmtVal(last)}
      </text>
      <text x={pad.l} y={H - 3} fontSize="9.5" fill="#9aaba5" fontFamily="var(--font-ui)">
        {series[0][0]}
      </text>
      <text x={x(vals.length - 1)} y={H - 3} fontSize="9.5" fill="#9aaba5" textAnchor="middle" fontFamily="var(--font-ui)">
        {series[series.length - 1][0] === '2026Q1' ? 'Q1 26' : series[series.length - 1][0]}
      </text>
    </svg>
  )
}

/* Tiny inline trend for dense rows and small cards — drawn only at ≥3 readings. */
export function MiniLine({ series, hue, w = 120, h = 28 }: { series: [string, number][]; hue: string; w?: number; h?: number }) {
  const vals = series.map(([, v]) => v)
  const max = Math.max(...vals)
  const min = Math.min(0, ...vals)
  const x = (i: number) => (i / (vals.length - 1)) * (w - 6) + 1
  const y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 7)
  return (
    <svg width={w} height={h} aria-hidden>
      <path d={vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} stroke={hue} strokeWidth="1.8" fill="none" />
      <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="2.6" fill={hue} />
    </svg>
  )
}

/* 2 · Composition — a whole made of named parts, single reading. Literal dot grid. */
export function DotGridMark({
  total,
  filled,
  hue,
  filledLabel,
  restLabel,
}: {
  total: number
  filled: number
  hue: string
  filledLabel: string
  restLabel: string
}) {
  const cols = Math.ceil(Math.sqrt(total * 2.8))
  const rows = Math.ceil(total / cols)
  const cell = Math.min(300 / cols, 74 / rows)
  const r = cell * 0.32
  return (
    <div aria-hidden>
      <svg viewBox={`0 0 300 ${rows * cell + 2}`} width="100%" height="74">
        {Array.from({ length: total }, (_, i) => {
          const cx = (i % cols) * cell + cell / 2
          const cy = Math.floor(i / cols) * cell + cell / 2
          const isFilled = i < filled
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={isFilled ? hue : 'none'}
              stroke={isFilled ? 'none' : NEUTRAL}
              strokeWidth="1.1"
            />
          )
        })}
      </svg>
      <div className="mt-1.5 flex gap-4 text-[10.5px] text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: hue }} />
          {filledLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: NEUTRAL }} />
          {restLabel}
        </span>
      </div>
    </div>
  )
}

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
