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
import { HeaderCluster, TopNav } from '../components/Shell'
import { CardMeta, CollapsibleSummary, PeriodToggle, StatusCards, hueFor } from '../components/DashParts'
import { AiRead } from '../components/AiRead'
import { KpiCard } from '../components/KpiCard'
import { CardMark } from '../components/charts/Marks2'
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
  deltaFor,
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
          .map((sub) => ({ name: sub.name, total: sub.total, cards: inGroup.filter((k) => subOf(k) === sub.name) }))
          .filter((c) => c.cards.length > 0)
        out.push({ kind: 'wrapper', label: node.parent, total: node.total, cats })
      } else {
        const cat: Cat = { name: node.parent, total: node.total, cards: inGroup }
        const last = out[out.length - 1]
        if (last && last.kind === 'plain') last.cats.push(cat)
        else out.push({ kind: 'plain', cats: [cat] })
      }
    }
    return out
  }, [tree])

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
        <CollapsibleSummary p={period} within={dashTen} onOpen={onEvidence} />
      </motion.div>

      <StatusCards p={period} within={execRows} dash="Executive" noun="Executive indicators" />

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
                      mark={<CardMark k={k} p={period} />}
                      figure={figureFor(k, period)}
                      delta={deltaFor(k, period)}
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
        under Uncategorised). There is no Priority Initiatives category in the source sheet — Operational Excellence holds
        Financial Health and HC Insights only. 4 rows carry thematic area <span className="font-semibold text-ink-soft">All</span> —
        flagged as either a real cross-cutting scope or a data fault. <span className="font-semibold text-ink-soft">Employee
        Turnover</span> is marked Polarity Green (higher is better) while its Thematic twin is Red — judged as recorded, and
        flagged. Every figure traces to a cell in Actuals &amp; Targets; percentage units are normalised once, on read.
      </footer>
    </div>
  )
}
