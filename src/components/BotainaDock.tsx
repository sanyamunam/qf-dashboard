/**
 * BOTaina — floating presence, bottom-right, above the nav pill.
 * The launcher runs the supplied GIF inside an --ai-border-gradient ring; the panel
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
import { Spark } from './Shell'

const GREETED_KEY = 'almishkat.botaina.greeted.v2'

/**
 * The insight contract as data, not prose: verdict / evidence / so-what / ask.
 * Rendering makes that structure visible instead of running it together into a
 * paragraph — same facts, a third of the reading time.
 */
interface AnswerItem {
  label: string
  value?: string
}
interface Answer {
  verdict: string
  items?: AnswerItem[]
  soWhat?: string
  ask?: { q: string; owner: string }
  detail?: string
}
interface Msg {
  role: 'bot' | 'user'
  text?: string // user turns only
  answer?: Answer
  chart?: boolean
  followups?: string[]
}

function wishAnswer(): Msg {
  const w = facts.wish
  const s = w.series
  return {
    role: 'bot',
    answer: {
      verdict: "WISH's reach has fallen three years running.",
      items: [
        { label: 'Programme reach', value: `${fmt(s[1]?.[1])} → ${fmt(s[2]?.[1])} → ${fmt(s[3]?.[1])} → ${fmt(w.q1)}` },
        { label: 'Against a full-year target of', value: fmt(w.target26) },
        { label: 'Media mentions', value: '700+ (2022) → 0' },
        { label: 'Research and partnerships', value: 'holding' },
      ],
      soWhat: 'The steepest decline in the portfolio — and it reads as a change in delivery model, not a decline across the board.',
      ask: { q: 'What changed in the delivery model after 2023?', owner: 'WISH CEO' },
    },
    followups: ['Show me the trend', 'Which other entities stopped reporting?', 'Take me to Social Progress'],
  }
}

