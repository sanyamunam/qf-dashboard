/**
 * L3 — the KPI overlay. A drawer, never a page.
 *
 * R11: five movements, in this order, with real space between them —
 *   1 header · 2 AI Summary · 3 snapshot · 4 trend · 5 highlights
 * The summary leads with the SAME line the card showed (so the verdict never
 * changes between card and overlay) and adds one sentence of consequence.
 * The snapshot is the SAME mark the card showed, larger — the anchor that
 * confirms the reader landed where they clicked. The trend is its own labelled
 * moment underneath. No tag row, no target-history table.
 */
import { motion, AnimatePresence } from 'framer-motion'
import type { Kpi } from '../model/types'
import { EChart } from './charts/EChart'
import { overlayTrendOption, aiLineFor } from './charts/builders'
import { SnapshotMark } from './charts/SnapshotMark'
import { AiRead } from './AiRead'
import { BotainaFigure } from './Botaina'
import { EntityIcon } from './EntityIcon'
import { L1MarkView, L2MarkView } from './charts/Marks2'
import { selectL1, selectL2 } from '../model/chartSelect'
import { obsRow } from '../model/obs'
import { kpis as allKpis, themeByName } from '../model/data'
import { trendHues } from './charts/trendPalette'

/**
 * The spacing scale for this panel — one generous step between the five
 * movements, always larger than any gap inside one of them (R11 fix 6).
 */
const SECTION = 38
const SECTION_CLOSE = 52

const nf = (n: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)

function confidenceFor(k: Kpi): string {
  const n = k.movementSeries.length
  if (n >= 3) return `high — ${n} readings on record`
  if (n === 2) return 'medium — 2 readings, direction only'
  return 'low — single data point; treat any trend language as premature'
}

/**
 * One sentence of consequence, written to continue the card's line rather
 * than restate it (R11 fix 4). Deliberately carries no new figures — the
 * numbers live in the charts and in AI Highlights, so the two never overlap.
 */
function expandLine(k: Kpi): string {
  if (k.state === 'ABOVE_CEILING')
    return 'A ceiling being exceeded is a decision to make rather than a gap to close, and it belongs with whoever owns the limit.'
  if (k.exactHit)
    return 'An exact match on an annual number this early usually says more about how the target was set than about the work behind it.'
  if (k.overshoot || k.state === 'TARGET_ALREADY_MET')
    return 'With three quarters still to run, what this raises is a question about how the target was calibrated, not about delivery.'
  if (k.state === 'REPORTS_AT_YEAR_END')
    return 'The next real reading arrives at year end, so there is nothing here to act on this quarter — only something to schedule.'
  if (k.state === 'IDLE_THIS_CYCLE')
    return 'A quiet quarter is the plan working here; reading it as underperformance would be the mistake.'
  const mv = k.movementSeries
  if (mv.length >= 3) {
    const rising = mv[mv.length - 1][1] > mv[0][1]
    const favourable = k.polarity === 'Green' ? rising : !rising
    return favourable
      ? 'The direction holds across the full history, which is what makes it worth understanding — and worth repeating elsewhere.'
      : 'If the delivery model changed, the target has to change with it, or the pace does — those are the only two honest options.'
  }
  if (mv.length === 0)
    return 'A missing number is a reporting question before it is a performance one, and the owner is the only one who can answer it.'
  return 'One reading sets the baseline; the second is the one that will tell you whether it means anything.'
}

/**
 * BOTaina's own notes — measurable facts and caveats the summary didn't carry.
 * Every line is derived from cells.
 */
