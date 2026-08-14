/**
 * The Quarterly Brief — the flagship. One continuous scroll, never a slideshow:
 * masthead → hook → Executive View (01 well, 02 watch) → Thematic areas
 * (03 well, 04 watch) → the asks.
 *
 * Colour carries the source. Thematic findings take their own theme's colour —
 * spine, kicker and chart hue — so the colour alone says which theme a finding
 * belongs to. Executive View findings take none, so the two halves of the brief
 * are told apart by colour behaviour before a word is read.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, X, Copy, Check } from 'lucide-react'
import {
  buildQuarterlyBrief,
  markBriefRead,
  themeColour,
  type QFinding,
  type QMovement,
  type QBlock,
} from './quarterly'
import { BriefTrend, BriefLedger, BriefFigures } from './briefCharts'
import { Spark } from '../components/Shell'
import { kpis } from '../model/data'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
const SIDRA = '#034638'

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
  const [active, setActive] = useState('')

  const stops = [
    { id: 'qb-exec', label: 'Executive View' },
    { id: 'qb-thematic', label: 'Thematic areas' },
    { id: 'qb-asks', label: 'The asks' },
  ]

  useEffect(() => {
    markBriefRead()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { root, rootMargin: '-15% 0px -70% 0px' },
    )
    stops.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <div className="sticky top-0 z-10 border-b border-ink-mute/10 bg-cream/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-6 py-3.5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-7 w-auto shrink-0" />
              <span className="label truncate text-ink-mute">The Quarterly Brief · {brief.dateLine}</span>
            </div>
            <button
              onClick={onExit}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[12.5px] font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
            >
              Open dashboard <X size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[880px] px-6 pb-28 md:px-8">
          {/* the hook — the memo starts because you opened it */}
          <div className="pt-14 md:pt-20">
            <span className="ai-ring block w-fit rounded-full p-[3px]">
              <span className="block h-[72px] w-[72px] overflow-hidden rounded-full bg-cream">
                <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
              </span>
            </span>
            <h1 className="voice mt-7 max-w-[20ch] text-[36px] leading-[1.12] text-ink md:text-[47px]">
              {brief.hook.shape}
            </h1>
            <p className="voice mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-soft">{brief.hook.line}</p>
          </div>

          {brief.movements.map((m) => (
            <Movement key={m.key} m={m} root={scrollRef} onOpenKpi={onOpenKpi} />
          ))}

          {/* the asks — each one a live control */}
          <div id="qb-asks" className="mt-24" style={{ scrollMarginTop: 76 }}>
            <div className="flex items-baseline gap-4 border-t-[2px] border-ink pt-4">
              <h2 className="text-[19px] font-semibold tracking-tight text-ink">The asks</h2>
              <span className="text-[11.5px] text-ink-mute">three questions worth raising · tap one to put it to BOTaina</span>
            </div>
            <Asks brief={brief} onAskBotaina={onAskBotaina} />
          </div>

          <p className="voice mt-14 border-t border-ink-mute/15 pt-6 text-[14px] italic leading-relaxed text-ink-soft">
            {brief.accounting}
          </p>

          <button
            onClick={onExit}
            className="mt-8 flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: SIDRA }}
          >
            Open the dashboard <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* a sense of place — never the way you read */}
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex">
        {stops.map((s) => (
          <button
            key={s.id}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="group flex items-center gap-2"
            aria-label={`Jump to ${s.label}`}
          >
            <span
              className={`text-[10.5px] tracking-[0.08em] transition-opacity ${active === s.id ? 'text-sidra opacity-100' : 'text-ink-mute opacity-0 group-hover:opacity-100'}`}
            >
              {s.label.toUpperCase()}
            </span>
            <span
              className="h-2 w-2 rounded-full transition-all duration-300"
              style={{
                background: active === s.id ? SIDRA : 'rgba(18,40,34,0.2)',
                transform: active === s.id ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/** One half of the brief: its name, its source, and its two blocks. */
function Movement({
  m,
  root,
  onOpenKpi,
}: {
  m: QMovement
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  return (
    <section id={`qb-${m.key}`} className="mt-24" style={{ scrollMarginTop: 76 }}>
      <div className="border-t-[2px] border-ink pt-4">
        <h2 className="text-[19px] font-semibold tracking-tight text-ink">{m.name}</h2>
        <p className="mt-1 text-[12px] text-ink-mute">{m.source}</p>
      </div>
      {m.blocks.map((b) => (
        <Block key={b.n} b={b} root={root} onOpenKpi={onOpenKpi} />
      ))}
    </section>
  )
}

function Block({
  b,
  root,
  onOpenKpi,
}: {
  b: QBlock
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  return (
    <div className="mt-12">
      <div className="flex items-baseline gap-3">
        <span className="num text-[13px] font-bold text-ink-mute/60">{b.n}</span>
        <h3 className="label text-[12px] text-ink">{b.title}</h3>
        <span className="h-px flex-1 bg-ink-mute/20" />
      </div>
      {b.findings.map((f) => (
        <Finding key={f.id} f={f} root={root} onOpenKpi={onOpenKpi} />
      ))}
    </div>
  )
}

function Finding({
  f,
  root,
  onOpenKpi,
}: {
  f: QFinding
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25, root })
  const hue = themeColour(f.themeId)
  const themed = Boolean(f.themeId)
  const kpi = f.kpiId ? (kpis.find((k) => k.id === f.kpiId) ?? null) : null

  return (
    <motion.div
      ref={ref}
      className="mt-9"
      style={themed ? { borderLeft: `3px solid ${hue}`, paddingLeft: 20 } : { paddingLeft: 23 }}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="label text-[10.5px]" style={{ color: themed ? hue : '#7e938d' }}>
        {f.source}
      </div>
      <h4 className="voice mt-2 max-w-[34ch] text-[22px] leading-[1.24] text-ink md:text-[26px]">{f.finding}</h4>

      <div className="mt-5 max-w-[620px]">
        {inView &&
          (f.mark.kind === 'trend' ? (
            <BriefTrend
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

      {kpi ? (
        <button
          onClick={() => onOpenKpi(kpi)}
          className="num mt-3 block max-w-[68ch] text-left text-[11.5px] leading-relaxed text-ink-mute underline decoration-dotted underline-offset-4 transition-colors hover:text-sidra"
        >
          {f.trace}
        </button>
      ) : (
        <p className="num mt-3 max-w-[68ch] text-[11.5px] leading-relaxed text-ink-mute">{f.trace}</p>
      )}
      <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-ink-soft">{f.means}</p>
    </motion.div>
  )
}

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
    <div className="mt-7">
      <div className="flex flex-col gap-4">
        {brief.asks.map((a) => (
          <button
            key={a.q}
            onClick={() => onAskBotaina(a.q)}
            className="group flex items-center gap-4 rounded-card bg-card p-5 text-left shadow-(--shadow-card) transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
          >
            <span className="ai-ring block shrink-0 rounded-full p-[2px]">
              <span className="block h-9 w-9 overflow-hidden rounded-full bg-cream">
                <img src="/botaina.gif" alt="" className="h-full w-full object-cover" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="voice block text-[16px] italic leading-snug text-ink">{a.q}</span>
              <span className="mt-1.5 block text-[12.5px] text-ink-mute">
                Put to: <span className="font-semibold text-ink-soft">{a.owner}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-sidra opacity-0 transition-opacity group-hover:opacity-100 max-md:hidden">
              <Spark size={11} /> Ask BOTaina <ArrowRight size={13} strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={copy}
          className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy the asks'}
        </button>
        <button
          onClick={() => onAskBotaina('Draft these three asks as a note to the directors')}
          className="flex items-center gap-2 rounded-full py-1.5 pe-4 ps-1.5 text-[13px] font-medium text-white transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--ai-border-gradient)' }}
        >
          <span className="block h-6 w-6 overflow-hidden rounded-full bg-cream">
            <img src="/botaina.gif" alt="" className="h-full w-full object-cover" />
          </span>
          Have BOTaina draft the note
        </button>
      </div>
    </div>
  )
}
