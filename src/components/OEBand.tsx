/**
 * Organizational Excellence — the enabling function, below the grid and shaped
 * unlike anything in it: full width, short, laid out along the horizontal.
 * Silhouette does the work colour couldn't; navy identity is unchanged.
 *
 * The band is wider than the card this content was designed for, so it carries
 * a reading the card had no room for: 28 of OE's 40 indicators report at year
 * end. That is why the enabling function looks quiet in March, and it is the
 * one thing a reader needs before drawing conclusions from a Q1 view of it.
 */
import { ChevronRight } from 'lucide-react'
import { TrajectoryMark } from './marks'
import { facts, fmt } from '../model/facts'
import { themeKpis } from '../model/data'

const NAVY_ACCENT = '#8fa3d4'

export function OEBand({ onOpen }: { onOpen: (themeId: string) => void }) {
  const kpis = themeKpis('Organizational Excellence')
  const entities = new Set(kpis.map((k) => k.entity)).size
  const count = (s: string) => kpis.filter((k) => k.state === s).length
  const atYearEnd = count('REPORTS_AT_YEAR_END')
  const met = count('TARGET_ALREADY_MET')
  const inProgress = count('IN_PROGRESS')
  const idle = count('IDLE_THIS_CYCLE')

  const turnover = facts.oe.turnover.series
  const training = facts.oe.training.series
  const latestTurnover = turnover[turnover.length - 1]?.[1]
  const firstTraining = training[0]?.[1]
  const latestTraining = training[training.length - 1]?.[1]

  const composition: { label: string; n: number; tone: string }[] = [
    { label: 'report at year end', n: atYearEnd, tone: 'rgba(255,255,255,0.30)' },
    { label: 'in progress', n: inProgress, tone: NAVY_ACCENT },
    { label: 'already at target', n: met, tone: '#78be20' },
    { label: 'idle by design', n: idle, tone: 'rgba(255,255,255,0.18)' },
  ].filter((c) => c.n > 0)

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

      {/* Wraps rather than stacks: at container widths where a four-across row
          won't fit, the zones flow onto a second line and the CTA drops — the
          band stays short and wide. Stacking it into one tall column made it
          TALLER than the cards above (445 vs 407 at tablet), which is precisely
          the distinction this shape exists to carry. */}
      <div className="flex flex-col gap-6 px-6 py-6 @lg:flex-row @lg:flex-wrap @lg:items-center @lg:gap-x-8 @lg:gap-y-5 @3xl:gap-x-9 @3xl:px-8">
        {/* identity + the headline figure */}
        <div className="min-w-[200px] shrink-0 @3xl:max-w-[290px]">
          <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white">
            Organizational Excellence
          </h3>
          <div className="mt-1 text-[11.5px] text-white/50">
            enabling function · {kpis.length} indicators · {entities} entities
          </div>
          <div className="mt-3.5 flex items-baseline gap-2">
            <span className="num text-[30px] font-bold leading-none text-white">{fmt(latestTurnover)}%</span>
            <span className="text-[12px] leading-tight text-white/60">
              employee turnover
              <br />
              at end-2025
            </span>
          </div>
        </div>

        {/* The trend, at a band's height rather than a card's. Dropped on the
            narrowest containers, where everything is one column: stacking all
            four zones made the band taller than the cards it must read as
            different from, and this is the zone whose information is most
            readily available inside the theme itself. */}
        <div className="hidden min-w-[170px] flex-1 @lg:block">
          <div className="label mb-1 text-[9.5px] text-white/40">turnover, four reported years</div>
          <div className="[&_span]:!text-white/70">
            <TrajectoryMark series={turnover} hue={NAVY_ACCENT} fmtVal={(n) => `${n}%`} H={64} />
          </div>
        </div>

        {/* what the 40 indicators are actually doing — the reading the card had
            no room for, and the reason OE looks quiet in a Q1 view */}
        <div className="min-w-[200px] flex-1">
          <div className="label mb-2 text-[9.5px] text-white/40">where the {kpis.length} indicators stand</div>
          <div className="flex h-[9px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
            {composition.map((c) => (
              <span key={c.label} style={{ width: `${(c.n / kpis.length) * 100}%`, background: c.tone }} />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {composition.map((c) => (
              <span key={c.label} className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.tone }} />
                <span className="num font-semibold text-white/90">{c.n}</span> {c.label}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-white/55">
            Training has climbed <span className="num text-white/80">{fmt(firstTraining)}</span> to{' '}
            <span className="num text-white/80">{fmt(latestTraining)}</span> hours per employee.
          </p>
        </div>

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
