/**
 * Briefing visuals — presentation-grade, one point per chart, direct-labelled,
 * drawn once on entry (600–800ms) and then at rest. No legends, no gridlines.
 */
import { motion, useReducedMotion } from 'framer-motion'
import type { VisualSpec } from './engine'
import { kpis } from '../model/data'

const INK = '#122822'
const MUTE = '#7e938d'
const MAROON = '#8a1538'
const GREEN = '#2e7d5b'

export function BriefVisual({ spec, active }: { spec: VisualSpec; active: boolean }) {
  switch (spec.type) {
    case 'exact-targets':
      return <ExactTargets active={active} />
    case 'slope':
      return <Slope {...spec} active={active} />
    case 'quiet-rows':
      return <QuietRows rows={spec.rows} active={active} />
    case 'dot-grid':
      return <BigDotGrid {...spec} active={active} />
    case 'columns':
      return <BigColumns {...spec} active={active} />
    case 'ceilings':
      return <Ceilings names={spec.names} active={active} />
  }
}

/* The lead image: fifteen marks resolving onto a single target line. */
function ExactTargets({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const exact = kpis.filter((k) => k.exactHit)
  const W = 760
  const H = 300
  const lineY = 176
  const labels: Record<string, string> = {
    'Social Media Engagement (LinkedIn)': '7,000 of 7,000',
    'WISE Prize Funding Awarded': 'QAR 27.4m of 27.4m',
    'Qatarization (QF)': '25 of 25',
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 320 }} aria-label="Fifteen indicators exactly on target">
      <text x={16} y={30} fontSize="12" fontFamily="var(--font-ui)" fill={MUTE}>
        each dot is one indicator · the line is its full-year 2026 target
      </text>
      <motion.line
        x1={16}
        y1={lineY}
        x2={W - 16}
        y2={lineY}
        stroke={INK}
        strokeWidth="1.6"
        strokeDasharray="7 5"
        initial={reduced ? false : { pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5 }}
      />
      <text x={W - 16} y={lineY - 10} textAnchor="end" fontSize="11.5" fontFamily="var(--font-ui)" fill={MUTE}>
        full-year target
      </text>
      {(() => {
        let li = 0
        return exact.map((k, i) => {
          const x = 40 + (i * (W - 80)) / (exact.length - 1)
          const labelled = labels[k.name]
          // adjacent labelled dots stagger to alternating depths so they never collide
          const depth = labelled ? 34 + (li++ % 2) * 38 : 0
          return (
            <g key={k.id}>
              <motion.circle
                cx={x}
                r={7}
                fill="#5b2e8a"
                initial={reduced ? { cy: lineY } : { cy: 60, opacity: 0 }}
                animate={active ? { cy: lineY, opacity: 1 } : {}}
                transition={{ delay: 0.15 + i * 0.045, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              />
              {labelled && (
                <motion.g initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : {}} transition={{ delay: 1.1 }}>
                  <line x1={x} y1={lineY + 12} x2={x} y2={lineY + depth} stroke={MUTE} strokeWidth="1" />
                  <text
                    x={x}
                    y={lineY + depth + 16}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="var(--font-num)"
                    fill={INK}
                  >
                    {labelled}
                  </text>
                  <text x={x} y={lineY + depth + 32} textAnchor="middle" fontSize="10" fontFamily="var(--font-ui)" fill={MUTE}>
                    {k.entity}
                  </text>
                </motion.g>
              )}
            </g>
          )
        })
      })()}
      <motion.text
        x={16}
        y={H - 12}
        fontSize="14"
        fontFamily="var(--font-ui)"
        fontWeight="600"
        fill="#5b2e8a"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 1.3 }}
      >
        15 landed exactly · 20 more already past their full-year number
      </motion.text>
    </svg>
  )
}

