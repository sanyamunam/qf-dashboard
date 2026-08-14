/**
 * The brief's chart vocabulary — the same shapes the L2 thematic pages use,
 * taking plain numbers so both releases can be drawn by one set of primitives.
 * Release 2 findings come from Kpi objects; Release 1's executive rows have a
 * different shape entirely, so the reuse is at the level of the treatment and
 * the shared theme (AXIS, TOOLTIP, STATUS_COLOR) rather than the data type.
 *
 * Three treatments, no legends, nothing that needs explaining:
 *   BriefTrend  — short bar series, last emphasised, optional dashed target
 *   BriefLedger — status rows: value against target, met marked (the R10 bars)
 *   BriefFigures — a plain figure list, for findings that are about the cells
 */
import { EChart, AXIS, TOOLTIP } from '../components/charts/EChart'
import { STATUS_COLOR } from '../components/charts/builders'

const NF = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
export const n = (v: number) => NF.format(v)

const TRACK = 'rgba(200,201,199,0.4)'

/**
 * A short run of readings. The last bar is the one that matters, so it carries
 * full colour and a larger number; the rest sit back at 35%. An optional dashed
 * line marks the target or the reference year, labelled in words.
 */
export function BriefTrend({
  series,
  hue,
  target,
  targetLabel,
  unit,
  interpret,
  height,
}: {
  series: [string, number][]
  hue: string
  target?: number
  targetLabel?: string
  unit?: string
  interpret: string
  height?: number
}) {
  const last = series.length - 1
  // a long series with a wide range (WISH runs 900 to 23,150) crushes its small
  // bars against the target line at card height — give those charts more room
  const h = height ?? (series.length > 3 ? 194 : 156)
  const max = Math.max(...series.map(([, v]) => v), target ?? 0)
  return (
    <EChart
      height={h}
      option={{
        // a target line needs its own right margin: labelled inside the plot it
        // collides with whichever bar happens to sit near it (the L2 bullet
        // reserves margin the same way)
        grid: { left: 8, right: target ? 112 : 14, top: 30, bottom: 24, containLabel: true },
        tooltip: TOOLTIP(interpret),
        xAxis: { type: 'category', data: series.map(([l]) => l), ...AXIS },
        yAxis: { type: 'value', min: 0, max: max * 1.18, ...AXIS, axisLabel: { show: false }, splitLine: { show: false } },
        series: [
          {
            type: 'bar',
            name: unit ?? 'reading',
            data: series.map(([, v], i) => ({
              value: v,
              itemStyle: { color: hue, opacity: i === last ? 1 : 0.35, borderRadius: [4, 4, 0, 0] },
            })),
            barMaxWidth: 54,
            label: {
              show: true,
              position: 'top',
              fontFamily: 'Space Grotesk',
              fontWeight: 700,
              color: '#122822',
              formatter: (p: unknown) => n((p as { value: number }).value),
              fontSize: 12,
            },
            markLine: target
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { type: 'dashed', color: '#47605a', width: 1.6 },
                  label: {
                    formatter: targetLabel ?? `target ${n(target)}`,
                    // beyond the plot, in the reserved margin — never over a bar
                    position: 'end',
                    align: 'left',
                    color: '#47605a',
                    fontSize: 11,
                    fontFamily: 'Instrument Sans',
                    fontWeight: 600,
                  },
                  data: [{ yAxis: target }],
                }
              : undefined,
          },
        ],
      }}
    />
  )
}

export interface LedgerRow {
  label: string
  value: number
  target: number
  /** true when this row landed exactly on its number, not merely past it */
  exact?: boolean
}

/**
 * The status-ledger treatment locked in at R10: one track per indicator, the
 * fill showing where it stands against its own target, lime only for genuinely
 * met. Rendered in HTML rather than canvas so the labels stay crisp and the
 * numbers stay selectable.
 */
export function BriefLedger({ rows, hue }: { rows: LedgerRow[]; hue: string }) {
  const max = Math.max(...rows.map((r) => Math.max(r.value, r.target))) * 1.05
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const met = r.value >= r.target && r.target > 0
        const fill = met ? STATUS_COLOR.met.fill : hue
        const text = met ? STATUS_COLOR.met.text : '#122822'
        return (
          <div key={r.label} className="grid items-center gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 96px' }}>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] text-ink-soft">{r.label}</div>
              <div className="relative mt-1.5 h-[10px] w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
                <div
                  className="ledger-fill absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, background: fill }}
                />
                <span
                  aria-hidden
                  className="absolute inset-y-[-3px] w-[1.5px]"
                  style={{ left: `${Math.min(100, (r.target / max) * 100)}%`, background: '#47605a' }}
                />
              </div>
            </div>
            <div className="num text-right text-[13px] font-bold leading-tight" style={{ color: text }}>
              {n(r.value)}
              {met && <span style={{ color: STATUS_COLOR.met.fill }}> ✓</span>}
              <div className="text-[10.5px] font-normal text-ink-mute">of {n(r.target)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Some findings are about the cells themselves, where a chart would dress up a
 * measurement problem as a result. This is the honest shape for those: the
 * figures, side by side, in the units the sheet actually stores. `flagCol`
 * marks the column that breaks the row's own convention.
 */
export function BriefFigures({
  cols,
  rows,
  flagCol,
}: {
  cols: string[]
  rows: { label: string; values: string[]; flag?: boolean }[]
  flagCol?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="label pb-2 text-[10px] font-semibold text-ink-mute">indicator</th>
            {cols.map((c) => (
              <th key={c} className="label pb-2 pl-4 text-right text-[10px] font-semibold text-ink-mute">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-ink-mute/15">
              <td className="py-2 pr-3 text-[12.5px] text-ink-soft">{r.label}</td>
              {r.values.map((v, i) => (
                <td
                  key={i}
                  className="num py-2 pl-4 text-right text-[13px] font-semibold"
                  style={{ color: r.flag && i === flagCol ? STATUS_COLOR.breach.text : '#122822' }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
