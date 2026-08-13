/**
 * Organizational Excellence — an enabling function, not a theme card.
 * Navy full-width banner; never shows an Impact/Strategic breakdown.
 */
import { facts, fmt } from '../model/facts'
import { themeKpis, stateCount } from '../model/data'
import { TrajectoryMark } from './marks'

export function OEBanner({ onOpen }: { onOpen: () => void }) {
  const oe = themeKpis('Organizational Excellence')
  const to = facts.oe.turnover.series
  const tr = facts.oe.training.series
  const lastTurnover = to[to.length - 1]
  const lastTraining = tr[tr.length - 1]

  return (
    <button
      onClick={onOpen}
      className="group w-full rounded-card p-6 text-left text-white md:p-7"
      style={{ background: 'var(--color-th-oe)', boxShadow: 'var(--shadow-card)' }}
      aria-label="Organizational Excellence — open detail"
    >
      <div className="flex items-center justify-between">
        <span className="label text-white/70">Organizational Excellence · the engine room</span>
        <span className="text-white/50 transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </div>
      <p className="voice mt-3 max-w-[62ch] text-[16.5px] leading-relaxed text-white/90">
        Turnover ended 2025 at {fmt(lastTurnover?.[1])}%, its best year of the four reported, and average
        training hours have risen from {fmt(tr[0]?.[1])} to {fmt(lastTraining?.[1])} per employee. All nine
        hard-ceiling indicators report at year end, so there is no Q1 reading to judge.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <OETile label="% Employee turnover" note="annual · best of 4 years">
          <TrajectoryMark series={to} hue="#8fa3d4" fmtVal={(n) => `${n}%`} />
        </OETile>
        <OETile label="Training hours / employee" note="annual · rising 4 years">
          <TrajectoryMark series={tr} hue="#8fa3d4" fmtVal={(n) => `${n}`} />
        </OETile>
        <OETile label="Budget variance" note="reports at year end">
          <div className="num pt-3 text-[26px] font-bold text-white/85">
            {fmt(facts.oe.budgetVar.series[facts.oe.budgetVar.series.length - 1]?.[1])}%
            <span className="ml-2 text-[11px] font-normal text-white/55">2025</span>
          </div>
        </OETile>
        <OETile label="Hard ceilings breached" note="all annually reported">
          <div className="num pt-3 text-[26px] font-bold text-white/85">
            0<span className="ml-2 text-[11px] font-normal text-white/55">this quarter</span>
          </div>
        </OETile>
      </div>
      <div className="mt-4 border-t border-white/15 pt-3 text-[11.5px] text-white/55">
        {oe.length} indicators · {stateCount(oe, 'REPORTS_AT_YEAR_END')} report at year end · all hard
        ceilings annually reported
      </div>
    </button>
  )
}

function OETile({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-input bg-white/8 p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{label}</div>
      <div className="[&_text]:!fill-white/70">{children}</div>
      <div className="mt-1 text-[10.5px] text-white/45">{note}</div>
    </div>
  )
}
