/**
 * BOTaina — floating presence, bottom-right, above the nav pill.
 * The launcher runs the supplied GIF inside an --ai-gradient ring; the panel
 * is glass. She greets by name once, answers from cells, renders a live chart
 * in-panel, and on "Take me to Social Progress" she navigates and points.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { EChart, AXIS } from './charts/EChart'
import { facts, fmt } from '../model/facts'
import { kpis } from '../model/data'
import { stoppedReporting } from '../model/spotlight'
import { recordAskTopic } from '../briefing/engine'
import { Spark } from './Shell'

const GREETED_KEY = 'almishkat.botaina.greeted.v2'

interface Msg {
  role: 'bot' | 'user'
  text?: string
  chart?: boolean
  followups?: string[]
}

function wishAnswer(): Msg {
  const w = facts.wish
  const s = w.series
  return {
    role: 'bot',
    text: `WISH's programme reach has fallen in each of the last three reported years — ${fmt(s[1]?.[1])} in 2023, then ${fmt(s[2]?.[1])}, then ${fmt(s[3]?.[1])}, and ${fmt(w.q1)} this quarter against a ${fmt(w.target26)} target. Its media mentions are also at zero this quarter after 700-plus in 2022. Its research and partnership figures are holding. The pattern looks like a change in delivery model rather than a decline across the board. Worth asking the WISH CEO whether the programme shifted to fewer, more targeted convenings.`,
    followups: ['Show me the trend', 'Which other entities stopped reporting?', 'Take me to Social Progress'],
  }
}

function stoppedAnswer(): Msg {
  const st = stoppedReporting()
  const lines = st
    .map((s) => `${s.entity} (${s.kpis.map((k) => k.name.toLowerCase()).slice(0, 3).join(', ')})`)
    .join('; ')
  return {
    role: 'bot',
    text: `${st.length} entities show continuous indicators at zero this quarter that were active in prior years: ${lines}. A Q1 zero on a cumulative count can mean "nothing yet" rather than "stopped" — which is exactly why it is worth confirming the figures are still being collected.`,
    followups: ['What happened at WISH?', 'Take me to Social Progress'],
  }
}

function gapAnswer(): Msg {
  const gaps = kpis
    .filter(
      (k) =>
        k.cadence === 'continuous' &&
        k.polarity === 'Green' &&
        (k.targets['2026'].value ?? 0) > 0 &&
        k.actuals['2026Q1'].value !== null,
    )
    .map((k) => ({ k, r: (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
  const lines = gaps
    .map(({ k }) => `${k.entity}'s ${k.name} (${fmt(k.actuals['2026Q1'].value)} of ${fmt(k.targets['2026'].value)})`)
    .join(', ')
  return {
    role: 'bot',
    text: `Measured against full-year 2026 commitments, the widest gaps after one quarter are ${lines}. One quarter of twelve months has elapsed, so distance is expected — the one with three years of decline behind it is WISH's beneficiaries, and that is the gap I would treat as real.`,
    followups: ['What happened at WISH?', 'Show me the trend'],
  }
}

function targetsAnswer(): Msg {
  const exact = kpis.filter((k) => k.exactHit)
  return {
    role: 'bot',
    text: `${exact.length} indicators sit exactly on their full-year 2026 target after one quarter — WISE's Edtech testbeds at 9 of 9 and 7 of 7, and WISH's LinkedIn engagement at 7,000 of 7,000 among them. Landing precisely on an annual number in March is a property of the target, not the work. I would ask who set the 2026 numbers and against what baseline.`,
    followups: ['Which entities stopped reporting this quarter?'],
  }
}

function route(q: string): Msg {
  const s = q.toLowerCase()
  if (s.includes('draft') && s.includes('ask')) {
    return {
      role: 'bot',
      text: `A draft, in your voice: "Three questions from this quarter's brief. To Strategy and Performance: who set the 2026 numbers, and which of the 35 already-met targets should be re-based now? To the WISH CEO: what changed in the delivery model after 2023, and is 5,000 still the right promise? To each entity's reporting lead: which of the six Q1 zeros are late submissions, and which are real stops?" Copy it from the brief's closing screen, or tell me who it should go to first.`,
      followups: ['What happened at WISH?', 'Which 2026 targets look wrong?'],
    }
  }
  if (s.includes('wish')) return wishAnswer()
  if (s.includes('stopped') || s.includes('quiet')) return stoppedAnswer()
  if (s.includes('gap')) return gapAnswer()
  if (s.includes('target') || s.includes('exactly')) return targetsAnswer()
  return {
    role: 'bot',
    text: `I can read the 151 indicators, their targets and their history, and I won't guess past them. Try one of the questions below, or ask about an entity by name.`,
    followups: ['What happened at WISH?', 'Which entities stopped reporting this quarter?', "Which 2026 targets look wrong?"],
  }
}

const SEEDS = [
  'Which entities stopped reporting this quarter?',
  "What's the largest gap to target?",
  'Which 2026 targets look wrong?',
]

/**
 * Streams her answer word by word on a duration budget rather than a fixed
 * characters-per-second rate, so a long insight resolves nearly as fast as a
 * short greeting instead of taking proportionally longer. Whole tokens land at
 * once — "QAR 27.4m" and "23,150" never trickle in digit by digit — and the
 * reveal is driven by rAF, so there is no interval jitter.
 */
