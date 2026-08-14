/**
 * The Executive Briefing — the platform's front door. A paced sequence:
 * greeting (shape first), five items at most, one idea per screen, a distinct
 * close that gathers the asks. The reader holds the clicker; the dashboard is
 * always one tap away. Rationale: docs/briefing-plan.md
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, Copy, Check } from 'lucide-react'
import { generateBrief, recordBriefRead, type Persona, loadMemory, saveMemory, type Brief } from './engine'
import { BriefVisual } from './visuals'
import { Spark } from '../components/Shell'
import { kpis } from '../model/data'
import { THEMES } from '../model/data'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

export function Briefing({
  onExit,
  onOpenKpi,
  onAskBotaina,
}: {
  onExit: () => void
  onOpenKpi: (kpi: Kpi) => void
  onAskBotaina: (q: string) => void
}) {
  const [persona, setPersona] = useState<Persona>(() => loadMemory().persona)
  // one brief per visit: persona swaps the prose, never the structure
  const brief = useMemo(() => generateBrief(), [])
  // step -1 = greeting · 0..n-1 = items · n = close
  const [step, setStep] = useState(-1)
  const last = brief.items.length // index of the close

  useEffect(() => {
    recordBriefRead(brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if ((e.key === 'ArrowRight' || e.key === ' ') && step < last) {
        e.preventDefault()
        setStep((s) => Math.min(last, s + 1))
      }
      if (e.key === 'ArrowLeft' && step > -1) setStep((s) => Math.max(-1, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, last, onExit])

  const choosePersona = (p: Persona) => {
    setPersona(p)
    const m = loadMemory()
    m.persona = p
    saveMemory(m)
  }

  const themeName = (id: string) => THEMES.find((t) => t.id === id)?.name ?? id

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-label="Executive briefing"
    >
      {/* masthead: dated, authored, leavable */}
      <div className="flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-8 w-auto" />
          <span className="label text-ink-mute">The brief · {brief.dateLine}</span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[12.5px] font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
        >
          Open dashboard <X size={14} strokeWidth={1.7} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {step === -1 && (
            <Screen key="greet">
              <div className="flex flex-col items-center text-center">
                <span className="ai-ring block rounded-full p-[3px]">
                  <span className="block h-[110px] w-[110px] overflow-hidden rounded-full bg-cream">
                    <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
                  </span>
                </span>
                <p className="voice mt-7 text-[22px] text-ink-soft">
                  {brief.greeting}, {persona === 'hh' ? 'Your Highness' : 'Excellency'}. I'm BOTaina — I've read
                  the quarter.
                </p>
                <h1 className="voice mt-3 max-w-[24ch] text-[40px] leading-[1.15] text-ink md:text-[48px]">
                  {brief.shapeLine}
                </h1>
                {brief.continuity && (
                  <p className="mt-4 flex items-center gap-2 text-[14px] italic text-sidra">
                    <Spark size={12} /> {brief.continuity}
                  </p>
                )}
                {brief.quiet ? (
                  <p className="voice mt-6 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft">{brief.quietLine}</p>
                ) : null}
                <div className="mt-9 flex items-center gap-3">
                  {!brief.quiet && (
                    <button
                      onClick={() => setStep(0)}
                      className="flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
                      style={{ background: 'var(--ai-border-gradient)' }}
                    >
                      Begin <ArrowRight size={16} strokeWidth={2} />
                    </button>
                  )}
                  <button onClick={onExit} className="rounded-full px-5 py-3 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-sidra">
                    {brief.quiet ? 'Open dashboard' : 'Skip to dashboard'}
                  </button>
                </div>
                <div className="mt-10 flex items-center gap-2 text-[11.5px] text-ink-mute">
                  Reading as
                  {(['hh', 'ceo'] as Persona[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => choosePersona(p)}
                      className="rounded-full px-3 py-1 font-medium transition-colors"
                      style={
                        persona === p
                          ? { background: 'var(--color-sidra)', color: '#fff' }
                          : { background: 'var(--color-card)', color: 'var(--color-ink-soft)' }
                      }
                    >
                      {p === 'hh' ? 'Chairperson' : 'Chief Executive'}
                    </button>
                  ))}
                </div>
              </div>
            </Screen>
          )}

          {step >= 0 && step < last && (
            <Screen key={brief.items[step].id}>
              <ItemScreen
                item={brief.items[step]}
                idx={step}
                total={brief.items.length}
                persona={persona}
                themeName={themeName}
                onOpenKpi={onOpenKpi}
                onAskBotaina={onAskBotaina}
              />
            </Screen>
          )}

          {step === last && !brief.quiet && (
            <Screen key="close">
              <CloseScreen brief={brief} persona={persona} onExit={onExit} onAskBotaina={onAskBotaina} />
            </Screen>
          )}
        </AnimatePresence>

        {/* pacing controls */}
        {step > -1 && (
          <button
            onClick={() => setStep((s) => Math.max(-1, s - 1))}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-card p-2.5 text-ink-mute shadow-(--shadow-card) transition-colors hover:text-sidra md:block"
            aria-label="Previous"
          >
            <ArrowLeft size={17} strokeWidth={1.7} />
          </button>
        )}
        {step < last && step > -1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full p-2.5 text-white shadow-(--shadow-card-hover) transition-transform hover:scale-105 md:block"
            style={{ background: 'var(--color-sidra)' }}
            aria-label="Next"
          >
            <ArrowRight size={17} strokeWidth={1.7} />
          </button>
        )}
      </div>

      {/* the rail: the end is always in sight */}
      {!brief.quiet && (
        <div className="flex items-center justify-center gap-2 pb-5 pt-2">
          {[-1, ...brief.items.map((_, i) => i), last].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              aria-label={s === -1 ? 'Opening' : s === last ? 'The asks' : `Item ${s + 1}`}
              className="h-[5px] rounded-full transition-all duration-300"
              style={{
                width: s === step ? 26 : 10,
                background: s === step ? 'var(--color-sidra)' : s < step ? 'rgba(3,70,56,0.4)' : 'rgba(18,40,34,0.14)',
              }}
            />
          ))}
          <span className="ms-3 text-[11px] text-ink-mute">
            {step === -1 ? 'start' : step === last ? 'the asks' : `${step + 1} of ${brief.items.length}`}
          </span>
        </div>
      )}
    </motion.div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-y-auto px-6 py-4 md:px-16"
      initial={{ opacity: 0, x: 42 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -42 }}
      transition={{ duration: 0.38, ease: EASE }}
    >
      <div className="w-full max-w-[860px]">{children}</div>
    </motion.div>
  )
}

