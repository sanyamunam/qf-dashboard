/**
 * The dashboard parts both the Executive and the Thematic views are built
 * from — literally the same components, so "same behaviour" is guaranteed by
 * construction rather than by two implementations agreeing today and drifting
 * next week. Each takes the rows it should describe; nothing here knows which
 * dashboard it is on.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Info } from 'lucide-react'
import { AiRead } from './AiRead'
import { Spark } from './Shell'
import { themeByName, fmt } from '../model/data'
import {
  statusCounts,
  statusFor,
  actualFor,
  targetFor,
  expectedBy,
  accrualOf,
  summaryFor,
  obsAsKpi,
  unitOf,
  RISK,
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_DOT,
  STATUS_SENSE,
  PERIOD_LABEL,
  type ObsKpi,
  type Period,
  type DashStatus,
} from '../model/dash'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

export const hueFor = (theme: string | null) => themeByName(theme ?? '').fill

/** The period toggle — the ViewSwitcher's own cream-pill pattern. */
export function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-input bg-cream/80 p-1" role="radiogroup" aria-label="Reporting period">
      {(['2025', 'q1'] as Period[]).map((p) => {
        const on = period === p
        return (
          <button
            key={p}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p)}
            className="rounded-chip px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200"
            style={on ? { background: '#fff', color: 'var(--color-sidra)', boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-ink-soft)' }}
          >
            {PERIOD_LABEL[p]}
          </button>
        )
      })}
    </div>
  )
}

/** Status dot + thematic area in a card's header row, both named in words;
 *  the entity is the card's logo, and hovering it gives the name. */
export function CardMeta({ k, p }: { k: ObsKpi; p: Period }) {
  const s = statusFor(k, p)
  return (
    <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[s] }} />
        <span className="truncate">{STATUS_LABEL[s]}</span>
      </span>
      {k.theme ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-mute">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: hueFor(k.theme) }} />
          <span className="truncate">{k.theme}</span>
        </span>
      ) : (
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#8a1538' }}>
          Entity &amp; thematic area unassigned
        </span>
      )}
    </span>
  )
}

/**
 * The AI Summary, collapsed by default — the KPIs are the focus. Both states
 * are the platform's ai-frame surface; expanding reveals the full AiRead with
 * one on-pace and one behind-pace KPI, chosen by the SAME status logic as the
 * cards below, so the summary can never contradict them.
 */
