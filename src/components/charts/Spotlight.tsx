/**
 * A theme card's spotlight chart — its KPI's name, then the mark the SHARED
 * SELECTOR returns for that KPI's data shape.
 *
 * These charts were chosen ad hoc and predate the chart system: a line running
 * 2022 → Q1 26 on one axis (three months set against twelve-month years), a
 * donut, two progress bars, two columns. None of them asked what the data
 * actually supports. Now no component picks its own mark: `selectL1` and
 * `selectL2` decide, exactly as on every other surface, which also brings the
 * unit normalisation, the neutral trend colours and the target rules with them.
 */
import { CardMarkL1, CardMarkL1L2 } from './Marks2'
import { obsForKpi } from '../../model/bridge'
import type { Kpi } from '../../model/types'

/* ────────────────────────── THE EVALUATION TOGGLE ──────────────────────────
 *
 * TEMPORARY. `SpotlightMode` exists so V1 and V2 can be judged side by side on
 * real data rather than described. Once the call is made: delete this type and
 * the `mode` prop, hard-wire the winning mark below, and remove `ModeToggle`
 * from screens/Misc.tsx. Nothing else depends on it — both versions render the
 * same KPI, figure, caption, title and CTA, and differ only in whether the
 * trend is present.
 */
export type SpotlightMode = 'v1' | 'v2'

export const SPOTLIGHT_MODE_LABEL: Record<SpotlightMode, string> = {
  v1: 'V1 · Current value + trend',
  v2: 'V2 · Current value only',
}

/** One treatment for the KPI's name across all six cards. */
export function SpotlightTitle({ name, dark }: { name: string; dark?: boolean }) {
  return (
    <div
      className={`mb-2 text-[11.5px] font-semibold leading-tight ${dark ? 'text-white/80' : 'text-ink'}`}
      style={{ letterSpacing: '-0.005em' }}
    >
      {name}
    </div>
  )
}

export function SpotlightMark({
  kpi,
  mode,
  dark,
}: {
  kpi: Kpi | null | undefined
  mode: SpotlightMode
  dark?: boolean
}) {
  const row = obsForKpi(kpi)
  if (!kpi || !row)
    return (
      <div className={`text-[11.5px] italic ${dark ? 'text-white/50' : 'text-ink-mute'}`}>
        This indicator is not in the Thematic rows of the workbook, so no chart is drawn for it.
      </div>
    )
  return (
    <div>
      <SpotlightTitle name={kpi.name} dark={dark} />
      {mode === 'v1' ? <CardMarkL1L2 k={row} p="q1" /> : <CardMarkL1 k={row} p="q1" />}
    </div>
  )
}
