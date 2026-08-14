/**
 * Thematic View — the platform's primary screen: header zone, the portfolio
 * brief, hero-plus-four theme cards, OE banner. Executive View — briefing-first.
 * BDO — designed empty state. (Home is parked: nav item disabled, no route —
 * see TODO in Shell.tsx.)
 */
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { AppHeader, Spark, HeaderCluster, GlobalSearch } from '../components/Shell'
import { PortfolioBrief } from '../components/PortfolioBrief'
import { buildCards, ThemeCard, OEBand } from '../components/ThemeCards'
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
        <div className="flex items-center justify-between gap-8">
          {/* clear space around the mark equals its height */}
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <GlobalSearch onPick={onEvidence} />
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
        <PortfolioBrief onEvidence={onEvidence} />
      </motion.div>

      {/* FIVE thematic areas, composed for five (R15). The hero spans two
          columns, so 3 columns resolve as hero+1 then 3, and 2 columns as a
          full-width hero then 2×2 — no empty cell at any width, and no sixth
          slot for anything to be filed into. Container-queried so the grid
          reflows when BOTaina's panel takes space. */}
      <motion.div
        className="mt-14 grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3"
        initial="off"
        animate="on"
        variants={{ on: { transition: { staggerChildren: 0.05 } } }}
      >
        {cards.map((c) => (
          <motion.div
            key={c.themeId}
            className={c.hero ? '@xl:col-span-2' : undefined}
            variants={{ off: { opacity: 0, y: 16 }, on: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } } }}
          >
            <ThemeCard def={c} onOpen={onOpenTheme} />
          </motion.div>
        ))}
      </motion.div>

      {/* the structural break, stated rather than implied */}
      <motion.div
        className="mt-14"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="mb-3 flex items-center gap-4">
          <span className="label shrink-0 text-ink-mute">Enabling function</span>
          <span aria-hidden className="h-px flex-1" style={{ background: 'rgba(18,40,34,0.14)' }} />
        </div>
        <OEBand onOpen={onOpenTheme} />
      </motion.div>

      <footer className="mt-9 text-center text-[11px] text-ink-mute/80">
        Every figure on this page traces to a cell in the Q1 2026 workbook.
      </footer>
    </div>
  )
}

export function Executive({ onEvidence }: { onEvidence: (kpi: Kpi) => void }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[900px] px-5 pb-36 md:px-8">
      <AppHeader />
      <Standing onEvidence={onEvidence} />
    </div>
  )
}

// TODO: BDO content model — nav item and route exist; no KPIs invented.
export function Bdo() {
  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <AppHeader />
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

