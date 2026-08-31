/**
 * The Executive Dashboard — ten KPIs read from the sheet's blue fill, grouped
 * by the category tree parsed from the `Category` column's ` - ` delimiter.
 *
 * Judged by one question: does this help the CEO understand where QF stands,
 * faster? So: the AI Summary is collapsed by default (the KPIs are the
 * focus); four status cards answer "how is the portfolio doing" before a
 * single KPI is read; one year filter (2025 · full year / Q1 2026 · quarter)
 * switches every figure, chart, status and count at once — the two periods
 * are never mixed on screen.
 *
 * Everything visual is the platform's own: AiRead for the summary surface,
 * KpiCard for the cards, the cream-pill toggle from ViewSwitcher, the page
 * frame from ThematicView. Rationale + rejections: docs/exec-dashboard-notes.md
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { HeaderCluster, Spark, TopNav } from '../components/Shell'
import { AiRead } from '../components/AiRead'
import { KpiCard } from '../components/KpiCard'
import { CardMark } from '../components/charts/Marks2'
import { themeByName, fmt } from '../model/data'
import {
  dashTen,
  execRows,
  buildTree,
  statusCounts,
  statusFor,
  actualFor,
  targetFor,
  cardKpi,
  obsAsKpi,
  lineFor,
  figureFor,
  absenceFor,
  attainmentOf,
  bySeverity,
  worstSeverityOf,
  STATUS_ORDER,
  RISK,
  deltaFor,
  yoyFor,
  yoyNoteFor,
  summaryFor,
  groupOf,
  subOf,
  unitOf,
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

const hueFor = (theme: string | null) => themeByName(theme ?? '').fill

/** Status dot + thematic area in the card's header row, both named in words;
 *  the entity is the card's logo, and hovering it gives the name. Row 11's
 *  double gap is surfaced, never blank. */
