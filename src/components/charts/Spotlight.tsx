/**
 * A theme card's spotlight — its ONE indicator, drawn the way
 * Al-Mishkat-chart-types-reference.html specifies for that data shape.
 *
 * The old marks were chosen ad hoc AND, worse, plotted different indicators
 * from the ones their cards' headline figures named: Sustainability showed
 * Ecoschool Beneficiaries as its figure and then a donut of Ecoschool
 * Certification over Registrations — three KPIs on one card. One card, one
 * KPI, and the mark is `selectL1`/`selectL2`'s, never this component's.
 */
import { CardMarkL1, L2MarkView, CARD_YEARS } from './Marks2'
import { selectL2 } from '../../model/chartSelect'
import { trendHues } from './trendPalette'
import { themeByName } from '../../model/data'
import { EntityIcon } from '../EntityIcon'
import { obsForKpi } from '../../model/bridge'
import { statusFor, STATUS_LABEL, STATUS_DOT } from '../../model/dash'
import type { Kpi } from '../../model/types'

/** The KPI's own name, its owner, and its status — one treatment on all six. */
export function SpotlightIdentity({ kpi, dark }: { kpi: Kpi; dark?: boolean }) {
  const row = obsForKpi(kpi)
  const s = row ? statusFor(row, 'q1') : null
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-[1px] shrink-0">
        <EntityIcon entity={kpi.entity} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[12.5px] font-semibold leading-tight ${dark ? 'text-white/90' : 'text-ink'}`}>
          {kpi.name}
        </span>
        {s && (
          <span
            className={`mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${dark ? 'text-white/60' : 'text-ink-soft'}`}
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[s] }} />
            {STATUS_LABEL[s]}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * ONE mark per card: the trend where there is one, the current-value mark
 * where there isn't. Never both.
 *
 * Drawing L1 and L2 together said the same thing twice — Social Progress
 * carried a bullet reading 900 of 5,000 directly above a bar trend whose last
 * bar was the same indicator, and the card read as two charts of one number.
 * The trend is the richer view wherever the history supports it, so it wins;
 * `selectL2` returns `none` for the four spotlights with no 2022–25 readings,
 * and those fall back to L1 — which is exactly the reference's W case, "these
 * carry their L1 current-value mark only".
 *
 * The choice is still the selector's: this asks whether a trend exists, it
 * does not decide what either mark looks like.
 */
export function SpotlightMark({ kpi, dark }: { kpi: Kpi | null | undefined; dark?: boolean }) {
  const row = obsForKpi(kpi)
  if (!kpi || !row)
    return (
      <div className={`text-[11.5px] italic ${dark ? 'text-white/50' : 'text-ink-mute'}`}>
        This indicator is not among the Thematic rows of the workbook, so no chart is drawn for it.
      </div>
    )
  const l2 = selectL2(row, 'q1')
  if (l2.kind !== 'none')
    /* the enabling-function band gives each chart ~215px; the theme cards give
       it the full card width */
    return <L2MarkView mark={l2} hues={trendHues(themeByName(row.theme ?? '').id)} dark={dark} narrow={dark} maxReported={CARD_YEARS} />
  return <CardMarkL1 k={row} p="q1" dark={dark} />
}

/** Identity above, mark below — the order every card uses. */
export function Spotlight({ kpi, dark }: { kpi: Kpi | null | undefined; dark?: boolean }) {
  if (!kpi) return null
  return (
    <div>
      <SpotlightIdentity kpi={kpi} dark={dark} />
      <div className="mt-3">
        <SpotlightMark kpi={kpi} dark={dark} />
      </div>
    </div>
  )
}
