/**
 * The Quarterly Brief — The Two Findings.
 *
 * Two full-bleed moments carry the whole screen: the largest movement in each
 * source, stated in one sentence with one chart big enough to read as an
 * image. Beneath each hero, a quiet ledger of that source's other findings —
 * a register, not a card grid. Then three asks, each line the control.
 *
 * Colour carries source: thematic hero and ledger marks take their theme's
 * fill; executive takes sidra. BOTaina appears three times — the meaning line
 * under each hero, and the sign-off — never as a greeting.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, X, Copy, Check } from 'lucide-react'
import { buildQuarterlyBrief, markBriefRead, themeColour, type QFinding, type QSource } from './quarterly'
import { BriefTrend, BriefLedger, BriefFigures } from './briefCharts'
import { Spark } from '../components/Shell'
import { kpis } from '../model/data'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
const SIDRA = '#034638'
const MAROON = '#8a1538'

export function QuarterlyBrief({
  onExit,
  onOpenKpi,
  onAskBotaina,
}: {
  onExit: () => void
  onOpenKpi: (kpi: Kpi) => void
  onAskBotaina: (q: string) => void
}) {
  const brief = useMemo(() => buildQuarterlyBrief(), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    markBriefRead()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-label="The Quarterly Brief"
    >
      <div ref={scrollRef} className="h-full overflow-y-auto">
        {/* masthead — plain, dated, leavable */}
        <div className="sticky top-0 z-10 border-b border-ink/10 bg-cream">
          <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-6 py-3.5 md:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-7 w-auto shrink-0" />
              <span className="truncate text-[12.5px] text-ink-soft">
                The Quarterly Brief <span className="text-ink-mute">· {brief.dateLine}</span>
              </span>
            </div>
            <button
              onClick={onExit}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-sidra"
            >
              Open dashboard <X size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[960px] px-6 pb-32 md:px-10">
          {brief.sources.map((s, i) => (
            <Source key={s.key} s={s} first={i === 0} root={scrollRef} onOpenKpi={onOpenKpi} />
          ))}

          <Asks brief={brief} onAskBotaina={onAskBotaina} />

          {/* the close — one accounting sentence, then BOTaina signs */}
          <div className="mt-24 max-w-[62ch]">
            <p className="text-[13.5px] leading-relaxed text-ink-mute">{brief.accounting}</p>
            <div className="mt-8 flex items-center gap-4">
              <span className="ai-ring block shrink-0 rounded-full p-[2px]">
                <span className="block h-11 w-11 overflow-hidden rounded-full bg-cream">
                  <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
                </span>
              </span>
              <p className="voice text-[17px] italic leading-snug text-ink">{brief.signoff}</p>
            </div>
            <button
              onClick={onExit}
              className="mt-10 flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
              style={{ background: SIDRA }}
            >
              Open the dashboard <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** One source: its hero moment, then its ledger. */