function ItemScreen({
  item,
  idx,
  total,
  persona,
  themeName,
  onOpenKpi,
  onAskBotaina,
}: {
  item: ReturnType<typeof generateBrief>['items'][number]
  idx: number
  total: number
  persona: Persona
  themeName: (id: string) => string
  onOpenKpi: (kpi: Kpi) => void
  onAskBotaina: (q: string) => void
}) {
  const kpi = kpis.find((k) => k.id === item.kpiId) ?? null
  const ask = item.ask[persona]
  return (
    <div>
      <div className="label" style={{ color: item.needsYou ? '#8a1538' : '#3c6a5f' }}>
        {item.kindLabel} · {idx + 1} of {total}
      </div>
      <h2 className="voice mt-3 text-[30px] leading-[1.18] text-ink md:text-[38px]">{item.finding}</h2>

      <div className="mt-7">
        <BriefVisual spec={item.visual} active />
      </div>

      <button
        onClick={() => kpi && onOpenKpi(kpi)}
        className="num mt-3 block text-[12px] text-ink-mute underline decoration-dotted underline-offset-4 transition-colors hover:text-sidra"
      >
        {item.figures}
      </button>

      <p className="mt-5 max-w-[72ch] text-[15px] leading-relaxed text-ink-soft">{item.why[persona]}</p>

      <p className="voice mt-4 text-[16px] italic text-sidra">
        {ask.q} <span className="not-italic text-[13px] text-ink-mute">— {ask.owner}</span>
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px]">
        <button
          onClick={() => onAskBotaina(`Tell me more: ${item.finding}`)}
          className="flex items-center gap-2 rounded-full py-1 pe-3.5 ps-1 font-medium text-white transition-transform hover:scale-[1.03]"
          style={{ background: 'var(--ai-border-gradient)' }}
        >
          <span className="block h-6 w-6 overflow-hidden rounded-full bg-cream">
            <img src="/botaina.gif" alt="" className="h-full w-full object-cover" />
          </span>
          Ask BOTaina about this
        </button>
        <button
          onClick={() => kpi && onOpenKpi(kpi)}
          className="rounded-full bg-card px-4 py-2 font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
        >
          Open in {themeName(item.themeId)} →
        </button>
      </div>
    </div>
  )
}

function CloseScreen({
  brief,
  persona,
  onExit,
  onAskBotaina,
}: {
  brief: Brief
  persona: Persona
  onExit: () => void
  onAskBotaina: (q: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const asks = brief.items.filter((i) => i.needsYou).slice(0, 3)
  const text = asks.map((i) => `• ${i.ask[persona].q} — ${i.ask[persona].owner}`).join('\n')

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
    <div>
      <div className="label text-sidra">The asks</div>
      <h2 className="voice mt-3 text-[32px] leading-tight text-ink md:text-[38px]">
        {asks.length === 1 ? 'One question worth raising.' : `${['', 'One', 'Two', 'Three'][asks.length]} questions worth raising.`}
      </h2>
      <div className="mt-7 flex flex-col gap-4">
        {asks.map((i) => (
          <div key={i.id} className="rounded-card bg-card p-5 shadow-(--shadow-card)">
            <p className="voice text-[17px] italic leading-snug text-ink">{i.ask[persona].q}</p>
            <p className="mt-2 text-[12.5px] text-ink-mute">
              Put to: <span className="font-semibold text-ink-soft">{i.ask[persona].owner}</span> · from "{i.kindLabel}"
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={copy}
          className="flex items-center gap-2 rounded-full bg-sidra px-4 py-2 text-[13px] font-medium text-white transition-transform hover:scale-[1.02]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy the asks'}
        </button>
        <button
          onClick={() => onAskBotaina('Draft these asks as a note to the directors')}
          className="rounded-full bg-card px-4 py-2 text-[13px] font-medium text-ink-soft shadow-(--shadow-card) transition-colors hover:text-sidra"
        >
          Have BOTaina draft the note
        </button>
      </div>
      <p className="voice mt-8 border-t border-ink-mute/15 pt-5 text-[14.5px] italic leading-relaxed text-ink-soft">
        {brief.accounting}
      </p>
      <button
        onClick={onExit}
        className="mt-6 flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
        style={{ background: 'var(--color-sidra)' }}
      >
        Open the dashboard <ArrowRight size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