/* Peak versus now — the collapse, as two labelled points. */
function Slope({ peak, peakLabel, now, nowLabel, target, active }: { peak: number; peakLabel: string; now: number; nowLabel: string; target: number; active: boolean }) {
  const reduced = useReducedMotion()
  const W = 760
  const H = 300
  const x1 = 130
  const x2 = W - 150
  const y = (v: number) => 46 + (1 - v / peak) * 190
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 320 }} aria-label="Peak versus current reach">
      <line x1={40} y1={y(target)} x2={W - 40} y2={y(target)} stroke={MUTE} strokeWidth="1.2" strokeDasharray="6 5" />
      <text x={W - 40} y={y(target) - 8} textAnchor="end" fontSize="11.5" fontFamily="var(--font-ui)" fill={MUTE}>
        full-year target {new Intl.NumberFormat('en').format(target)}
      </text>
      <motion.line
        x1={x1}
        y1={y(peak)}
        x2={x2}
        y2={y(now)}
        stroke={MAROON}
        strokeWidth="2.4"
        initial={reduced ? false : { pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
      />
      <circle cx={x1} cy={y(peak)} r={11} fill="none" stroke={MAROON} strokeWidth="2.4" />
      <motion.circle cx={x2} cy={y(now)} r={8} fill={MAROON} initial={{ scale: 0 }} animate={active ? { scale: 1 } : {}} transition={{ delay: 0.95 }} />
      <text x={x1} y={y(peak) - 22} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="var(--font-num)" fill={INK}>
        {new Intl.NumberFormat('en').format(peak)}
      </text>
      <text x={x1} y={y(peak) + 34} textAnchor="middle" fontSize="12" fontFamily="var(--font-ui)" fill={MUTE}>
        {peakLabel}
      </text>
      <motion.g initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : {}} transition={{ delay: 1.05 }}>
        <text x={x2} y={y(now) - 20} textAnchor="middle" fontSize="30" fontWeight="700" fontFamily="var(--font-num)" fill={MAROON}>
          {new Intl.NumberFormat('en').format(now)}
        </text>
        <text x={x2} y={y(now) + 32} textAnchor="middle" fontSize="12" fontFamily="var(--font-ui)" fill={MUTE}>
          {nowLabel}
        </text>
      </motion.g>
    </svg>
  )
}