function Source({
  s,
  first,
  root,
  onOpenKpi,
}: {
  s: QSource
  first: boolean
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  return (
    <section aria-label={s.name} className={first ? 'pt-14 md:pt-24' : 'pt-28 md:pt-40'}>
      <Hero f={s.hero} sourceName={s.name} release={s.release} root={root} onOpenKpi={onOpenKpi} />
      <Ledger rows={s.ledger} root={root} onOpenKpi={onOpenKpi} />
    </section>
  )
}

/** The moment: one sentence, one image, one line of meaning. */
function Hero({
  f,
  sourceName,
  release,
  root,
  onOpenKpi,
}: {
  f: QFinding
  sourceName: string
  release: string
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2, root })
  const reduced = useReducedMotion()
  const hue = themeColour(f.themeId)
  const kpi = f.kpiId ? (kpis.find((k) => k.id === f.kpiId) ?? null) : null

  return (
    <div ref={ref}>
      <div className="flex items-baseline gap-3 text-[12px]">
        <span className="font-semibold tracking-tight text-ink">{sourceName}</span>
        <span className="text-ink-mute">{release}</span>
      </div>

      <motion.h2
        className="voice mt-6 max-w-[18ch] text-[38px] leading-[1.06] tracking-[-0.01em] text-ink md:text-[54px]"
        style={{ textWrap: 'balance' }}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {f.finding}
      </motion.h2>

      <div className="mt-10">
        {inView && f.mark.kind === 'trend' && (
          <BriefTrend
            size="hero"
            series={f.mark.series}
            hue={hue}
            target={f.mark.target}
            targetLabel={f.mark.targetLabel}
            unit={f.mark.unit}
            interpret={f.means}
          />
        )}
      </div>

      <Trace f={f} kpi={kpi} onOpenKpi={onOpenKpi} className="mt-3" />

      <motion.p
        className="voice mt-7 max-w-[46ch] text-[19px] italic leading-snug text-ink md:text-[21px]"
        initial={reduced ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
      >
        {f.means}
        <span className="not-italic text-ink-mute"> — BOTaina</span>
      </motion.p>
    </div>
  )
}

/** The register: verdict, sentence, small mark. No cards. */
function Ledger({
  rows,
  root,
  onOpenKpi,
}: {
  rows: QFinding[]
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  return (
    <div className="mt-20 md:mt-24">
      {rows.map((f, i) => (
        <LedgerRow key={f.id} f={f} index={i} root={root} onOpenKpi={onOpenKpi} />
      ))}
    </div>
  )
}

function LedgerRow({
  f,
  index,
  root,
  onOpenKpi,
}: {
  f: QFinding
  index: number
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3, root })
  const reduced = useReducedMotion()
  const hue = themeColour(f.themeId)
  const kpi = f.kpiId ? (kpis.find((k) => k.id === f.kpiId) ?? null) : null
  const well = f.verdict === 'well'

  return (
    <motion.div
      ref={ref}
      className="grid gap-x-10 gap-y-5 border-t border-ink/10 py-8 md:grid-cols-[minmax(0,1fr)_300px] md:items-start"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.04 * index, ease: EASE }}
    >
      <div className="min-w-0">
        {/* the verdict: a glyph and a word — never a section header */}
        <div className="flex items-center gap-2 text-[11.5px] font-medium">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={well ? { background: SIDRA } : { border: `1.5px solid ${MAROON}` }}
          />
          <span style={{ color: well ? SIDRA : MAROON }}>{well ? 'went well' : 'to watch'}</span>
          <span className="text-ink-mute">· {f.source}</span>
        </div>
        <h3 className="voice mt-2.5 max-w-[34ch] text-[21px] leading-[1.25] text-ink md:text-[23px]">{f.finding}</h3>
        <p className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-ink-soft">{f.means}</p>
        <Trace f={f} kpi={kpi} onOpenKpi={onOpenKpi} className="mt-2.5" />
      </div>

      <div className="min-w-0 md:pt-1">
        {inView &&
          (f.mark.kind === 'trend' ? (
            <BriefTrend
              size="row"
              height={132}
              series={f.mark.series}
              hue={hue}
              target={f.mark.target}
              targetLabel={f.mark.targetLabel}
              unit={f.mark.unit}
              interpret={f.means}
            />
          ) : f.mark.kind === 'ledger' ? (
            <BriefLedger rows={f.mark.rows} hue={hue} />
          ) : (
            <BriefFigures cols={f.mark.cols} rows={f.mark.rows} flagCol={f.mark.flagCol} />
          ))}
      </div>
    </motion.div>
  )
}

function Trace({
  f,
  kpi,
  onOpenKpi,
  className,
}: {
  f: QFinding
  kpi: Kpi | null
  onOpenKpi: (kpi: Kpi) => void
  className?: string
}) {
  const cls = `num block max-w-[70ch] text-left text-[11px] leading-relaxed text-ink-mute ${className ?? ''}`
  return kpi ? (
    <button onClick={() => onOpenKpi(kpi)} className={`${cls} underline decoration-dotted underline-offset-4 transition-colors hover:text-sidra`}>
      {f.trace}
    </button>
  ) : (
    <p className={cls}>{f.trace}</p>
  )
}

/** Three asks. Each line is the control — tap it and BOTaina has the question. */
function Asks({
  brief,
  onAskBotaina,
}: {
  brief: ReturnType<typeof buildQuarterlyBrief>
  onAskBotaina: (q: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Al Mishkat — the asks, ${brief.dateLine}\n${brief.asks.map((a) => `• ${a.q} — ${a.owner}`).join('\n')}`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section aria-label="The asks" className="pt-28 md:pt-40">
      <h2 className="voice text-[34px] leading-none tracking-[-0.01em] text-ink md:text-[42px]">Three things to ask.</h2>
      <p className="mt-3 text-[13px] text-ink-mute">Tap one and BOTaina has it ready.</p>

      <div className="mt-8">
        {brief.asks.map((a, i) => (
          <button
            key={a.q}
            onClick={() => onAskBotaina(a.q)}
            className="group grid w-full gap-x-6 gap-y-1 border-t border-ink/10 py-6 text-left transition-colors last:border-b md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          >
            <span className="min-w-0">
              <span className="voice block max-w-[52ch] text-[19px] leading-snug text-ink transition-colors group-hover:text-sidra md:text-[21px]">
                {a.q}
              </span>
              <span className="mt-1.5 block text-[12.5px] text-ink-mute">
                For <span className="font-medium text-ink-soft">{a.owner}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-sidra opacity-60 transition-opacity group-hover:opacity-100">
              <Spark size={11} /> Ask BOTaina
              <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <span className="sr-only">{`ask ${i + 1} of ${brief.asks.length}`}</span>
          </button>
        ))}
      </div>

      <button
        onClick={copy}
        className="mt-5 flex items-center gap-2 text-[13px] font-medium text-ink-soft transition-colors hover:text-sidra"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy the three'}
      </button>
    </section>
  )
}
