/**
 * The Quarterly Brief — a one-page written report, in BOTaina's hand.
 *
 * Typeset like a memo, not laid out like a screen. Her opening paragraph in
 * serif; four short titled paragraphs in two text columns so the page fits one
 * screen; beside each paragraph, one small mark set into the margin the way a
 * printed report puts a chart in the margin — evidence, not a widget. Then the
 * one question worth asking, and her sign-off.
 *
 * Nothing else. No tiles, no verdict dots, no tap-to-reveal. Printed, it would
 * be a good one-page memo. Release 1 only.
 */
import { useEffect, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { buildQuarterlyBrief, markBriefRead, type Paragraph, type Margin } from './quarterly'
import { Spark } from '../components/Shell'
import type { Kpi } from '../model/types'

import { TREND_ACTUAL, TREND_ACTUAL_PAST, TREND_TARGET } from '../components/charts/trendPalette'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

const MAROON = '#8a1538'
const MUTE = '#7e938d'
const INK = '#122822'

export function QuarterlyBrief({
  onExit,
  onAskBotaina,
}: {
  onExit: () => void
  onOpenKpi?: (kpi: Kpi) => void
  onAskBotaina: (q: string) => void
}) {
  const brief = useMemo(() => buildQuarterlyBrief(), [])
  const reduced = useReducedMotion()

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
      className="fixed inset-0 z-[60] flex flex-col bg-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-label="The Quarterly Brief"
    >
      {/* running head */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-4 md:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-6 w-auto shrink-0" />
          <span className="truncate text-[12px] text-ink-mute">
            The Quarterly Brief · Executive View · {brief.dateLine}
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-sidra"
        >
          Open dashboard <X size={14} strokeWidth={1.7} />
        </button>
      </div>

      {/* the page */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1120px] flex-1 flex-col overflow-y-auto px-6 pb-5 pt-5 md:px-12 md:pt-6">
        {/* opening — she writes, she doesn't greet */}
        <motion.div
          className="flex shrink-0 items-start gap-4"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="ai-ring mt-1 block shrink-0 rounded-full p-[2px]">
            <span className="block h-11 w-11 overflow-hidden rounded-full bg-cream">
              <img src="/botaina.gif" alt="BOTaina" className="h-full w-full object-cover" />
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--ai-green-mid)' }}>
              <Spark size={11} /> BOTaina · Q1 2026
            </div>
            <p className="voice mt-1 max-w-[74ch] text-[17px] leading-[1.42] text-ink md:text-[20px]" style={{ textWrap: 'pretty' }}>
              {brief.opening}
            </p>
          </div>
        </motion.div>

        <hr className="my-5 shrink-0 border-ink/15 md:my-6" />

        {/* four paragraphs, two text columns, a mark in each margin */}
        <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2 md:gap-y-7">
          {brief.paragraphs.map((p, i) => (
            <Para key={p.id} p={p} index={i} />
          ))}
        </div>

        {/* the close */}
        <div className="mt-5 flex shrink-0 flex-col gap-3 border-t border-ink/15 pt-4 md:mt-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <button
            onClick={() => onAskBotaina(brief.question.q)}
            className="group flex min-w-0 items-start gap-3 text-left"
            title={`Put to ${brief.question.owner}`}
          >
            <span className="mt-[3px] shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Ask</span>
            <span className="min-w-0">
              <span className="voice block text-[16px] leading-snug text-ink transition-colors group-hover:text-sidra md:text-[17.5px]">
                {brief.question.q}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-mute">
                {brief.question.owner} · <span style={{ color: 'var(--ai-green-mid)' }}>tap to put it to BOTaina</span>
                <ArrowRight size={11} className="ml-1 inline transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </button>
          <p className="voice shrink-0 text-[14.5px] italic text-ink-soft md:max-w-[34ch] md:text-right">{brief.signoff}</p>
        </div>
      </div>
    </motion.div>
  )
}

/** A titled paragraph with its margin mark. Text first; the mark is evidence. */
function Para({ p, index }: { p: Paragraph; index: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      aria-label={p.title}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_128px] gap-x-6"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 + index * 0.06, ease: EASE }}
    >
      <div className="min-w-0">
        <h2 className="text-[14.5px] font-semibold tracking-tight text-ink">{p.title}</h2>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-soft md:text-[14.5px]" style={{ textWrap: 'pretty' }}>
          {p.text}
        </p>
      </div>
      <figure className="mt-[3px] min-w-0">
        <MarginMark m={p.margin} />
        <figcaption className="num mt-2 text-[10px] leading-tight text-ink-mute">{p.trace}</figcaption>
      </figure>
    </motion.section>
  )
}

/** Tiny SVG marks — printed-report figures, not chart widgets. */
function MarginMark({ m }: { m: Margin }) {
  if (m.kind === 'bars') {
    const W = 128, H = 72, pad = 2
    const max = Math.max(...m.series.map(([, v]) => v), m.target ?? 0)
    const n = m.series.length
    const bw = Math.min(26, (W - pad * 2 - (n - 1) * 8) / n)
    const step = (W - pad * 2 - bw) / Math.max(1, n - 1)
    const h = (v: number) => Math.max(2, (v / max) * (H - 24))
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden>
        {m.series.map(([lbl, v], i) => {
          const x = pad + i * step
          const last = i === n - 1
          return (
            <g key={lbl}>
              {/* the bar states the reading, never the verdict. This used to
                  turn maroon on a decline, which is the status palette making
                  a judgement inside a trend — the prose beside it is where
                  this brief says whether a fall is bad news. */}
              <rect
                x={x}
                y={H - 14 - h(v)}
                width={bw}
                height={h(v)}
                rx={2}
                fill={m.emphasisLast && !last ? TREND_ACTUAL_PAST : TREND_ACTUAL}
              />
              <text x={x + bw / 2} y={H - 3} textAnchor="middle" fontSize="8" fontFamily="var(--font-ui)" fill={MUTE}>
                {lbl}
              </text>
              <text
                x={x + bw / 2}
                y={H - 17 - h(v)}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="var(--font-num)"
                fill={m.emphasisLast && !last ? MUTE : INK}
              >
                {v >= 10000 ? `${Math.round(v / 1000)}k` : v}
              </text>
            </g>
          )
        })}
        {/* one tick per bar where a target exists — the same grammar as the
            listing trends, never a stacked segment */}
        {m.target !== undefined &&
          m.series.map(([lbl], i) => {
            const x = pad + i * step
            return (
              <line
                key={`t${lbl}`}
                x1={x - 2}
                y1={H - 14 - h(m.target as number)}
                x2={x + bw + 2}
                y2={H - 14 - h(m.target as number)}
                stroke={TREND_TARGET}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )
          })}
      </svg>
    )
  }
  if (m.kind === 'pair') {
    return (
      <div className="flex flex-col gap-2">
        {[m.a, m.b].map((s) => (
          <div key={s.label}>
            <div className="num text-[24px] font-bold leading-none" style={{ color: INK }}>{s.value}</div>
            <div className="mt-0.5 text-[10.5px] leading-tight text-ink-mute">{s.label}</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <table className="w-full border-collapse">
      <tbody>
        {m.rows.map((r) => (
          <tr key={r.label} className="border-t border-ink/10 first:border-0">
            <td className="py-[3px] pr-1 text-[10px] leading-tight text-ink-mute">{r.label}</td>
            <td className="num py-[3px] text-right text-[10.5px] text-ink-soft">{r.was}</td>
            <td className="num py-[3px] pl-1.5 text-right text-[10.5px] font-semibold" style={{ color: MAROON }}>{r.now}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
