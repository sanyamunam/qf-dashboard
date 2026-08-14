/**
 * L3 — the KPI detail overlay. A drawer, never a page.
 *
 * R9 fix 6: the overlay is a briefing on one indicator, read top to bottom —
 * header, AI Summary, primary snapshot, trend, highlights. Conclusion, then
 * proof, then explanation: the same insight contract used everywhere else, so
 * the overlay feels continuous with the platform rather than a different screen.
 */
import { motion, AnimatePresence } from 'framer-motion'
import type { Kpi } from '../model/types'
import { EChart } from './charts/EChart'
import { overlayTrendOption, snapshotFor, aiLineFor } from './charts/builders'
import { AiRead } from './AiRead'
import { BotainaFigure } from './Botaina'
import { EntityIcon } from './EntityIcon'
import { kpis as allKpis } from '../model/data'

const YEARS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']
const HUE = '#034638'

function confidenceFor(k: Kpi): string {
  const n = k.movementSeries.length
  if (n >= 3) return `High — ${n} readings on record`
  if (n === 2) return 'Medium — 2 readings, direction only'
  return 'Low — single data point; treat any trend language as premature'
}

/**
 * BOTaina's read on one indicator, in the platform's insight contract:
 * verdict (what to take away) → evidence (the numbers) → so-what (why it
 * matters). The overlay leads with this so a CEO can stop after one paragraph.
 */
function kpiRead(k: Kpi): { verdict: string; evidence: string; soWhat: string } {
  const evidence = aiLineFor([k])
  if (k.state === 'ABOVE_CEILING')
    return {
      verdict: 'This one is over its limit — the only kind of red that is real here.',
      evidence,
      soWhat: 'A ceiling being exceeded is a decision to make, not a gap to close. Someone owns the response.',
    }
  if (k.exactHit)
    return {
      verdict: 'It landed exactly on its full-year target in the first quarter.',
      evidence,
      soWhat: 'An exact hit on an annual number this early says more about how the target was set than about the work.',
    }
  if (k.overshoot || k.state === 'TARGET_ALREADY_MET')
    return {
      verdict: 'The full-year target is already met, with three quarters still to run.',
      evidence,
      soWhat: 'The question is the calibration of the target, not the delivery. Ask what the number should have been.',
    }
  if (k.state === 'REPORTS_AT_YEAR_END')
    return {
      verdict: 'Nothing to judge this quarter — this indicator reports once, at year end.',
      evidence,
      soWhat: 'Any quarterly reading here would be invention. The next real number arrives in December.',
    }
  if (k.state === 'IDLE_THIS_CYCLE')
    return {
      verdict: 'Quiet by design: the 2026 target is zero in an off-cycle year.',
      evidence,
      soWhat: 'Reading this as underperformance would be a mistake — the plan is working as written.',
    }
  const mv = k.movementSeries
  if (mv.length >= 3) {
    const rising = mv[mv.length - 1][1] > mv[0][1]
    const favourable = k.polarity === 'Green' ? rising : !rising
    return {
      verdict: favourable
        ? 'The direction of travel is favourable and holds across the full history.'
        : 'The direction of travel runs against this indicator over its full history.',
      evidence,
      soWhat: favourable
        ? 'Worth understanding what is producing it, because that is the part worth repeating elsewhere.'
        : 'If the delivery model changed, the target needs to change with it — or the pace does.',
    }
  }
  if (mv.length === 0)
    return {
      verdict: 'Not reported this quarter — the absence is the finding.',
      evidence,
      soWhat: 'A missing number is a reporting question before it is a performance one. Ask the owner why.',
    }
  return {
    verdict: 'A baseline, not yet a trend.',
    evidence,
    soWhat: 'One reading sets the starting point; the second is the one that tells you anything.',
  }
}

/**
 * The pattern notes BOTaina adds on top of the summary — what the numbers
 * imply, never a restatement of the verdict. Every line is derived from cells.
 */