export function CollapsibleSummary({
  p,
  within,
  onOpen,
}: {
  p: Period
  within: ObsKpi[]
  onOpen: (k: Kpi) => void
}) {
  const [open, setOpen] = useState(false)
  const s = useMemo(() => summaryFor(p, within), [p, within])

  const tile = (k: ObsKpi, kind: 'onTarget' | 'attention') => {
    const a = actualFor(k, p) as number
    const t = targetFor(k, p)
    /* the elapsed-year caveat, in words, only where it is load-bearing */
    const bar = expectedBy(k, p)
    const young = accrualOf(k) === 'cumulative' && p === 'q1' && kind === 'attention' && bar !== null
    return (
      <button
        key={k.row}
        onClick={() => onOpen(obsAsKpi(k.row))}
        className="flex flex-col rounded-card p-3.5 text-left transition-colors duration-200 hover:bg-cream/60"
      >
        <span className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: kind === 'onTarget' ? '#3f7300' : '#8a1538' }}>
          {kind === 'onTarget' ? STATUS_LABEL.onTarget.toUpperCase() : STATUS_LABEL.atRisk.toUpperCase()}
        </span>
        <span className="mt-1.5 block text-[11px] leading-tight text-ink-mute">{k.proposedEntity ?? 'Unassigned'}</span>
        <span className="block text-[13px] font-semibold leading-tight text-ink">{k.name.trim()}</span>
        <span className="num mt-1.5 text-[22px] font-bold leading-none text-ink">
          {fmt(a)}
          {unitOf(k)}
        </span>
        {/* the reason, and the bar it was actually judged against */}
        <span className="mt-1 text-[11px] leading-snug" style={{ color: kind === 'onTarget' ? '#3f7300' : '#8a1538' }}>
          {`${kind === 'onTarget' ? 'meets' : 'below'} its target of ${fmt(t as number)}${unitOf(k)}${k.polarity === 'Red' ? ' · lower is better' : ''}`}
          {young && (
            <span className="mt-0.5 block text-ink-mute">
              three months in — about {fmt(Math.round(bar as number))}
              {unitOf(k)} would be expected by now
            </span>
          )}
        </span>
      </button>
    )
  }

  if (!open)
    return (
      <section className="ai-frame shadow-(--shadow-card)" aria-label="AI Summary">
        <button onClick={() => setOpen(true)} aria-expanded={false} className="ai-glass flex w-full items-center gap-3 p-4 text-left">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip" style={{ background: 'var(--ai-wash-subtle)' }}>
            <Spark size={13} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="label block text-[10px]" style={{ color: 'var(--ai-green-mid)' }}>
              AI Summary · {PERIOD_LABEL[p]}
            </span>
            <span className="voice mt-0.5 block text-[15px] leading-snug text-ink">{s.collapsed}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-ink-soft">
            Expand <ChevronDown size={14} strokeWidth={1.8} />
          </span>
        </button>
      </section>
    )

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
      <AiRead
        verdict={s.collapsed}
        body={
          <>
            <p>{s.prose}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {s.onTarget && tile(s.onTarget, 'onTarget')}
              {s.atRisk && tile(s.atRisk, 'attention')}
            </div>
          </>
        }
        footer={
          <button onClick={() => setOpen(false)} className="flex items-center gap-1 text-[12px] font-medium text-ink-soft">
            Collapse <ChevronDown size={14} strokeWidth={1.8} className="rotate-180" />
          </button>
        }
      />
    </motion.div>
  )
}

/**
 * The four states, over whatever scope the page describes — recomputed per
 * period, never hard-coded. Clicking one opens the listing filtered to that
 * status AND scoped to this dashboard, so a card that says 35 opens a listing
 * of 35.
 */