function aiHighlights(k: Kpi): string[] {
  const out: string[] = []
  const mv = k.movementSeries
  const last = mv[mv.length - 1]
  const q1 = k.actuals['2026Q1'].value
  const t26 = k.targets['2026'].value

  if (k.polarity === 'Red') out.push('Lower is better here: this indicator has a ceiling, not a target to climb toward.')
  if (k.exactHit)
    out.push('The Q1 actual equals the full-year target to the digit — one of 15 such exact matches across the workbook.')
  if (k.overshoot && q1 !== null && t26)
    out.push(`The overshoot (${nf(q1)} against ${nf(t26)}) is a target-setting signal, not a win.`)

  // distance from the series peak, for anything with enough history to have one
  if (mv.length >= 3 && last) {
    const peak = mv.reduce((a, b) => (b[1] > a[1] ? b : a))
    if (peak[1] > 0 && peak[0] !== last[0] && last[1] / peak[1] < 0.9)
      out.push(
        `Its peak was ${nf(peak[1])} in ${peak[0] === '2026Q1' ? 'Q1 2026' : peak[0]}; the latest reading is ${Math.round((1 - last[1] / peak[1]) * 100)}% below that.`,
      )
  }

  // what the remaining target path actually asks for
  const far = k.targets['2028']?.value ?? k.targets['2027']?.value ?? null
  const farYear = k.targets['2028']?.value != null ? '2028' : '2027'
  if (far !== null && far > 0 && last && last[1] > 0 && Math.abs(far / last[1] - 1) > 0.15)
    out.push(
      far > last[1]
        ? `The target path asks for ${nf(far)} by ${farYear} — ${(far / last[1]).toFixed(1)}× the latest reading.`
        : `The target path settles at ${nf(far)} by ${farYear}, below the latest reading of ${nf(last[1])}.`,
    )

  if (k.cadence === 'annual')
    out.push('Reported annually, so quarterly movement does not exist for this indicator — only year on year.')
  if (k.cadence === 'cyclical') out.push('Cyclical: off-year targets are set to 0 by design, so zero readings alternate.')

  out.push(
    k.cadence === 'annual'
      ? "What I can't see: any within-year movement — this reports once a year, so anything said about the quarter would be a guess."
      : "What I can't see: why the number moved. Causes are not in the workbook — that answer has to come from the owner.",
  )
  return out
}

/** Each movement announces itself, so no chart needs a paragraph to explain it. */
function SectionHead({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-cream pb-2">
      <h3 className="label text-[11.5px] text-ink-mute">{children}</h3>
      {note && <span className="shrink-0 text-[11px] text-ink-mute">{note}</span>}
    </div>
  )
}

/**
 * The full KPI detail. One component, used by the drawer and by the List
 * view's in-place row expansion so the two never drift apart.
 */