function aiHighlights(k: Kpi): string[] {
  const n = (v: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(v)
  const out: string[] = []
  const mv = k.movementSeries
  const last = mv[mv.length - 1]

  if (k.polarity === 'Red') out.push('Lower is better here: this indicator has a ceiling, not a target to climb toward.')
  if (k.exactHit)
    out.push('The Q1 actual equals the full-year target to the digit — one of 15 such exact matches across the workbook.')
  if (k.overshoot && k.actuals['2026Q1'].value !== null && k.targets['2026'].value)
    out.push(
      `The overshoot (${n(k.actuals['2026Q1'].value)} against ${n(k.targets['2026'].value as number)}) is a target-setting signal, not a win.`,
    )

  // distance from the series peak, for anything with enough history to have one
  if (mv.length >= 3 && last) {
    const peak = mv.reduce((a, b) => (b[1] > a[1] ? b : a))
    if (peak[1] > 0 && peak[0] !== last[0] && last[1] / peak[1] < 0.9)
      out.push(
        `Its peak was ${n(peak[1])} in ${peak[0] === '2026Q1' ? 'Q1 2026' : peak[0]}; the latest reading is ${Math.round((1 - last[1] / peak[1]) * 100)}% below that.`,
      )
  }

  // what the remaining target path actually asks for
  const far = k.targets['2028']?.value ?? k.targets['2027']?.value ?? null
  const farYear = k.targets['2028']?.value != null ? '2028' : '2027'
  if (far !== null && far > 0 && last && last[1] > 0 && Math.abs(far / last[1] - 1) > 0.15)
    out.push(
      far > last[1]
        ? `The target path asks for ${n(far)} by ${farYear} — ${(far / last[1]).toFixed(1)}× the latest reading.`
        : `The target path settles at ${n(far)} by ${farYear}, below the latest reading of ${n(last[1])}.`,
    )

  if (k.cadence === 'annual')
    out.push('Reported annually, so quarterly movement does not exist for this indicator — only year-on-year.')
  if (k.cadence === 'cyclical') out.push('Cyclical: off-year targets are set to 0 by design, so zero readings alternate.')

  out.push(
    k.cadence === 'annual'
      ? "What I can't see: any within-year movement — this reports once a year, so anything said about the quarter would be a guess."
      : "What I can't see: why the number moved. Causes are not in the workbook, which is what the ask in the summary above is for.",
  )
  return out
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-chip px-2.5 py-1" style={{ background: 'rgba(3,70,56,0.08)', color: '#034638' }}>
      {children}
    </span>
  )
}

/** Section rule — each part of the briefing is visually its own thing. */
function SectionHead({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-2.5 mt-7 flex items-baseline justify-between gap-3 border-b border-cream pb-1.5">
      <h3 className="label text-ink-mute">{children}</h3>
      {note && <span className="text-[11px] text-ink-mute">{note}</span>}
    </div>
  )
}

/**
 * The full KPI detail, in the R9 order. One component, used by the drawer and
 * by the List view's in-place row expansion so the two never drift apart.
 */
