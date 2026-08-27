/**
 * Thematic View — the platform's primary screen: header zone, the portfolio
 * brief, hero-plus-four theme cards, OE banner. Executive View — briefing-first.
 * BDO — designed empty state. (Home is parked: nav item disabled, no route —
 * see TODO in Shell.tsx.)
 */
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { AppHeader, Spark, HeaderCluster, TopNav } from '../components/Shell'
import { CollapsibleSummary, StatusCards } from '../components/DashParts'
import { thematicRows } from '../model/dash'
import { buildCards, ThemeCard } from '../components/ThemeCards'
import { OEBand } from '../components/OEBand'
import { Standing } from '../components/Standing'
import { inventory } from '../model/data'
import type { Kpi } from '../model/types'

const cards = buildCards()

export function ThematicView({
  onOpenTheme,
  onEvidence,
}: {
  onOpenTheme: (themeId: string) => void
  onEvidence: (kpi: Kpi) => void
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      {/* header zone: logo at rest with its clear space, then title + orientation,
          context strip right-aligned on the title baseline */}
      <header className="pt-6">
        <div className="flex items-center gap-6">
          {/* clear space around the mark equals its height */}
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <div className="flex flex-1 justify-center">
            <TopNav active="themes" />
          </div>
          <HeaderCluster hidePeriod />
        </div>
        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="text-[30px] font-semibold leading-none tracking-tight text-ink">Thematic View</h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Qatar Foundation's five thematic areas, across {inventory.total} indicators and{' '}
              {inventory.entities.length} entities.
            </p>
          </div>
          <div className="text-[12.5px] text-ink-mute">
            Q1 2026 · updated 8 Aug · <span className="num">{inventory.total}</span> indicators
          </div>
        </div>
      </header>

      {/* rhythm (R5 fix 1): title sits close to the summary it introduces (32px);
          the summary→themes gap is the largest on the page (56px) */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        <CollapsibleSummary p="q1" within={thematicRows} onOpen={onEvidence} />
      </motion.div>

      {/* the four states over the 151 Thematic rows — the same component the
          Executive View uses, so the two can never drift apart */}
      <StatusCards p="q1" within={thematicRows} dash="Thematic" noun="Thematic indicators" />

      {/* The five thematic areas: 2 over 3, on one six-column grid so both rows
          are the same height (auto-rows-fr) — the top pair is WIDER, never
          taller. Five cards fill both rows exactly; no cell is left over.
          Container-queried so it reflows when BOTaina's panel takes space:
          stacked, then 2-over-2-over-1, then the full 2-over-3. */}
      <motion.div
        className="mt-12 grid auto-rows-fr grid-cols-6 gap-4"
        initial="off"
        animate="on"
        variants={{ on: { transition: { staggerChildren: 0.05 } } }}
      >
        {cards.map((c) => (
          <motion.div
            key={c.themeId}
            className={`col-span-6 ${
              c.span === 3
                ? '@xl:col-span-3'
                : c.themeId === 'health'
                  ? '@xl:col-span-6 @4xl:col-span-2'
                  : '@xl:col-span-3 @4xl:col-span-2'
            }`}
            variants={{ off: { opacity: 0, y: 16 }, on: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } } }}
          >
            <ThemeCard def={c} onOpen={onOpenTheme} />
          </motion.div>
        ))}
      </motion.div>

      {/* the structural break, stated rather than implied */}
      <motion.div
        className="mt-12 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <span className="label text-[10px] text-ink-mute">Enabling function</span>
        <span className="h-px flex-1 bg-ink-mute/20" />
      </motion.div>

      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <OEBand onOpen={onOpenTheme} />
      </motion.div>

      <footer className="mt-9 text-center text-[11px] text-ink-mute/80">
        Every figure on this page traces to a cell in the Q1 2026 workbook.
      </footer>
    </div>
  )
}

// The Executive screen moved to screens/Executive.tsx — the OBS-workbook dashboard.

// TODO: BDO content model — nav item and route exist; no KPIs invented.
export function Bdo() {
  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <AppHeader active="bdo" />
      <div className="mx-auto mt-16 flex max-w-[440px] flex-col items-center rounded-panel bg-card p-10 text-center shadow-(--shadow-card)">
        <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(3,70,56,0.08)' }}>
          <Handshake size={26} strokeWidth={1.5} className="text-sidra" />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold text-ink">Business Development Office</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          This view is reserved. Its indicators and content model have not been supplied yet, and nothing
          here is invented — the space stays empty until the data arrives.
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-[12px] italic text-ink-mute">
          <Spark size={11} /> BOTaina will read this section the day it has cells to read.
        </p>
      </div>
    </div>
  )
}

