/**
 * The Standing — the platform's signature element. A dated written verdict
 * whose every figure traces to a cell. Set in the AI's serif voice.
 * State tallies live in the muted footer, where inventory belongs.
 */
import { motion } from 'framer-motion'
import { facts, fmt, wishDropPct } from '../model/facts'
import { inventory } from '../model/data'
import type { Kpi } from '../model/types'
import { LOADER_LINES } from './Loader'

export function Standing({ onEvidence }: { onEvidence: (kpi: Kpi) => void }) {
  const w = facts.wish
  const eco = facts.eco
  const pubs = facts.earthnaPubs.series
  const wise = facts.wise
  const difi = facts.difiRevenue

  const Ev = ({ kpi, children }: { kpi: Kpi | undefined; children: React.ReactNode }) => (
    <a
      className="evidence"
      onClick={(e) => {
        e.preventDefault()
        if (kpi) onEvidence(kpi)
      }}
      href="#evidence"
    >
      {children}
    </a>
  )

  return (
    <section className="rounded-panel bg-card p-8 shadow-(--shadow-card) md:p-10" aria-label="The Standing">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <span className="label text-ink-mute">The Standing · Q1 2026</span>
        <motion.span layoutId="standing-lede" className="voice text-[15px] italic text-sidra">
          {LOADER_LINES.final}
        </motion.span>
      </div>

      <h1 className="voice text-[28px] leading-[1.22] text-ink md:text-[38px]" style={{ letterSpacing: '-0.01em' }}>
        WISH reached <Ev kpi={w.kpi}><span className="num">{fmt(w.q1)}</span> people</Ev> this quarter. In 2022 it
        reached <Ev kpi={w.kpi}><span className="num">{fmt(w.first)}</span></Ev>.
      </h1>

      <div className="voice mt-6 max-w-[68ch] text-[16.5px] leading-[1.65] text-ink-soft md:text-[17.5px]">
        <p>
          Programme reach at WISH has fallen in each of the last three reported years: 23,150, then 2,000, then
          1,170. The quarter sits at {fmt(w.q1)} against a {fmt(w.target26)} target, {wishDropPct}% below its peak.
          Nothing else in the portfolio is moving at that magnitude.
        </p>
        <p className="mt-4">
          Elsewhere the picture is steadier. Earthna's Eco-Schools network covers{' '}
          <Ev kpi={eco.kpis.benef}><span className="num">{fmt(eco.beneficiaries)}</span> students and teachers</Ev> across{' '}
          <Ev kpi={eco.kpis.reg}><span className="num">{fmt(eco.registered)}</span> Qatari schools</Ev>, its research output has
          climbed from {fmt(pubs[0]?.[1])} to <Ev kpi={facts.earthnaPubs.kpi}><span className="num">{fmt(pubs[pubs.length - 1]?.[1])}</span> papers</Ev> in
          three years, and WISE has awarded{' '}
          <Ev kpi={wise.prizeValueKpi}>QAR <span className="num">{fmt((wise.prizeValue ?? 0) / 1e6)}m</span></Ev> to{' '}
          <Ev kpi={wise.prizeCountKpi}><span className="num">{fmt(wise.prizeCount)}</span> prize recipients</Ev>. DIFI's
          sponsorship revenue has grown{' '}
          <Ev kpi={difi.kpi}>
            <span className="num">{difi.series.length >= 2 ? Math.round(((difi.series[difi.series.length - 1][1] - difi.series[0][1]) / difi.series[0][1]) * 100) : '—'}%</span>
          </Ev>{' '}
          since 2022.
        </p>
        <p className="mt-4">
          {inventory.exactHits} indicators reached their full-year 2026 target inside the first quarter, several
          landing exactly on the number. That is worth a separate conversation about how the targets were set.
        </p>
        <p className="mt-5 italic text-sidra">
          Two questions: what changed in the WISH delivery model, and who set the 2026 targets.
        </p>
      </div>

      {/* data availability, muted, in small type — facts about reporting, not judgements */}
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cream pt-4 text-[12.5px] text-ink-mute">
        <span>
          <b className="num">{inventory.total}</b> indicators
        </span>
        <span>
          <b className="num">{inventory.yearEnd}</b> report at year end
        </span>
        <span>
          <b className="num">{inventory.idle}</b> idle this cycle by design
        </span>
        <span>
          <b className="num">{inventory.exactHits}</b> landed exactly on their annual target
        </span>
      </div>
    </section>
  )
}