function stoppedAnswer(): Msg {
  const st = stoppedReporting()
  return {
    role: 'bot',
    answer: {
      verdict: `${st.length} entities stopped reporting indicators they used to report.`,
      items: st.map((s) => ({
        label: s.entity,
        value: s.kpis.map((k) => k.name.toLowerCase()).slice(0, 3).join(', '),
      })),
      soWhat: 'A Q1 zero on a cumulative count can mean "nothing yet" rather than "stopped".',
      ask: { q: 'Are these figures still being collected?', owner: "each entity's reporting lead" },
    },
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
    .slice(0, 4)
  return {
    role: 'bot',
    answer: {
      verdict: 'The widest gaps to a 2026 commitment, after one quarter.',
      items: gaps.map(({ k }) => ({
        label: `${k.entity} · ${k.name}`,
        value: `${fmt(k.actuals['2026Q1'].value)} of ${fmt(k.targets['2026'].value)}`,
      })),
      soWhat: 'One quarter of twelve has elapsed, so distance is expected. The one with three years of decline behind it is the real gap.',
      ask: { q: "Is WISH's 5,000 target still the right promise?", owner: 'WISH CEO' },
    },
    followups: ['What happened at WISH?', 'Show me the trend'],
  }
}

function targetsAnswer(): Msg {
  // lead with the largest magnitudes — hitting 7,000 or QAR 27.4m exactly is
  // the part that cannot happen by measurement, so it must not be buried
  const exact = kpis
    .filter((k) => k.exactHit)
    .sort((a, b) => (b.actuals['2026Q1'].value ?? 0) - (a.actuals['2026Q1'].value ?? 0))
  const show = exact.slice(0, 3)
  return {
    role: 'bot',
    answer: {
      verdict: `${exact.length} indicators sit exactly on their full-year 2026 target.`,
      items: show.map((k) => ({
        label: `${k.entity} · ${k.name}`,
        value: `${fmt(k.actuals['2026Q1'].value)} of ${fmt(k.targets['2026'].value)}`,
      })),
      soWhat: 'Landing precisely on an annual number in March is a property of the target, not the work.',
      ask: { q: 'Who set the 2026 numbers, and against what baseline?', owner: 'Strategy and Performance' },
      detail: exact
        .slice(3)
        .map((k) => `${k.entity} · ${k.name} — ${fmt(k.actuals['2026Q1'].value)} of ${fmt(k.targets['2026'].value)}`)
        .join('\n'),
    },
    followups: ['Which entities stopped reporting this quarter?'],
  }
}

function route(q: string): Msg {
  const s = q.toLowerCase()
  if (s.includes('draft') && s.includes('ask')) {
    return {
      role: 'bot',
      answer: {
        verdict: 'Three questions, drafted in your voice.',
        items: [
          { label: 'Strategy and Performance', value: 'Who set the 2026 numbers, and which of the 35 already-met targets should be re-based now?' },
          { label: 'WISH CEO', value: 'What changed in the delivery model after 2023, and is 5,000 still the right promise?' },
          { label: "Each entity's reporting lead", value: 'Which of the six Q1 zeros are late submissions, and which are real stops?' },
        ],
        ask: { q: 'Copy them from the brief\'s closing screen, or tell me who they go to first.', owner: 'you' },
      },
      followups: ['What happened at WISH?', 'Which 2026 targets look wrong?'],
    }
  }
  if (s.includes('wish')) return wishAnswer()
  if (s.includes('stopped') || s.includes('quiet')) return stoppedAnswer()
  if (s.includes('gap')) return gapAnswer()
  if (s.includes('target') || s.includes('exactly')) return targetsAnswer()
  return {
    role: 'bot',
    answer: {
      verdict: "I read the 151 indicators, their targets and their history — and I won't guess past them.",
      soWhat: 'Ask about an entity by name, or try one of these.',
    },
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

/**
 * Renders the insight contract as four visible parts. The verdict streams on
 * its own line; evidence lands as a list, never a comma-separated run-on; the
 * ask sits below a rule so it can't be missed. Long evidence is capped with an
 * explicit way to see the rest.
 */
function AnswerView({ a, live, onDone }: { a: Answer; live: boolean; onDone: () => void }) {
  const [verdictDone, setVerdictDone] = useState(!live)
  const [showAll, setShowAll] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const doneRef = useRef(false)

  const items = a.items ?? []
  const CAP = 4 // hiding a single extra item behind a control isn't worth the click
  const visible = showAll ? items : items.slice(0, CAP)
  const blocks = visible.length + (a.soWhat ? 1 : 0) + (a.ask ? 1 : 0)

  useEffect(() => {
    if (!live || !verdictDone || doneRef.current) return
    const t = setTimeout(() => {
      doneRef.current = true
      onDone()
    }, blocks * 80 + 140)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, verdictDone, blocks])

  const anim = (i: number) =>
    live
      ? {
          initial: { opacity: 0, y: 4 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.05 + i * 0.08, duration: 0.24 },
        }
      : {}

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13.5px] font-semibold leading-snug text-ink">
        {live && !verdictDone ? <Stream text={a.verdict} onDone={() => setVerdictDone(true)} /> : a.verdict}
      </p>

      {(!live || verdictDone) && (
        <>
          {visible.length > 0 && (
            <ul className="flex flex-col gap-1">
              {visible.map((it, i) => {
                const stacked = (it.value?.length ?? 0) > 34
                return (
                  <motion.li
                    key={it.label}
                    {...anim(i)}
                    className="border-b border-ink-mute/10 pb-1 last:border-0 last:pb-0"
                  >
                    {stacked ? (
                      <>
                        <span className="block text-[11px] font-semibold text-ink">{it.label}</span>
                        <span className="block text-[12px] leading-snug text-ink-soft">{it.value}</span>
                      </>
                    ) : (
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-[12px] leading-snug text-ink-soft">{it.label}</span>
                        {it.value && <span className="num shrink-0 text-[12px] font-semibold text-ink">{it.value}</span>}
                      </span>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          )}

          {items.length > CAP && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="self-start text-[11.5px] font-medium text-sidra underline underline-offset-2"
            >
              Show all {items.length}
            </button>
          )}

          {a.soWhat && (
            <motion.p {...anim(visible.length)} className="text-[12.5px] leading-snug text-ink-soft">
              {a.soWhat}
            </motion.p>
          )}

          {a.detail && (
            <>
              <button
                onClick={() => setShowDetail((v) => !v)}
                className="self-start text-[11.5px] font-medium text-sidra underline underline-offset-2"
              >
                {showDetail ? 'Hide detail' : 'Tell me more'}
              </button>
              {showDetail && (
                <div className="whitespace-pre-line rounded-input bg-cream/70 p-2.5 text-[11.5px] leading-snug text-ink-soft">
                  {a.detail}
                </div>
              )}
            </>
          )}

          {a.ask && (
            <motion.div
              {...anim(visible.length + 1)}
              className="flex items-start gap-2 border-t border-ink-mute/15 pt-2"
            >
              <span className="mt-0.5 shrink-0">
                <Spark size={11} />
              </span>
              <div>
                <p className="voice text-[12.5px] italic leading-snug text-sidra">{a.ask.q}</p>
                <p className="mt-0.5 text-[11px] text-ink-mute">Put to: {a.ask.owner}</p>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
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
          answer: {
            verdict: `Good morning. I'm BOTaina — ${stoppedReporting().length} entities have gone quiet this quarter.`,
            soWhat: "That's the thread I'd pull first. Shall I show you, or would you like the full picture?",
          },
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
          style={{ boxShadow: '0 10px 30px -8px rgba(20,97,82,0.45)' }}
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
              borderInlineStart: '1px solid rgba(20,97,82,0.18)',
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
            <span aria-hidden className="absolute inset-x-0 top-0 h-[2.5px]" style={{ background: 'var(--ai-border-gradient)' }} />
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
                        /* her own surface: the green wash + gradient edge put it
                           in the AI family while keeping streamed, structured
                           answers as readable as they are on a light card */
                        className="rounded-input px-3 py-2.5 text-[13px] leading-relaxed text-ink"
                        style={{
                          background: 'var(--ai-wash-subtle), rgba(255,255,255,0.85)',
                          borderInlineStart: '2px solid transparent',
                          borderImage: 'var(--ai-border-gradient) 1',
                          borderImageSlice: 1,
                          borderInlineStartWidth: 2,
                          borderInlineStartStyle: 'solid',
                        }}
                      >
                        {m.chart ? (
                          <div>
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-mute">
                              <Spark size={11} /> WISH beneficiaries, 2022 → Q1 2026
                            </div>
                            <WishTrendChart />
                          </div>
                        ) : m.answer ? (
                          <AnswerView
                            a={m.answer}
                            live={i === msgs.length - 1 && busy}
                            onDone={() => setBusy(false)}
                          />
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