export function KpiDetailBody({ kpi }: { kpi: Kpi }) {
  const group = kpi.chartGroup
    ? allKpis.filter((k) => k.chartGroup === kpi.chartGroup && k.entity === kpi.entity)
    : [kpi]
  const read = kpiRead(kpi)
  // the overlay has room, so the snapshot shows every member of the group
  const snap = snapshotFor(group, HUE, Infinity)
  const snapH = snap.kind === 'group-bars' ? Math.max(96, snap.rows * 38 + 20) : snap.kind === 'arc' ? 132 : 96
  const hasAnyReading = group.some((k) => Object.values(k.actuals).some((a) => a.value !== null))

  return (
    <>
      {/* 1 · identity — the header sits above; this completes it */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
        <Chip>{kpi.cadence === 'annual' ? 'Reported annually' : kpi.cadence === 'cyclical' ? 'Cyclical (off-year targets of 0)' : 'Continuous'}</Chip>
        <Chip>{kpi.polarity === 'Red' ? 'Lower is better' : 'Higher is better'}</Chip>
        <Chip>Data confidence: {confidenceFor(kpi)}</Chip>
      </div>
      {kpi.definition && (
        <p className="mt-3 rounded-input bg-cream/70 p-3.5 text-[13px] leading-relaxed text-ink-soft">{kpi.definition}</p>
      )}

      {/* 2 · the verdict, first — a reader who stops here still has the headline */}
      <div className="mt-5">
        <AiRead
          verdict={read.verdict}
          body={<p>{read.evidence}</p>}
          ask={read.soWhat}
          meta={`Confidence: ${confidenceFor(kpi)}`}
        />
      </div>

      {/* 3 · where it stands now — the same snapshot as the card, larger */}
      <SectionHead note="Q1 2026 against the full-year target">Where it stands now</SectionHead>
      {snap.kind !== 'none' ? (
        <EChart option={snap.option} height={snapH} />
      ) : (
        <div className="flex h-[96px] items-center justify-center rounded-input bg-cream/60 px-6 text-center text-[13px] italic text-ink-mute">
          No comparable Q1 position — this indicator has no reading, or no target, to stand against.
        </div>
      )}

      {/* 4 · the shape of the story, after the headline */}
      <SectionHead note="actuals and targets, 2022–2028">Trend</SectionHead>
      {hasAnyReading ? (
        <>
          <EChart option={overlayTrendOption(group, HUE)} height={group.length > 1 ? 250 : 220} />
          <p className="mt-1 text-[11.5px] text-ink-mute">
            Bars are reported actuals; the dashed line with hollow points is the target path, 2026–2028 included.
            {group.length > 1 && (
              <>
                {' '}
                Charted with the other {group.length - 1} indicator{group.length > 2 ? 's' : ''} in {kpi.chartGroup}.
              </>
            )}
          </p>
        </>
      ) : (
        <div className="flex h-[120px] items-center justify-center rounded-input bg-cream/60 px-6 text-center text-[13px] italic text-ink-mute">
          No readings on record — only the target path exists for this indicator.
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
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

      {/* 5 · why — the entity's account first, the platform's second */}
      <SectionHead note="two sources, never equal authority">Highlights</SectionHead>

      <div className="rounded-input border-l-[3px] bg-cream/50 p-4" style={{ borderLeftColor: '#c8c9c7' }}>
        <div className="flex items-center gap-2">
          <EntityIcon entity={kpi.entity} size={18} />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-mute">
            {kpi.entity} highlights
          </span>
        </div>
        <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-ink-mute">
          No commentary has been supplied for this indicator yet. When {kpi.entity} provides highlights they appear
          here verbatim — this space is theirs, not the platform's.
        </p>
      </div>

      <div className="mt-3 flex gap-4 rounded-panel bg-sidra p-5 text-white">
        <div className="shrink-0">
          <BotainaFigure size={62} state="speaking" />
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-white/60">BOTaina · AI highlights</div>
          <ul className="mt-2 flex flex-col gap-2">
            {aiHighlights(kpi).map((h) => (
              <li key={h} className="flex gap-2 text-[13px] leading-relaxed text-white/90">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white/45" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[560px] overflow-y-auto bg-card p-7"
            style={{ borderRadius: '20px 0 0 20px', boxShadow: '-20px 0 60px rgba(23,32,61,0.25)' }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-label={`${kpi.name} detail`}
          >
            {/* 1 · header — entity mark, entity, name, category and framework */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5">
                  <EntityIcon entity={kpi.entity} size={30} />
                </span>
                <div className="min-w-0">
                  <div className="label text-ink-mute">
                    {kpi.entity} · {kpi.framework} · {kpi.category}
                  </div>
                  <h2 className="mt-1.5 text-[21px] font-semibold leading-tight text-ink">{kpi.name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-chip bg-cream px-2.5 py-1 text-[13px] text-ink-soft transition-colors hover:bg-cream/70"
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
