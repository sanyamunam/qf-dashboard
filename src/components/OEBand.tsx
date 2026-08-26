/**
 * Organizational Excellence — the enabling function, below the grid and shaped
 * unlike anything in it: full width, short, laid out along the horizontal.
 * Silhouette does the work colour couldn't; navy identity is unchanged.
 *
 * Two figures, nothing else. Each one keeps its own trend directly beneath it,
 * so a number and the line that explains it are read as one object — an
 * earlier version put the 7% in one zone and its chart in another, which made
 * the band busy and the pairing invisible.
 */
import { ChevronRight } from 'lucide-react'
import { TrajectoryMark } from './marks'
import { facts, fmt } from '../model/facts'
import { themeKpis } from '../model/data'

const NAVY_ACCENT = '#8fa3d4'
const PEAK = 'rgba(255,255,255,0.45)'
const AXIS = 'rgba(255,255,255,0.40)'

/** One headline indicator: figure, what it is, and its own four-year line. */
function Stat({
  figure,
  label,
  series,
  fmtVal,
}: {
  figure: string
  label: React.ReactNode
  series: [string, number][]
  fmtVal: (n: number) => string
}) {
  return (
    <div className="min-w-[168px] flex-1">
      <div className="flex items-baseline gap-2">
        <span className="num text-[32px] font-bold leading-none text-white">{figure}</span>
        <span className="text-[12px] leading-[1.35] text-white/60">{label}</span>
      </div>
      {/* On the narrowest containers everything stacks into one column, and two
          figures plus two charts made the band taller than the cards it must
          read as different from. The figures are the point; the lines are the
          supporting detail, so they are what goes. */}
      <div className="mt-3 hidden @lg:block">
        <TrajectoryMark series={series} hue={NAVY_ACCENT} fmtVal={fmtVal} H={66} peakHue={PEAK} axisHue={AXIS} />
      </div>
    </div>
  )
}

export function OEBand({ onOpen }: { onOpen: (themeId: string) => void }) {
  const kpis = themeKpis('Organizational Excellence')
  const entities = new Set(kpis.map((k) => k.entity)).size

  // the two that carry the enabling function: retention, and investment in
  // people — the best turnover of four reported years, and the largest climb
  const turnover = facts.oe.turnover.series
  const training = facts.oe.training.series

  return (
    <button
      onClick={() => onOpen('oe')}
      className="group relative w-full overflow-hidden rounded-card text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
      style={{ background: 'var(--color-th-oe)', boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
      aria-label={`Organizational Excellence — enabling function, explore ${kpis.length} indicators`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[4px] transition-all duration-300 group-hover:h-[5px]" style={{ background: NAVY_ACCENT }} />

      <div className="flex flex-col gap-7 px-7 py-8 @lg:flex-row @lg:flex-wrap @lg:items-center @lg:gap-x-10 @lg:gap-y-7 @3xl:px-9">
        {/* identity */}
        <div className="min-w-[196px] shrink-0">
          <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white">
            Organizational Excellence
          </h3>
          <div className="mt-1.5 text-[11.5px] leading-relaxed text-white/50">
            enabling function
            <br />
            {kpis.length} indicators · {entities} entities
          </div>
        </div>

        {/* the two figures, each with its own line */}
        <Stat
          figure={`${fmt(turnover[turnover.length - 1]?.[1])}%`}
          label={
            <>
              employee turnover
              <br />
              at end-2025
            </>
          }
          series={turnover}
          fmtVal={(n) => `${n}%`}
        />
        <Stat
          figure={fmt(training[training.length - 1]?.[1])}
          label={
            <>
              training hours
              <br />
              per employee
            </>
          }
          series={training}
          fmtVal={(n) => `${n}`}
        />

        {/* the door */}
        <span
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-input border-[1.5px] px-4 py-2.5 text-[13px] font-semibold transition-colors duration-200 max-@lg:w-full"
          style={{ borderColor: 'rgba(255,255,255,0.35)', color: '#fff', background: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          Explore {kpis.length} indicators
          <ChevronRight size={16} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  )
}
