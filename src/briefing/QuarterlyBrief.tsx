/**
 * The Quarterly Brief — one screen, no scroll. BOTaina tells you the quarter.
 *
 * Top: her avatar and one greeting. Below: the quarter as a bento — the lead
 * number and the hero chart take the large cells, the other findings fill in
 * around them, each with a figure and a small mark. Tap any tile and she says
 * its line in the speech panel; the panel is where the telling happens.
 *
 * Release 1 only. No scroll at desktop; the grid reflows to a stack on narrow
 * screens, where scrolling is the honest fallback.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { buildQuarterlyBrief, markBriefRead, type Tile } from './quarterly'
import { BriefTrend, BriefFigures } from './briefCharts'
import { Spark } from '../components/Shell'
import { STATUS_COLOR } from '../components/charts/builders'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
const SIDRA = '#034638'
const MAROON = '#8a1538'

const VERDICT = {
  well: { dot: STATUS_COLOR.met.fill, word: 'went well', text: STATUS_COLOR.met.text },
  watch: { dot: MAROON, word: 'to watch', text: MAROON },
  note: { dot: '#7e938d', word: 'noted', text: '#47605a' },
} as const

export function QuarterlyBrief({
  onExit,
  onAskBotaina,
}: {
  onExit: () => void
  /** kept for the App contract; Release 1 tiles have no thematic KPI to open */
  onOpenKpi?: (kpi: Kpi) => void
  onAskBotaina: (q: string) => void
}) {
  const brief = useMemo(() => buildQuarterlyBrief(), [])
  const [active, setActive] = useState<Tile | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    markBriefRead()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (active ? setActive(null) : onExit())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit, active])

  const said = active?.says ?? brief.greeting

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-label="The Quarterly Brief"
    >
      {/* masthead */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/10 px-5 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-6 w-auto shrink-0" />
          <span className="truncate text-[12.5px] text-ink-soft">
            The Quarterly Brief <span className="text-ink-mute">· Executive View · {brief.dateLine}</span>
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-sidra"
        >
          Open dashboard <X size={14} strokeWidth={1.7} />
        </button>
      </div>

      {/* the screen: BOTaina's panel + the bento, sized to the viewport */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1320px] flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-y-auto px-5 py-4 md:gap-5 md:px-8 md:py-5 lg:overflow-hidden">
        {/* her line — the telling. Changes when a tile is tapped. */}
        <div
          className="flex items-start gap-4 rounded-card p-4 md:items-center md:p-5"
          style={{ background: 'var(--ai-wash-subtle)', boxShadow: 'inset 0 0 0 1px rgba(20,97,82,0.14)' }}
        >
          <span className="ai-ring block shrink-0 rounded-full p-[2px]">
            <span className="block h-12 w-12 overflow-hidden rounded-full bg-cream md:h-14 md:w-14">
              <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-tight" style={{ color: 'var(--ai-green-mid)' }}>
              <Spark size={11} /> BOTaina{active ? ` · ${active.label}` : ''}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={active?.id ?? 'greeting'}
                className="voice mt-1 max-w-[88ch] text-[15.5px] leading-snug text-ink md:text-[17px]"
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {said}
              </motion.p>
            </AnimatePresence>
            {active && (
              <div className="num mt-1.5 text-[11px] text-ink-mute">
                {active.source} · {active.trace}
              </div>
            )}
          </div>
          {active ? (
            <button
              onClick={() => setActive(null)}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] text-ink-mute transition-colors hover:text-sidra"
            >
              back
            </button>
          ) : (
            <button
              onClick={() => onAskBotaina(brief.ask.q)}
              className="hidden shrink-0 items-center gap-1.5 rounded-full py-2 pe-3.5 ps-3.5 text-[12.5px] font-semibold text-white md:flex"
              style={{ background: 'var(--ai-border-gradient)' }}
              title={`Put to ${brief.ask.owner}`}
            >
              Ask about March <ArrowRight size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* the bento — 6 columns × 2 rows at desktop */}
        <div className="grid min-h-0 grid-cols-2 gap-3 md:grid-cols-6 md:grid-rows-2 md:gap-4">
          <TileBox t={brief.lead} active={active} onPick={setActive} className="col-span-2 md:col-span-2 md:row-span-1" big />
          <TileBox t={brief.hero} active={active} onPick={setActive} className="col-span-2 md:col-span-4 md:row-span-1" hero />
          {brief.tiles.map((t) => (
            <TileBox
              key={t.id}
              t={t}
              active={active}
              onPick={setActive}
              className={t.id === 'unit-break' ? 'col-span-2 md:col-span-2' : 'col-span-1'}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function TileBox({
  t,
  active,
  onPick,
  className,
  big,
  hero,
}: {
  t: Tile
  active: Tile | null
  onPick: (t: Tile | null) => void
  className?: string
  big?: boolean
  hero?: boolean
}) {
  const on = active?.id === t.id
  const v = VERDICT[t.verdict]
  const hue = t.verdict === 'watch' ? MAROON : SIDRA
  return (
    <button
      onClick={() => onPick(on ? null : t)}
      aria-pressed={on}
      className={`group relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-card bg-card p-3.5 text-left transition-all duration-200 md:p-4 ${className ?? ''}`}
      style={{
        boxShadow: on ? `0 0 0 2px ${hue}, var(--shadow-card-hover)` : 'var(--shadow-card)',
        transform: on ? 'translateY(-1px)' : undefined,
      }}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: v.dot }} />
        <span style={{ color: v.text }}>{v.word}</span>
        <span className="truncate text-ink-mute">· {t.source.split(' · ')[0]}</span>
      </div>

      <div className={`mt-1.5 flex items-baseline gap-2 ${hero || big ? 'md:mt-2' : ''}`}>
        <span
          className={`num font-bold leading-none ${big ? 'text-[34px] md:text-[44px]' : hero ? 'text-[30px] md:text-[38px]' : 'text-[24px] md:text-[26px]'}`}
          style={{ color: t.verdict === 'watch' ? MAROON : SIDRA }}
        >
          {t.figure}
        </span>
      </div>
      <div className={`mt-0.5 leading-tight text-ink-soft ${hero || big ? 'text-[13px]' : 'text-[11.5px]'}`}>{t.label}</div>

      {/* the mark fills whatever height the row leaves — the tile is sized by
          the grid, and the chart stretches to it, so no tile carries dead space */}
      <div className="relative mt-2 min-h-[72px] flex-1">
        {t.mark.kind === 'trend' ? (
          <div className="absolute inset-0">
            <BriefTrend
              size={hero ? 'hero' : 'row'}
              height="100%"
              series={t.mark.series}
              hue={hue}
              target={t.mark.target}
              targetLabel={t.mark.targetLabel}
              unit={t.mark.unit}
              interpret={t.says}
              compact={!hero && !big}
            />
          </div>
        ) : t.mark.kind === 'figures' ? (
          <div className="text-[11px]">
            <BriefFigures cols={t.mark.cols} rows={t.mark.rows} flagCol={t.mark.flagCol} dense />
          </div>
        ) : null}
      </div>
    </button>
  )
}
