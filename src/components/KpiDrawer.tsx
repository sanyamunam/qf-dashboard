/**
 * L3 — the KPI detail drawer. A drawer, never a page. The one surface that
 * uses glass (panel radius, per the inherited system's panel-only rule).
 */
import { motion, AnimatePresence } from 'framer-motion'
import type { Kpi } from '../model/types'
import { EChart } from './charts/EChart'
import { overlayTrendOption, aiLineFor } from './charts/builders'
import { BotainaFigure } from './Botaina'
import { EntityIcon } from './EntityIcon'
import { kpis as allKpis } from '../model/data'

const YEARS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']

function confidenceFor(k: Kpi): string {
  const n = k.movementSeries.length
  if (n >= 3) return `High — ${n} readings on record`
  if (n === 2) return 'Medium — 2 readings, direction only'
  return 'Low — single data point; treat any trend language as premature'
}

function longerRead(k: Kpi): { read: string; unknown: string } {
  const q1 = k.actuals['2026Q1'].value
  const t26 = k.targets['2026'].value
  const base = aiLineFor([k])
  const parts: string[] = [base]
  if (k.polarity === 'Red')
    parts.push('Lower is better here: this indicator has a ceiling, not a target to climb toward.')
  if (k.exactHit)
    parts.push('An exact hit on an annual number in the first quarter usually means the target was set to what was already done. Worth asking, not celebrating.')
  if (k.overshoot && q1 !== null && t26)
    parts.push(`The overshoot (${q1} against ${t26}) is a flag for target-setting quality rather than a win.`)
  return {
    read: parts.join(' '),
    unknown:
      k.cadence === 'annual'
        ? 'What I can\'t see: any quarterly movement — this indicator reports once a year, so anything said about the current quarter would be a guess.'
        : 'What I can\'t see: why the number moved. Causes are not in the workbook; the question below is how they get found.',
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-chip px-2.5 py-1" style={{ background: 'rgba(3,70,56,0.08)', color: '#034638' }}>
      {children}
    </span>
  )
}

/**
 * The full KPI detail — chips, definition, group chart, target history,
 * BOTaina's read, provenance. One component, used by the drawer and by the
 * List view's in-place row expansion so the two never drift apart.
 */