function CardMeta({ k, p }: { k: ObsKpi; p: Period }) {
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

/** The period toggle — the ViewSwitcher's own cream-pill pattern. */
function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
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

/**
 * The AI Summary, collapsed by default — the KPIs are the focus. Both states
 * are the platform's ai-frame surface; expanding reveals the full AiRead with
 * one performing and one at-risk KPI, chosen by the SAME status logic as the
 * cards below, so the summary can never contradict them.
 */
function CollapsibleSummary({ p, onOpen }: { p: Period; onOpen: (k: Kpi) => void }) {
  const [open, setOpen] = useState(false)
  const s = useMemo(() => summaryFor(p), [p])

  const tile = (k: ObsKpi, kind: 'onTarget' | 'attention') => {
    const a = actualFor(k, p) as number
    const t = targetFor(k, p)
    return (
      <button
        key={k.row}
        onClick={() => onOpen(obsAsKpi(k.row))}
        className="flex flex-col rounded-card p-3.5 text-left transition-colors duration-200 hover:bg-cream/60"
      >
        <span className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: kind === 'onTarget' ? '#3c6a5f' : '#8a1538' }}>
          {kind === 'onTarget' ? 'PERFORMING WELL' : 'AT RISK'}
        </span>
        <span className="mt-1.5 block text-[11px] leading-tight text-ink-mute">{k.proposedEntity ?? 'Unassigned'}</span>
        <span className="block text-[13px] font-semibold leading-tight text-ink">{k.name.trim()}</span>
        <span className="num mt-1.5 text-[22px] font-bold leading-none text-ink">
          {fmt(a)}
          {unitOf(k)}
        </span>
        <span className="mt-1 text-[11px] leading-snug" style={{ color: kind === 'onTarget' ? '#3c6a5f' : '#8a1538' }}>
          {kind === 'onTarget'
            ? `meets its ${fmt(t as number)}${unitOf(k)} target`
            : `target ${fmt(t as number)}${unitOf(k)}${k.polarity === 'Red' ? ' · lower is better' : ''}`}
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

/** Every CATEGORY routes to the search listing, filtered to it. Wrappers do
 *  not — they have no listing of their own. */
const catHref = (label: string) => `#search?cat=${encodeURIComponent(label)}`

interface Cat {
  name: string
  total: number
  cards: ObsKpi[]
}
type Band =
  /** a grouping wrapper and the categories it bundles */
  | { kind: 'wrapper'; label: string; total: number; cats: Cat[] }
  /** standalone categories, with no wrapper above them */
  | { kind: 'plain'; cats: Cat[] }

export function Executive({ onEvidence }: { onEvidence: (kpi: Kpi) => void }) {
  const [period, setPeriod] = useState<Period>('q1')

  /**
   * The status cards describe the PORTFOLIO — all 89 Executive indicators —
   * while the ten cards below are the spotlight. The scope has to match the
   * click-through: a card that says 2 and opens a listing of 12 is broken, so
   * both count the same 89 rows the listing shows.
   */
  const counts = useMemo(() => statusCounts(period, execRows), [period])
  const tree = useMemo(() => buildTree(execRows), [])
  /**
   * Two kinds of thing, told apart.
   *
   * `Education` and `Operational Excellence` are GROUPING WRAPPERS — they
   * bundle categories and have no listing of their own, so they render as
   * quiet dividers with no arrow, no hover and no focus. Everything else is a
   * real CATEGORY with a destination, and every category is styled the same
   * whether it sits inside a wrapper or stands on its own. Nesting changes
   * position, not appearance. Consecutive standalone categories share one
   * band so a single-card category never claims a full row to itself.
   */
  const bands = useMemo(() => {
    const out: Band[] = []
    for (const node of tree) {
      const inGroup = dashTen.filter((k) => groupOf(k) === node.parent)
      if (inGroup.length === 0) continue
      if (node.subs.length > 0) {
        const cats = node.subs
          .map((sub) => ({
            name: sub.name,
            total: sub.total,
            /* riskiest indicator first inside every category */
            cards: inGroup.filter((k) => subOf(k) === sub.name).sort(bySeverity(period)),
          }))
          .filter((c) => c.cards.length > 0)
          /* and a category is as urgent as its worst indicator, so one at-risk
             KPI lifts its whole category above an entirely healthy one */
          .sort((a, b) => worstSeverityOf(a.cards, period) - worstSeverityOf(b.cards, period))
        out.push({ kind: 'wrapper', label: node.parent, total: node.total, cats })
      } else {
        const cat: Cat = { name: node.parent, total: node.total, cards: [...inGroup].sort(bySeverity(period)) }
        const last = out[out.length - 1]
        if (last && last.kind === 'plain') last.cats.push(cat)
        else out.push({ kind: 'plain', cats: [cat] })
      }
    }
    return out
  }, [tree, period])

  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <header className="pt-6">
        {/* one header row: logo, navigation, search entry, account */}
        {/* logo, navigation, account — the nav takes the centre now that the
            header search, the lamp and the bell have gone */}
        <div className="flex items-center gap-6">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <div className="flex flex-1 justify-center">
            <TopNav active="exec" />
          </div>
          <HeaderCluster hidePeriod />
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-[30px] font-semibold leading-none tracking-tight text-ink">Executive View</h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              {dashTen.length} KPIs of {execRows.length} Executive indicators · showing{' '}
              <span className="font-semibold text-ink">{PERIOD_LABEL[period]}</span>
            </p>
          </div>
          {/* ONE filter, one period — every figure, chart, status and count
              switches together. Q1 2026 is labelled as a quarter. */}
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </header>

      <motion.div className="mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
        <CollapsibleSummary p={period} onOpen={onEvidence} />
      </motion.div>

      {/* the four states over ALL 89 Executive indicators — computed per
          period, never hard-coded. Clicking opens the listing filtered to
          that status, where the filter shows as a removable chip. */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATUS_ORDER.map((st, i) => {
          const list = counts[st]
          const onDash = list.filter((k) => k.highlighted).length
          return (
            <motion.button
              key={st}
              onClick={() => {
                location.hash = `search?status=${st}&dash=Executive`
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * i, ease: EASE }}
              className="flex h-full flex-col rounded-card bg-card p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
              style={{ boxShadow: 'var(--shadow-card)' }}
              aria-label={`${STATUS_LABEL[st]} — ${list.length} of ${execRows.length} Executive indicators; open the listing`}
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
                {onDash > 0 && ` · ${onDash} on this dashboard`}
              </span>
            </motion.button>
          )
        })}
      </div>

      <p className="mt-2.5 text-[11.5px] text-ink-mute">
        {/* the same five, in the same severity order as the cards above — read
            from STATUS_ORDER so the line can never fall behind the row */}
        {STATUS_ORDER.map((s) => counts[s].length).join(' + ')} ={' '}
        <span className="font-semibold text-ink-soft">{execRows.length}</span> Executive indicators, judged for{' '}
        {PERIOD_LABEL[period]} only. <span className="font-semibold text-ink-soft">{STATUS_LABEL.atRisk}</span> means
        under {Math.round(RISK.belowTarget * 100)}% of its target, {STATUS_LABEL.belowTarget.toLowerCase()} is between
        that and {Math.round(RISK.onTarget * 100)}%, and every card prints its own figure so the verdict can be
        checked.{' '}
        <span className="font-semibold text-ink-soft">{STATUS_LABEL.noTarget}</span> means a reading with nothing to
        judge it against, so no pass or fail is possible and none is invented.
      </p>

      {/* the category tree. A wrapper is a divider; a category is a
          destination. Both readings are available at a glance, without
          hovering anything. */}
      {bands.map((band, bi) => {
        const cats = band.cats.filter((c) => c.cards.length > 0)
        if (cats.length === 0) return null

        const grid = (
          <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
            {cats.map((cat) => (
              <div key={cat.name} className="flex min-w-0 flex-col">
                {/* ONE category treatment, nested or standalone */}
                <a
                  href={catHref(cat.name)}
                  className="group mb-2.5 inline-flex w-fit items-baseline gap-1.5 transition-colors"
                >
                  <span className="text-[14.5px] font-semibold leading-tight text-ink transition-colors group-hover:text-sidra">
                    {cat.name}
                  </span>
                  <span className="num text-[11px] text-ink-mute">{cat.total}</span>
                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.9}
                    className="shrink-0 self-center text-ink-mute transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                  />
                </a>
                <div className="flex flex-1 flex-col gap-4">
                  {cat.cards.map((k) => (
                    <KpiCard
                      key={k.row}
                      group={[cardKpi(k, period)]}
                      hue={hueFor(k.theme)}
                      size="lg"
                      onOpen={() => onEvidence(obsAsKpi(k.row))}
                      status={<CardMeta k={k} p={period} />}
                      line={lineFor(k, period)}
                      mark={subOf(k) === 'Priority Initiatives' ? null : <CardMark k={k} p={period} />}
                      figure={figureFor(k, period)}
                      delta={deltaFor(k, period)}
                      yoy={yoyFor(k, period)}
                      yoyNote={yoyNoteFor(k, period)}
                      absence={absenceFor(k, period)}
                      attainment={attainmentOf(k, period)}
                      className="flex-1"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

        if (band.kind === 'plain')
          return (
            <div key={`plain-${bi}`} className="mt-9">
              {grid}
            </div>
          )

        return (
          <section key={band.label} className="mt-11" aria-label={band.label}>
            {/* a grouping wrapper: the platform's own section-divider grammar
                (Thematic View's "Enabling function"). Not a link, not
                focusable, no hover, no cursor change — it goes nowhere. */}
            <div className="flex items-center gap-3">
              <span className="label text-[10px] text-ink-mute">{band.label}</span>
              <span aria-hidden className="h-px flex-1 bg-ink-mute/20" />
              <span className="label text-[10px] text-ink-mute">
                <span className="num">{band.total}</span> indicators
              </span>
            </div>
            {/* the rule carries the belonging — its categories sit inside it */}
            <div className="mt-5 border-s border-ink-mute/20 ps-5">{grid}</div>
          </section>
        )
      })}

      {/* data requests for QF — gaps surfaced, never papered over */}
      <footer className="mt-10 text-[11px] leading-relaxed text-ink-mute">
        Data requests for QF: <span className="font-semibold text-ink-soft">Total Policy Adoptions</span> carries no entity
        and no thematic area — 12 of the 89 Executive rows share that gap — and{' '}
        <span className="font-semibold text-ink-soft">Patents Granted – Other</span> additionally has no category (listed
        under Uncategorised). <span className="font-semibold text-ink-soft">Priority Initiatives</span> is shown from a supplied
        design and is not yet in the source sheet — its Ongoing Initiatives figure (6, WISH) awaits a cell in Actuals &amp;
        Targets; Operational Excellence holds Financial Health and HC Insights only. 4 rows carry thematic area <span className="font-semibold text-ink-soft">All</span> —
        flagged as either a real cross-cutting scope or a data fault. <span className="font-semibold text-ink-soft">Employee
        Turnover</span> is marked Polarity Green (higher is better) while its Thematic twin is Red — judged as recorded, and
        flagged. Every figure traces to a cell in Actuals &amp; Targets; percentage units are normalised once, on read.
      </footer>
    </div>
  )
}