// Tuning: raise PER_CHAR to slow her down, lower it to speed her up.
// At these values a short line takes ~0.55s, the greeting ~1.4s, and the
// longest insight ~3.0s — comfortably ahead of reading speed, still visibly
// composing rather than appearing all at once.
const STREAM_BASE_MS = 420 // a short line still visibly streams
const STREAM_PER_CHAR = 5.6
const STREAM_MAX_MS = 3200 // the longest insight is never a wait

function Stream({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0)
  const done = n >= text.length
  useEffect(() => {
    if (done) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // reveal boundaries: the end of each word (with its trailing space)
  const stops = useMemo(() => {
    const out: number[] = []
    const re = /\S+\s*/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) out.push(m.index + m[0].length)
    return out
  }, [text])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // rAF is starved while the page is hidden, so an unattended tab would leave
    // her answer blank and `busy` stuck — show it whole instead of animating
    // something nobody is watching.
    if (reduced || document.hidden) {
      setN(text.length)
      return
    }
    setN(0)
    const dur = Math.min(STREAM_MAX_MS, STREAM_BASE_MS + text.length * STREAM_PER_CHAR)
    const t0 = performance.now()
    let raf = 0
    let i = 0 // only ever advances — no per-frame rescan
    const finish = () => setN(text.length)
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      if (p >= 1) {
        finish()
        return
      }
      const target = p * text.length
      while (i < stops.length && stops[i] <= target) i++
      setN(i > 0 ? stops[i - 1] : 0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // belt and braces: if frames stop arriving (backgrounded, throttled), the
    // answer still resolves rather than hanging
    const safety = setTimeout(finish, dur + 400)
    document.addEventListener('visibilitychange', finish)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(safety)
      document.removeEventListener('visibilitychange', finish)
    }
  }, [text, stops])

  return <>{text.slice(0, n)}</>
}

function WishTrendChart() {
  const s = facts.wish.series
  return (
    <EChart
      height={170}
      option={{
        grid: { left: 44, right: 14, top: 18, bottom: 24 },
        xAxis: { type: 'category', data: s.map(([y]) => (y === '2026Q1' ? 'Q1 26' : y)), ...AXIS },
        yAxis: { type: 'value', min: 0, ...AXIS },
        series: [
          {
            type: 'line',
            data: s.map(([, v]) => v),
            lineStyle: { width: 2.4, color: '#034638' },
            itemStyle: { color: '#034638' },
            areaStyle: { color: 'rgba(80,226,195,0.18)' },
            symbolSize: 7,
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { type: 'dashed', color: '#9ca3af', width: 1.2 },
              label: { formatter: 'target 5,000', color: '#9ca3af', fontSize: 10 },
              data: [{ yAxis: facts.wish.target26 ?? 0 }],
            },
          },
        ],
      }}
    />
  )
}