export function KpiDetailBody({ kpi, group: given }: { kpi: Kpi; group?: Kpi[] | null }) {
  // the scope the reader clicked, when the caller knows it; otherwise the
  // indicator's full Name: group (right for a list row or a BOTaina handoff)
  const group =
    given && given.length > 0
      ? given
      : kpi.chartGroup
        ? allKpis.filter((k) => k.chartGroup === kpi.chartGroup && k.entity === kpi.entity)
        : [kpi]
  const hasAnyReading = group.some((k) => Object.values(k.actuals).some((a) => a.value !== null))
  /* `obs-<row>` is the id obsAsKpi stamps, and the only safe discriminator —
     the two models number their rows independently */
  const obsSource = kpi.id.startsWith('obs-') ? obsRow(kpi.row) : null

  return (
    <>
      {/* the only thing allowed between the title and the summary (R11 fix 1),
          and only when it says something the title didn't — a definition that
          merely restates the name is a box of nothing */}
      {kpi.definition && kpi.definition.trim().toLowerCase() !== kpi.name.trim().toLowerCase() && (
        <p className="mt-3.5 rounded-input bg-cream/70 p-3.5 text-[13px] leading-relaxed text-ink-soft">
          {kpi.definition}
        </p>
      )}

      {/* 2 · the verdict — the card's own line, given room and a consequence */}
      <div style={{ marginTop: SECTION }}>
        <AiRead verdict={aiLineFor(group)} body={<p>{expandLine(kpi)}</p>} />
      </div>

      {/* 3 · the anchor: the same mark the card showed, larger */}
      <section style={{ marginTop: SECTION }}>
        <SectionHead note="Q1 2026 against the full-year target">Where it stands now</SectionHead>
        {obsSource ? (
          /* an OBS row's card drew selectL1 — the overlay's anchor has to be
             that same mark, or the reader lands on a different chart from the
             one they clicked */
          /* the SAME mark, drawn larger — the svgs carry a fixed height
             attribute, so the overlay scales them here rather than forking a
             second set of components */
          <div className="mx-auto max-w-[420px] [&>svg]:h-[168px]">
            <L1MarkView mark={selectL1(obsSource, 'q1')} />
          </div>
        ) : (
          <SnapshotMark
            group={group}
            hue="#034638"
            title={kpi.chartGroup ?? undefined}
            scale="overlay"
            emptyNote="No comparable Q1 position — this indicator has no reading, or no target, to stand against this quarter."
          />
        )}
      </section>

      {/* 4 · the shape of the story, once the headline has landed. This is the
          L2 the listing card no longer carries — L1 on the surface, L2 one
          click in. */}
      <section style={{ marginTop: SECTION }}>
        <SectionHead note="actuals and targets, 2022–2028">History and outlook</SectionHead>
        {obsSource ? (
          <L2MarkView mark={selectL2(obsSource, 'q1')} hues={trendHues(themeByName(obsSource.theme ?? '').id)} />
        ) : hasAnyReading ? (
          <>
            <EChart option={overlayTrendOption(group, '#034638')} height={group.length > 1 ? 250 : 220} />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mute">
              Solid bars are reported actuals; the dashed line with hollow points is the target path, 2026–2028
              included.
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
      </section>

      {/* 5 · why — the entity's account first, the platform's second, and the
          two are never dressed alike (R11 fix 5) */}
      <section style={{ marginTop: SECTION_CLOSE }}>
        <SectionHead note="two voices, never equal authority">Highlights</SectionHead>

        <div className="rounded-input border-l-[3px] bg-cream/50 p-5" style={{ borderLeftColor: '#c8c9c7' }}>
          <div className="flex items-center gap-2">
            <EntityIcon entity={kpi.entity} size={18} />
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-mute">
              From {kpi.entity}
            </span>
          </div>
          <p className="mt-2 text-[13px] italic leading-relaxed text-ink-mute">
            No commentary has been supplied for this indicator yet. When {kpi.entity} provides highlights they appear
            here verbatim — this space is theirs, not the platform's.
          </p>
        </div>

        {/* BOTaina's own surface — the one AI green, and her avatar reduced to a
            signature badge beside the label: she attributes this text, she does
            not compete with it (R12 fix 4) */}
        <div className="mt-5 rounded-panel p-5 text-white" style={{ background: 'var(--ai-panel-gradient)' }}>
          <div className="flex items-center gap-2">
            <span className="block h-[26px] w-[26px] shrink-0 overflow-hidden rounded-full bg-white/15">
              <BotainaFigure size={26} state="speaking" />
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/70">
              BOTaina · AI highlights
            </span>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {aiHighlights(kpi).map((h) => (
              <li key={h} className="flex gap-2.5 text-[13px] leading-relaxed text-white/90">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white/45" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* quiet provenance — the metadata the tag row used to shout (R11 fix 1) */}
      <div className="mt-7 border-t border-cream pt-3 text-[11px] leading-relaxed text-ink-mute">
        {kpi.cadence === 'annual' ? 'Reported annually' : kpi.cadence === 'cyclical' ? 'Cyclical reporting' : 'Continuous reporting'} ·{' '}
        {kpi.polarity === 'Red' ? 'lower is better' : 'higher is better'} · data confidence {confidenceFor(kpi)}
        <br />
        Source: ALL sheet, row {kpi.row} · owner {kpi.entity} ·{' '}
        {kpi.reportingPeriod ?? 'reporting period not stated'}
      </div>
    </>
  )
}

export function KpiDrawer({ kpi, group, onClose }: { kpi: Kpi | null; group?: Kpi[] | null; onClose: () => void }) {
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[580px] overflow-y-auto bg-card p-7 pb-12"
            style={{ borderRadius: '20px 0 0 20px', boxShadow: '-20px 0 60px rgba(23,32,61,0.25)' }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-label={`${kpi.name} detail`}
          >
            {/* 1 · header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5">
                  <EntityIcon entity={kpi.entity} size={30} />
                </span>
                <div className="min-w-0">
                  {/* the overlay spells out what the card's logo only implies */}
                  <div className="label text-ink-mute">
                    {kpi.theme || 'Thematic area unassigned'} · {kpi.entity} · {kpi.framework} · {kpi.category}
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

            <KpiDetailBody kpi={kpi} group={group} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
