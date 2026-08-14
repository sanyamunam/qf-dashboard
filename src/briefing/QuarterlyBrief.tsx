/**
 * The Quarterly Brief — the flagship. One dated memo, read as a scroll:
 * masthead → hook → Across the Foundation (Release 1) → Across the themes
 * (Release 2) → the asks. The section rail is a navigation aid; the scroll is
 * the read. Every ask is a live control that opens BOTaina with the question.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, X, Copy, Check } from 'lucide-react'
import { buildQuarterlyBrief, markBriefRead, type QFinding } from './quarterly'
import { BriefVisual } from './visuals'
import { Spark } from '../components/Shell'
import { kpis } from '../model/data'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

const SECTIONS = [
  { id: 'qb-foundation', label: 'Foundation' },
  { id: 'qb-themes', label: 'Themes' },
  { id: 'qb-asks', label: 'The asks' },
] as const

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
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    markBriefRead()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  // the rail's sense of place: whichever section most recently crossed the
  // upper third of the viewport is "where you are"
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id)
      },
      { root, rootMargin: '-20% 0px -65% 0px' }
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
        {/* masthead — dated, authored, leavable; stays while you read */}
        <div className="sticky top-0 z-10 border-b border-ink-mute/10 bg-cream/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[860px] items-center justify-between px-6 py-3.5 md:px-8">
            <div className="flex items-center gap-3">
              <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-7 w-auto" />
              <span className="label text-ink-mute">The Quarterly Brief · {brief.dateLine}</span>
            </div>
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[12.5px] font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
            >
              Open dashboard <X size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[860px] px-6 pb-28 md:px-8">
          {/* the hook — no ceremony: the memo starts because you opened it */}
          <div className="pt-14 md:pt-20">
            <span className="ai-ring block w-fit rounded-full p-[3px]">
              <span className="block h-[74px] w-[74px] overflow-hidden rounded-full bg-cream">
                <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
              </span>
            </span>
            <h1 className="voice mt-7 max-w-[22ch] text-[36px] leading-[1.14] text-ink md:text-[46px]">
              {brief.hook.shape}
            </h1>
            <p className="voice mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">{brief.hook.line}</p>
          </div>

          {/* Across the Foundation — Release 1 leads, and says so */}
          <SectionHead
            id="qb-foundation"
            kicker="Across the Foundation"
            note="Release 1 · QF's executive indicators"
          />
          {brief.foundation.map((f, i) => (
            <FindingBlock key={f.id} f={f} first={i === 0} root={scrollRef} onOpenKpi={onOpenKpi} />
          ))}

          {/* Across the themes — Release 2 follows */}
          <SectionHead
            id="qb-themes"
            kicker="Across the themes"
            note="Release 2 · the five thematic areas"
          />
          {brief.themes.map((f, i) => (
            <FindingBlock key={f.id} f={f} first={i === 0} root={scrollRef} onOpenKpi={onOpenKpi} />
          ))}

          {/* the asks — each one a live control */}
          <SectionHead id="qb-asks" kicker="The asks" note="three questions worth raising · tap one to put it to BOTaina" />
          <Asks brief={brief} onAskBotaina={onAskBotaina} />

          <p className="voice mt-12 border-t border-ink-mute/15 pt-6 text-[14.5px] italic leading-relaxed text-ink-soft">
            {brief.accounting}
          </p>

          <button
            onClick={onExit}
            className="mt-8 flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--color-sidra)' }}
          >
            Open the dashboard <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* the rail — a sense of place, never the way you read */}
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            className="group flex items-center gap-2"
            aria-label={`Jump to ${s.label}`}
          >
            <span
              className={`text-[10.5px] tracking-[0.08em] transition-opacity ${activeSection === s.id ? 'text-sidra opacity-100' : 'text-ink-mute opacity-0 group-hover:opacity-100'}`}
            >
              {s.label.toUpperCase()}
            </span>
            <span
              className="h-2 w-2 rounded-full transition-all duration-300"
              style={{
                background: activeSection === s.id ? 'var(--color-sidra)' : 'rgba(18,40,34,0.2)',
                transform: activeSection === s.id ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function SectionHead({ id, kicker, note }: { id: string; kicker: string; note: string }) {
  return (
    <div id={id} className="mt-20 flex items-baseline gap-4 border-t-[1.5px] border-ink/70 pt-4" style={{ scrollMarginTop: 76 }}>
      <h2 className="label text-[12px] text-ink">{kicker}</h2>
      <span className="text-[11.5px] text-ink-mute">{note}</span>
    </div>
  )
}

function FindingBlock({
  f,
  first,
  root,
  onOpenKpi,
}: {
  f: QFinding
  first: boolean
  root: React.RefObject<HTMLDivElement | null>
  onOpenKpi: (kpi: Kpi) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3, root })
  const kpi = f.kpiId ? (kpis.find((k) => k.id === f.kpiId) ?? null) : null
  return (
    <motion.div
      ref={ref}
      className={first ? 'mt-10' : 'mt-16'}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="label text-[11px]" style={{ color: '#3c6a5f' }}>
        {f.kicker}
      </div>
      <h3 className="voice mt-2.5 max-w-[30ch] text-[24px] leading-[1.22] text-ink md:text-[29px]">{f.finding}</h3>
      <div className="mt-5">
        <BriefVisual spec={f.visual} active={inView} />
      </div>
      {kpi ? (
        <button
          onClick={() => onOpenKpi(kpi)}
          className="num mt-2 block text-left text-[12px] text-ink-mute underline decoration-dotted underline-offset-4 transition-colors hover:text-sidra"
        >
          {f.figures}
        </button>
      ) : (
        <p className="num mt-2 text-[12px] text-ink-mute">{f.figures}</p>
      )}
      <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">{f.read}</p>
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
  const text = brief.asks.map((a) => `• ${a.q} — ${a.owner}`).join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Al Mishkat — the asks, ${brief.dateLine}\n${text}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-8">
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
              <span className="voice block text-[16.5px] italic leading-snug text-ink">{a.q}</span>
              <span className="mt-1.5 block text-[12.5px] text-ink-mute">
                Put to: <span className="font-semibold text-ink-soft">{a.owner}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-sidra opacity-0 transition-opacity group-hover:opacity-100">
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