export function BotainaDock({
  onNavigatePoint,
  open,
  setOpen,
  width,
  setWidth,
}: {
  onNavigatePoint: () => void
  open: boolean
  setOpen: (b: boolean) => void
  width: number
  setWidth: (w: number) => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // she greets by name once, then never unprompted
  useEffect(() => {
    if (localStorage.getItem(GREETED_KEY)) return
    const t = setTimeout(() => {
      localStorage.setItem(GREETED_KEY, '1')
      setOpen(true)
      setMsgs([
        {
          role: 'bot',
          text: `Good morning. I'm BOTaina. ${stoppedReporting().length} entities have stopped reporting activity they used to report — that's the thread I'd pull first. Shall I show you, or would you like the full picture?`,
          followups: ['Show me', 'The full picture'],
        },
      ])
      setBusy(true)
    }, 2800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  // external surfaces (the AI summary's CTA) can open her pre-seeded
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail
      setOpen(true)
      setTimeout(() => ask(q), 350)
    }
    window.addEventListener('botaina-ask', onAsk)
    return () => window.removeEventListener('botaina-ask', onAsk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  const ask = (q: string) => {
    if (!q.trim() || busy) return
    recordAskTopic(q)
    if (q === 'Take me to Social Progress') {
      setOpen(false)
      onNavigatePoint()
      return
    }
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    setTimeout(() => {
      let reply: Msg
      if (q === 'Show me the trend') reply = { role: 'bot', chart: true, followups: ['Take me to Social Progress', 'Which other entities stopped reporting?'] }
      else if (q === 'Show me') reply = wishAnswer()
      else if (q === 'The full picture') reply = stoppedAnswer()
      else if (q === 'Which other entities stopped reporting?') reply = stoppedAnswer()
      else reply = route(q)
      setMsgs((m) => [...m, reply])
      if (reply.chart) setBusy(false)
      // short enough that the ring drift reads as part of the same motion as the
      // streaming that follows, rather than a wait stacked in front of it
    }, 260)
  }

  const last = msgs[msgs.length - 1]

  // drag the panel's left edge to resize (desktop)
  const onDragStart = (e: React.PointerEvent) => {
    dragging.current = true
    e.preventDefault()
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return
      setWidth(Math.min(560, Math.max(320, window.innerWidth - ev.clientX)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      {/* launcher — hidden while the panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="ai-ring fixed bottom-24 right-6 z-40 rounded-full p-[3px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105"
          style={{ boxShadow: '0 10px 30px -8px rgba(85,107,180,0.45)' }}
          aria-label="Talk to BOTaina"
        >
          <span className="block h-[58px] w-[58px] overflow-hidden rounded-full bg-cream">
            <img src="/botaina.gif" alt="" className="h-full w-full object-cover opacity-[0.85]" />
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-y-0 right-0 z-40 flex flex-col max-md:w-full"
            style={{
              width,
              background: 'rgba(252,251,247,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderInlineStart: '1px solid rgba(85,107,180,0.18)',
              boxShadow: '-16px 0 44px -18px rgba(23,32,61,0.3)',
            }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-label="BOTaina"
          >
            {/* the AI family's gradient edge, matching the summary card */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-[2.5px]" style={{ background: 'var(--ai-gradient)' }} />
            <span
              aria-hidden
              onPointerDown={onDragStart}
              className="absolute inset-y-0 -left-1 z-10 w-2 cursor-ew-resize max-md:hidden"
            />
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-3">
                <span className={`ai-ring rounded-full p-[2.5px] ${busy ? 'generating' : ''}`}>
                  <span className="block h-[91px] w-[91px] overflow-hidden rounded-full bg-cream">
                    <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
                  </span>
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-sidra">BOTaina</div>
                  <div className="text-[11.5px] text-ink-mute">reads the numbers so you don't have to</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-chip p-1.5 text-ink-soft hover:bg-white/60" aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div ref={scrollRef} className="mt-3 flex-1 overflow-y-auto px-4 pb-2">
              <div className="flex flex-col gap-2.5">
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'self-end' : 'self-start'} style={{ maxWidth: '92%' }}>
                    {m.role === 'user' ? (
                      <div className="rounded-input bg-sidra px-3 py-2 text-[13px] text-white">{m.text}</div>
                    ) : (
                      <div
                        className="rounded-input bg-white/85 px-3 py-2.5 text-[13px] leading-relaxed text-ink"
                        style={{ borderInlineStart: '2px solid transparent', borderImage: 'var(--ai-gradient) 1', borderImageSlice: 1, borderInlineStartWidth: 2, borderInlineStartStyle: 'solid' }}
                      >
                        {m.chart ? (
                          <div>
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-mute">
                              <Spark size={11} /> WISH beneficiaries, 2022 → Q1 2026
                            </div>
                            <WishTrendChart />
                          </div>
                        ) : i === msgs.length - 1 && busy ? (
                          <Stream text={m.text ?? ''} onDone={() => setBusy(false)} />
                        ) : (
                          m.text
                        )}
                      </div>
                    )}
                    {m.role === 'bot' && !busy && i === msgs.length - 1 && m.followups && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.followups.map((f) => (
                          <button
                            key={f}
                            onClick={() => ask(f)}
                            className="rounded-chip bg-white/70 px-2.5 py-1 text-[12px] text-sidra transition-colors hover:bg-white"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {msgs.length === 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {SEEDS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="rounded-input bg-white/70 px-3 py-2 text-left text-[13px] text-sidra transition-colors hover:bg-white">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form
              className="flex items-center gap-2 border-t border-white/60 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
                setInput('')
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any indicator or entity"
                className="w-full rounded-input bg-white/80 px-3 py-2 text-[13px] outline-none placeholder:text-ink-mute focus:ring-2 focus:ring-sidra/25"
              />
              <button type="submit" className="rounded-input bg-sidra p-2 text-white" aria-label="Send">
                <Send size={15} strokeWidth={1.5} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