/* Four series that used to report, each ending at a hollow zero. */
function QuietRows({ rows, active }: { rows: { label: string; series: [string, number][]; unit?: string }[]; active: boolean }) {
  const W = 760
  const rowH = 64
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * rowH + 10}`} width="100%" style={{ maxHeight: 320 }} aria-label="Indicators that stopped reporting">
      {rows.map((r, ri) => {
        const max = Math.max(...r.series.map(([, v]) => v), 1)
        const baseY = ri * rowH + 46
        const x0 = 300
        const step = (W - x0 - 90) / r.series.length
        const last = r.series[r.series.length - 2]
        return (
          <motion.g key={r.label} initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : {}} transition={{ delay: 0.15 + ri * 0.14 }}>
            <text x={16} y={baseY - 10} fontSize="13" fontWeight="600" fontFamily="var(--font-ui)" fill={INK}>
              {r.label}
            </text>
            {r.series.map(([yr, v], i) => {
              const x = x0 + i * step
              const h = Math.max(3, (v / max) * 34)
              const isLast = i === r.series.length - 1
              return isLast ? (
                <g key={yr}>
                  <circle cx={x + 9} cy={baseY - 5} r={7} fill="none" stroke={MAROON} strokeWidth="2" />
                  <text x={x + 9} y={baseY + 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="var(--font-num)" fill={MAROON}>
                    0
                  </text>
                </g>
              ) : (
                <rect key={yr} x={x} y={baseY - h} width={18} height={h} rx={2.5} fill="#556bb4" opacity={0.4 + (i / r.series.length) * 0.4} />
              )
            })}
            <text x={W - 16} y={baseY - 8} textAnchor="end" fontSize="11.5" fontFamily="var(--font-num)" fill={MUTE}>
              {r.unit === 'QAR' ? 'QAR ' : ''}
              {new Intl.NumberFormat('en').format(last?.[1] ?? 0)} → 0
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

/* A countable reach — every dot a school. */
function BigDotGrid({ total, filled, filledLabel, restLabel, headline, active }: { total: number; filled: number; filledLabel: string; restLabel: string; headline: number; active: boolean }) {
  const cols = 22
  const cell = 30
  const rows = Math.ceil(total / cols)
  const W = cols * cell + 40
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="num text-[44px] font-bold leading-none"
        style={{ color: GREEN }}
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 0.9 }}
      >
        {new Intl.NumberFormat('en').format(headline)}
        <span className="ms-2 text-[14px] font-normal text-ink-mute">students and teachers</span>
      </motion.div>
      <svg viewBox={`0 0 ${W} ${rows * cell + 8}`} width="100%" style={{ maxHeight: 200, marginTop: 14 }} aria-label={`${total} schools, ${filled} certified`}>
        {Array.from({ length: total }, (_, i) => {
          const cx = 20 + (i % cols) * cell + cell / 2
          const cy = Math.floor(i / cols) * cell + cell / 2
          const isFilled = i < filled
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={8}
              fill={isFilled ? GREEN : 'none'}
              stroke={isFilled ? 'none' : MUTE}
              strokeWidth="1.2"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={active ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 + i * 0.007, duration: 0.25 }}
            />
          )
        })}
      </svg>
      <div className="mt-3 flex gap-6 text-[12px] text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} /> {filled} {filledLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ borderColor: MUTE }} /> {total - filled} {restLabel}
        </span>
      </div>
    </div>
  )
}

/* A short climb or overshoot — fat columns, last emphasised. */
function BigColumns({ series, unit, active }: { series: [string, number][]; unit: string; active: boolean }) {
  const W = 760
  const H = 290
  const max = Math.max(...series.map(([, v]) => v))
  const bw = 64
  const step = (W - 120) / series.length
  const h = (v: number) => Math.max(4, (v / max) * 190)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 310 }} aria-label={`Series in ${unit}`}>
      {series.map(([yr, v], i) => {
        const x = 70 + i * step + (step - bw) / 2
        const last = i === series.length - 1
        return (
          <g key={yr}>
            <motion.rect
              x={x}
              width={bw}
              rx={6}
              fill={GREEN}
              opacity={last ? 1 : 0.35}
              initial={{ y: 240, height: 0 }}
              animate={active ? { y: 240 - h(v), height: h(v) } : {}}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            />
            <motion.text
              x={x + bw / 2}
              y={240 - h(v) - 12}
              textAnchor="middle"
              fontSize={last ? 26 : 15}
              fontWeight="700"
              fontFamily="var(--font-num)"
              fill={last ? GREEN : MUTE}
              initial={{ opacity: 0 }}
              animate={active ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              {new Intl.NumberFormat('en').format(v)}
            </motion.text>
            <text x={x + bw / 2} y={266} textAnchor="middle" fontSize="12" fontFamily="var(--font-ui)" fill={MUTE}>
              {yr === '2026Q1' ? 'Q1 26' : yr}
            </text>
          </g>
        )
      })}
      <text x={16} y={H - 4} fontSize="12" fontFamily="var(--font-ui)" fill={MUTE}>
        {unit}
      </text>
    </svg>
  )
}

/* The nine ceilings, present and quiet. */
function Ceilings({ names, active }: { names: string[]; active: boolean }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-wrap justify-center gap-2.5">
      {names.map((n, i) => (
        <motion.span
          key={n}
          className="rounded-full border border-dashed px-3.5 py-2 text-[12.5px] text-ink-soft"
          style={{ borderColor: 'rgba(18,40,34,0.25)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.12 + i * 0.06 }}
        >
          {n} <span className="text-ink-mute">· year end</span>
        </motion.span>
      ))}
    </div>
  )
}