export function StatusCards({
  p,
  within,
  dash,
  noun,
}: {
  p: Period
  within: ObsKpi[]
  /** the `dash` facet value the listing is scoped to */
  dash: 'Executive' | 'Thematic'
  noun: string
}) {
  const [why, setWhy] = useState(false)
  const counts = useMemo(() => statusCounts(p, within), [p, within])
  const paced = useMemo(() => within.filter((k) => accrualOf(k) === 'cumulative').length, [within])
  const total = within.length

  return (
    <>
      {/* FIVE, not four stretched to five. At this count the tiles stop being a
          grid and become a severity ROW — read left to right, worst first — so
          the layout carries the ranking rather than merely holding the cards.
          2-up on a phone, 3-up on a tablet, all five only where they stay
          legible. `STATUS_ORDER` supplies the order, so the row can never
          disagree with the sort beneath it. */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATUS_ORDER.map((st, i) => {
          const list = counts[st]
          return (
            <motion.button
              key={st}
              onClick={() => {
                location.hash = `search?status=${st}&dash=${dash}`
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * i, ease: EASE }}
              className="flex h-full flex-col rounded-card bg-card p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
              style={{ boxShadow: 'var(--shadow-card)' }}
              aria-label={`${STATUS_LABEL[st]} — ${list.length} of ${total} ${noun}; open the listing`}
            >
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[st] }} />
                {STATUS_LABEL[st]}
              </span>
              <span className="num mt-1.5 text-[26px] font-bold leading-none" style={{ color: list.length ? 'var(--color-ink)' : 'var(--color-ink-mute)' }}>
                {String(list.length).padStart(2, '0')}
              </span>
              <span className="mt-1.5 text-[11px] leading-snug text-ink-mute" style={{ minHeight: '2.6em' }}>
                {STATUS_SENSE[st]}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <p className="text-[11.5px] text-ink-mute">
          {STATUS_ORDER.map((s) => counts[s].length).join(' + ')} ={' '}
          <span className="font-semibold text-ink-soft">{total}</span> {noun}, judged for {PERIOD_LABEL[p]} only.
        </p>
        <button
          onClick={() => setWhy((v) => !v)}
          aria-expanded={why}
          className="flex items-center gap-1 text-[11.5px] font-medium text-sidra underline underline-offset-2"
        >
          <Info size={12} strokeWidth={2} /> How status is calculated
        </button>
      </div>

      <AnimatePresence>
        {why && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="mt-2.5 rounded-card bg-card p-4 text-[12.5px] leading-relaxed text-ink-soft shadow-(--shadow-card)"
          >
            <p>
              <span className="font-semibold text-ink">Measured against the target; judged against the pace.</span>{' '}
              Attainment is the reading divided by the commitment — {STATUS_LABEL.onTarget} at{' '}
              {Math.round(RISK.onTarget * 100)}% or above. Below that, the line between{' '}
              {STATUS_LABEL.belowTarget.toLowerCase()} and {STATUS_LABEL.atRisk.toLowerCase()} is the{' '}
              <span className="font-semibold text-ink">pace line</span>: the dashed “by now” tick each card draws on its
              own bar. Past the tick but short of the commitment is {STATUS_LABEL.belowTarget.toLowerCase()}; behind the
              tick is {STATUS_LABEL.atRisk.toLowerCase()}. So the mark and the verdict cannot disagree — they are the
              same number — and no card can read {STATUS_LABEL.atRisk.toLowerCase()} while its fill sits past its own
              tick.
            </p>
            <p className="mt-2">
              A rate, score or percentage has no pace line — it is a level that should already be at its target in
              March, not something that accrues — so it keeps a fixed {Math.round(RISK.belowTarget * 100)}% floor, as
              does a lower-is-better ceiling and any closed year. Both numbers are a starting position rather than a
              finding, and are meant to be tuned once QF has seen the result.
            </p>
            {p === 'q1' && (
              <p className="mt-2">
                <span className="font-semibold text-ink">The elapsed year sets the line, never the figure.</span> Three
                months of twelve have closed, so a cumulative indicator — {paced} of these {total} — is expected to be
                about {Math.round(RISK.elapsed * 100)}% of the way there. That share decides where{' '}
                {STATUS_LABEL.atRisk.toLowerCase()} begins; it is deliberately NOT folded into the attainment figure.
                Dividing the reading by the elapsed quarter was tried, and produced a card reading “8 of 30 · on
                target”, which no arithmetic can defend to the person reading it.
              </p>
            )}
            <p className="mt-2">
              Direction comes from the sheet's Polarity column, never from the sign of a change — {within.filter((k) => k.polarity === 'Red').length} of
              these are lower-is-better, and for those an <span className="font-semibold text-ink">overshoot</span> is
              the risk. An indicator with no target, or with a target of zero in an off-cycle year, is placed under{' '}
              <span className="font-semibold text-ink">{STATUS_LABEL.noTarget}</span>: no pass or fail is possible and
              none is invented.
            </p>
            {/* the thresholds are stated once, in the opening paragraph — this
                second copy said the same thing again in the old pace language */}
            <p className="mt-2">
              An indicator with <span className="font-semibold text-ink">no reading is never at risk</span> — it is{' '}
              {STATUS_LABEL.notReported}. A zero on a satisfaction score, an NPS or a rate is read as an empty cell
              rather than a collapse to nothing, which is why {STATUS_LABEL.atRisk.toLowerCase()} stays a list worth
              acting on instead of a list of reporting gaps.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
