/**
 * The Thematic Dashboard — the 151 rows where `Dashboard = Thematic`, never
 * blended with the 89 Executive ones.
 *
 * Built from the SAME components as the Executive View (components/DashParts):
 * one collapsible AI Summary, four status cards over the same four states, and
 * the shared chart selector for every mark. What differs is only what the data
 * is: every one of the 151 carries a Q1 reading, which is what forced the pace
 * rule in model/dash.ts — see PACE there.
 *
 * Six blocks, one per thematic area, in size order. Precision Health has zero
 * Thematic rows and keeps its reserved state rather than being dropped: the
 * slot is built and stays empty until QF supplies indicators.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { HeaderCluster, TopNav } from '../components/Shell'
import { KpiCard } from '../components/KpiCard'
import { CardMarkL1, CardMarkL1L2 } from '../components/charts/Marks2'
import { CardMeta, CollapsibleSummary, PeriodToggle, StatusCards, hueFor } from '../components/DashParts'
import { THEMES } from '../model/data'
import { obsKpis } from '../model/obs'
import {
  cardKpi,
  obsAsKpi,
  lineFor,
  figureFor,
  deltaFor,
  PERIOD_LABEL,
  type ObsKpi,
  type Period,
} from '../model/dash'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

/** `Dashboard = Thematic` — the other 89 rows are the Executive View's. */
export const thematicRows: ObsKpi[] = obsKpis.filter((k) => !(k.dashboard ?? '').startsWith('Exec'))

/* ────────────────────────── THE EVALUATION TOGGLE ──────────────────────────
 *
 * TEMPORARY. This exists so the L1-only and L1+L2 card treatments can be
 * judged side by side on real data rather than described. Once the call is
 * made, delete `Treatment`, the `mode` state and this block, and hard-wire the
 * winning mark into the `KpiCard` below — nothing else on the page depends on
 * it. Both modes render identical data, figures, captions and L1 marks; only
 * the trend's presence differs, which is the whole point of the comparison.
 */
type Mode = 'l1' | 'l1l2'
const MODE_LABEL: Record<Mode, string> = { l1: 'Current value only', l1l2: 'Current value + trend' }

function Treatment({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="label text-[10px] text-ink-mute">Card treatment · evaluating</span>
      <div className="flex items-center gap-1 rounded-input bg-cream/80 p-1" role="radiogroup" aria-label="Card treatment">
        {(['l1', 'l1l2'] as Mode[]).map((m) => {
          const on = mode === m
          return (
            <button
              key={m}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m)}
              className="rounded-chip px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200"
              style={on ? { background: '#fff', color: 'var(--color-sidra)', boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-ink-soft)' }}
            >
              {MODE_LABEL[m]}
            </button>
          )
        })}
      </div>
      <span className="text-[11.5px] text-ink-mute">switches all six areas at once</span>
    </div>
  )
}

export function Thematic({ onEvidence }: { onEvidence: (kpi: Kpi) => void }) {
  const [period, setPeriod] = useState<Period>('q1')
  const [mode, setMode] = useState<Mode>('l1')

  /** Every thematic area, in size order, INCLUDING the empty one. */
  const blocks = useMemo(
    () =>
      THEMES.map((t) => ({ theme: t, rows: thematicRows.filter((k) => k.theme === t.name) })).sort(
        (a, b) => b.rows.length - a.rows.length,
      ),
    [],
  )

  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <header className="pt-6">
        <div className="flex items-center gap-6">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <div className="flex flex-1 justify-center">
            <TopNav active="themes" />
          </div>
          <HeaderCluster hidePeriod />
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-[30px] font-semibold leading-none tracking-tight text-ink">Thematic View</h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              {thematicRows.length} Thematic indicators across{' '}
              {blocks.filter((b) => b.rows.length && !b.theme.isBanner).length} of QF's five thematic areas and its
              enabling function · showing <span className="font-semibold text-ink">{PERIOD_LABEL[period]}</span>
            </p>
          </div>
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </header>

      <motion.div className="mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
        <CollapsibleSummary p={period} within={thematicRows} onOpen={onEvidence} />
      </motion.div>

      <StatusCards p={period} within={thematicRows} dash="Thematic" noun="Thematic indicators" />

      <div className="mt-7 border-t border-cream pt-5">
        <Treatment mode={mode} onChange={setMode} />
      </div>

      {blocks.map((b, bi) => (
        <section key={b.theme.id} className="mt-10" aria-label={b.theme.name}>
          <div className="flex items-center gap-3">
            {b.rows.length > 0 ? (
              <a href={`#t/${b.theme.id}`} className="group inline-flex items-baseline gap-1.5">
                <span
                  className="text-[15px] font-semibold leading-tight transition-colors"
                  style={{ color: b.theme.fill }}
                >
                  {b.theme.name}
                </span>
                <span className="num text-[11.5px] text-ink-mute">{b.rows.length}</span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.9}
                  className="shrink-0 self-center text-ink-mute transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                />
              </a>
            ) : (
              <span className="text-[15px] font-semibold leading-tight text-ink-mute">{b.theme.name}</span>
            )}
            <span aria-hidden className="h-px flex-1 bg-ink-mute/20" />
          </div>

          {b.rows.length === 0 ? (
            /* the reserved state — built and empty, in both modes. Precision
               Health is one of QF's five areas and has supplied no Thematic
               indicators; inventing a placeholder figure would be worse than
               the gap. */
            <div className="mt-4 rounded-card bg-card p-5 text-[13px] leading-relaxed text-ink-soft shadow-(--shadow-card)">
              QF's fifth thematic area. No indicator in the workbook carries{' '}
              <span className="font-semibold text-ink">{b.theme.name}</span> on the Thematic dashboard — the slot is
              built and stays empty until they arrive. Nothing here is estimated.
            </div>
          ) : (
            <motion.div
              /* keyed on the mode so a switch re-enters rather than morphing —
                 the heights genuinely differ, which is what is being judged */
              key={mode}
              className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(0.12, 0.03 * bi), ease: EASE }}
            >
              {b.rows.map((k) => (
                <KpiCard
                  key={k.row}
                  group={[cardKpi(k, period)]}
                  hue={hueFor(k.theme)}
                  onOpen={() => onEvidence(obsAsKpi(k.row))}
                  status={<CardMeta k={k} p={period} />}
                  line={lineFor(k, period)}
                  mark={mode === 'l1' ? <CardMarkL1 k={k} p={period} /> : <CardMarkL1L2 k={k} p={period} />}
                  figure={figureFor(k, period)}
                  delta={deltaFor(k, period)}
                />
              ))}
            </motion.div>
          )}
        </section>
      ))}

      <footer className="mt-10 text-[11px] leading-relaxed text-ink-mute">
        Every figure traces to a cell in Actuals &amp; Targets, rows where Dashboard = Thematic; percentage units are
        normalised once, on read. Status for a partial period is judged against elapsed pace, which is the platform's
        assumption and not a milestone QF has set — see <span className="font-semibold text-ink-soft">How status is
        calculated</span> above.
      </footer>
    </div>
  )
}