export function KpiDetailBody({ kpi }: { kpi: Kpi }) {
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
        <Chip>{kpi.cadence === 'annual' ? 'Reported annually' : kpi.cadence === 'cyclical' ? 'Cyclical (off-year targets of 0)' : 'Continuous'}</Chip>
        <Chip>{kpi.polarity === 'Red' ? 'Lower is better' : 'Higher is better'}</Chip>
        <Chip>Data confidence: {confidenceFor(kpi)}</Chip>
      </div>

      {kpi.definition && (
        <p className="mt-4 rounded-input bg-cream/70 p-3.5 text-[13px] leading-relaxed text-ink-soft">
          {kpi.definition}
        </p>
      )}

      {/* the trend lives HERE, not on the card (R8 fixes 1/5): full history as
          bars, targets through 2028 as a dashed hollow line — future values
          visible but never dressed as actuals */}
      <div className="mt-5">
        {(() => {
          const group = kpi.chartGroup
            ? allKpis.filter((k) => k.chartGroup === kpi.chartGroup && k.entity === kpi.entity)
            : [kpi]
          const hasAny = group.some((k) => Object.values(k.actuals).some((a) => a.value !== null))
          if (!hasAny)
            return (
              <div className="flex h-[120px] items-center justify-center rounded-input bg-cream/60 px-6 text-center text-[13px] italic text-ink-mute">
                No readings on record — only the target path exists for this indicator.
              </div>
            )
          return (
            <>
              <EChart option={overlayTrendOption(group, '#034638')} height={group.length > 1 ? 250 : 220} />
              <p className="mt-1 text-[11.5px] text-ink-mute">
                Bars are reported actuals; the dashed line with hollow points is the target path, 2026–2028 included.
                {group.length > 1 && <> Charted with the other {group.length - 1} indicator{group.length > 2 ? 's' : ''} in {kpi.chartGroup}.</>}
              </p>
            </>
          )
        })()}
      </div>

      {/* target history */}
      <h3 className="label mt-6 text-ink-mute">Target history</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-ink-mute">
              <th className="py-1 pr-3 font-medium">Year</th>
              {YEARS.map((y) => (
                <th key={y} className="num px-2 py-1 text-right font-medium">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-cream">
              <td className="py-1.5 pr-3 text-ink-soft">Target</td>
              {YEARS.map((y) => (
                <td key={y} className="num px-2 py-1.5 text-right">
                  {kpi.targets[y]?.value ?? kpi.targets[y]?.raw ?? '—'}
                </td>
              ))}
            </tr>
            <tr className="border-t border-cream">
              <td className="py-1.5 pr-3 text-ink-soft">Actual</td>
              {YEARS.map((y) => {
                const key = y === '2026' ? '2026Q1' : y
                const a = kpi.actuals[key]
                return (
                  <td key={y} className="num px-2 py-1.5 text-right">
                    {a ? (a.value ?? a.raw ?? '—') : '—'}
                    {y === '2026' && a && (a.value !== null || a.raw) ? <span className="text-ink-mute"> (Q1)</span> : null}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* highlights — two kinds, never equal in authority (R8 fix 5) */}
      <h3 className="label mt-6 text-ink-mute">Highlights</h3>

      {/* client highlights: QF's own words, verbatim, when they exist. None do
          yet — the empty state says so instead of pretending the section away. */}
      <div className="mt-2 rounded-input border-l-[3px] border-cream bg-cream/50 p-4" style={{ borderLeftColor: '#c8c9c7' }}>
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-mute">From Qatar Foundation</div>
        <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-ink-mute">
          No commentary has been supplied for this indicator yet. When QF provides highlights, they appear here
          verbatim — this space is theirs, not the platform's.
        </p>
      </div>

      {/* AI highlight: BOTaina's read — clearly the machine's voice, styled as
          such, and it never borrows the client's authority */}
      <div className="mt-3 flex gap-4 rounded-panel bg-sidra p-5 text-white">
        <div className="shrink-0">
          <BotainaFigure size={62} state="speaking" />
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-white/60">BOTaina · AI highlight</div>
          {(() => {
            const r = longerRead(kpi)
            return (
              <>
                <p className="voice mt-1.5 text-[14px] leading-relaxed text-white/95">{r.read}</p>
                <p className="mt-2.5 text-[12px] italic leading-relaxed text-white/70">{r.unknown}</p>
              </>
            )
          })()}
        </div>
      </div>

      <div className="mt-4 text-[11px] text-ink-mute">
        Source: ALL sheet, row {kpi.row} · owner {kpi.entity} ·{' '}
        {kpi.reportingPeriod ?? 'reporting period not stated'}
      </div>
    </>
  )
}

export function KpiDrawer({ kpi, onClose }: { kpi: Kpi | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {kpi && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(18,40,34,0.28)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] overflow-y-auto bg-card p-7"
            style={{ borderRadius: '20px 0 0 20px', boxShadow: '-20px 0 60px rgba(23,32,61,0.25)' }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-label={`${kpi.name} detail`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5">
                  <EntityIcon entity={kpi.entity} size={30} />
                </span>
                <div>
                  <div className="label text-ink-mute">
                    {kpi.entity} · {kpi.framework} · {kpi.category}
                  </div>
                  <h2 className="mt-1.5 text-[21px] font-semibold leading-tight text-ink">{kpi.name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-chip bg-cream px-2.5 py-1 text-[13px] text-ink-soft transition-colors hover:bg-cream/70"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <KpiDetailBody kpi={kpi} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

