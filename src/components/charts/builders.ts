/**
 * Chart decisions live here. The sheet's chart type is a request, not a command:
 * representation follows what the data honestly supports (time points, target,
 * unit, cap). Two KPIs with the same data shape always get the same component.
 */
import type { EChartsOption } from 'echarts'
import type { Kpi } from '../../model/types'
import { fit } from '../../model/prose'
import { AXIS, TOOLTIP, TARGET_LINE } from './EChart'

export const SERIES_PALETTE = ['#034638', '#556bb4', '#0cc1e9', '#e5a823', '#5b2e8a', '#b9dc7a', '#c8c9c7']

const YEAR_KEYS = ['2022', '2023', '2024', '2025', '2026Q1'] as const
const YEAR_LABELS: Record<string, string> = {
  '2022': '2022',
  '2023': '2023',
  '2024': '2024',
  '2025': '2025',
  '2026Q1': 'Q1 26',
}

export type Representation =
  | { kind: 'chart'; option: EChartsOption }
  | {
      kind: 'first-reading'
      rows: { kpi: Kpi; value: number | null; target: number | null; note: string }[]
    }
  | { kind: 'idle'; note: string }
  | { kind: 'not-reported'; note: string }

export interface GroupCard {
  key: string
  title: string
  kpis: Kpi[]
  rep: Representation
  aiLine: string
  entities: string[]
}

const nf = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)

function readings(k: Kpi): [string, number][] {
  return YEAR_KEYS.filter((y) => k.actuals[y]?.value !== null && k.actuals[y]?.value !== undefined).map(
    (y) => [y, k.actuals[y].value as number],
  )
}

/** Trustworthy readings for display: annual KPIs' Q1 zero-cells are artifacts. */
function honestReadings(k: Kpi): [string, number][] {
  const r = readings(k)
  if (k.cadence !== 'continuous' && r.length && r[r.length - 1][0] === '2026Q1' && r[r.length - 1][1] === 0)
    return r.slice(0, -1)
  return r
}

function buildOption(group: Kpi[], hue: string): EChartsOption {
  const perKpi = group.map((k) => honestReadings(k))
  const years = YEAR_KEYS.filter((y) => perKpi.some((r) => r.some(([yy]) => yy === y)))
  const wantsLine = /line/.test(group[0].l2Chart ?? '') && group.every((k) => k.hasEnoughHistoryForLine)
  const dualAxis = /dual axis/.test(group[0].l2Chart ?? '') && group.length === 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = group.map((k, i) => {
    const r = new Map(honestReadings(k))
    return {
      name: k.name.length > 34 ? k.name.slice(0, 32) + '…' : k.name,
      type: (wantsLine ? 'line' : 'bar') as 'line' | 'bar',
      yAxisIndex: dualAxis ? i : 0,
      data: years.map((y) => r.get(y) ?? null),
      itemStyle: { color: group.length === 1 ? hue : SERIES_PALETTE[i % SERIES_PALETTE.length], borderRadius: wantsLine ? 0 : [3, 3, 0, 0] },
      lineStyle: wantsLine ? { width: 2.4 } : undefined,
      symbolSize: 7,
      connectNulls: false,
      barMaxWidth: 26,
      label:
        years.length > 0
          ? {
              show: true,
              position: 'top' as const,
              fontFamily: 'Space Grotesk',
              fontSize: 10,
              color: '#666',
              formatter: (p: { dataIndex: number; value: number | null }) =>
                p.dataIndex === years.length - 1 && p.value !== null ? nf(p.value) : '',
            }
          : undefined,
    }
  })

  const t26 = group.length === 1 ? group[0].targets['2026'].value : null
  if (t26 !== null && t26 !== undefined && t26 > 0 && series[0]) {
    ;(series[0] as Record<string, unknown>).markLine = TARGET_LINE(t26)
  }

  return {
    grid: { left: 44, right: dualAxis ? 52 : 18, top: 28, bottom: 26 },
    legend:
      group.length > 2
        ? { bottom: 0, textStyle: { fontFamily: 'Instrument Sans', fontSize: 10.5, color: '#47605a' }, itemWidth: 10, itemHeight: 10 }
        : undefined,
    tooltip: TOOLTIP(aiLineFor(group)),
    xAxis: { type: 'category', data: years.map((y) => YEAR_LABELS[y]), ...AXIS },
    yAxis: dualAxis
      ? [
          { type: 'value', min: 0, ...AXIS },
          { type: 'value', min: 0, ...AXIS, splitLine: { show: false } },
        ]
      : { type: 'value', min: 0, ...AXIS },
    series,
  }
}

/**
 * One sentence under every chart. Verdict-shaped, comparison basis stated.
 * Each branch offers phrasings longest-first and `fit` picks the fullest one
 * that concludes inside the caller's budget — the caption is written shorter,
 * never shown shorter (R9 fix 2).
 */
export function aiLineFor(group: Kpi[], budget: number = Infinity): string {
  const k = group[0]
  const t26 = k.targets['2026'].value
  const q1 = k.actuals['2026Q1'].value
  const pick = (...c: string[]) => fit(c, budget)

  if (group.every((g) => g.state === 'IDLE_THIS_CYCLE'))
    return pick(
      `Idle by design: the 2026 target is 0 for an off-cycle year, so a quiet quarter is the plan working.`,
      `Idle by design — the 2026 target is 0 in an off-cycle year.`,
    )
  if (group.every((g) => g.state === 'REPORTS_AT_YEAR_END'))
    return pick(
      `Reports at year end; no Q1 reading exists, so no quarterly judgement is possible yet.`,
      `Reports at year end — no Q1 reading exists to judge.`,
    )
  if (k.state === 'ABOVE_CEILING')
    return pick(
      `Above its ceiling: ${nf(q1)} against a limit of ${nf(t26)}. This is the one kind of red that is real.`,
      `Above its ceiling: ${nf(q1)} against a limit of ${nf(t26)}.`,
    )

  const met = group.filter((g) => g.state === 'TARGET_ALREADY_MET')
  if (met.length === group.length && group.length > 1)
    return pick(
      `All ${group.length} already sit at or above their full-year 2026 targets after one quarter — a target-calibration question as much as a result.`,
      `All ${group.length} sit at or above their full-year 2026 targets after one quarter.`,
      `All ${group.length} are already at their 2026 targets.`,
    )
  if (met.length === group.length && group.length === 1 && !k.exactHit && k.movementSeries.length < 3)
    return pick(
      `Already at or above its full-year 2026 target (${nf(q1)} of ${nf(t26)}) with three quarters still to run — worth a look at how the target was set.`,
      `Already past its full-year 2026 target (${nf(q1)} of ${nf(t26)}) with three quarters to run.`,
      `Already past its 2026 target: ${nf(q1)} of ${nf(t26)}.`,
    )
  if (k.exactHit)
    return pick(
      `Landed exactly on its full-year target (${nf(q1)} of ${nf(t26)}) in the first quarter, which says more about the target than the work.`,
      `Landed exactly on its full-year target (${nf(q1)} of ${nf(t26)}) in the first quarter.`,
      `Exactly on its full-year target: ${nf(q1)} of ${nf(t26)}.`,
    )

  // trend statements use the parser's movement series, which excludes
  // trailing Q1 zero-cells — "0 so far this year" is never read as a decline
  const mv = k.movementSeries
  if (mv.length >= 3) {
    const first = mv[0][1]
    const last = mv[mv.length - 1][1]
    const lastYear = mv[mv.length - 1][0]
    const when = lastYear === '2026Q1' ? 'this quarter' : `in ${lastYear}`
    const shortWhen = lastYear === '2026Q1' ? 'Q1 26' : lastYear
    if (first === last)
      return pick(
        `Held at ${nf(last)} across ${mv.length} readings ending ${when}, against the ${nf(t26)} full-year 2026 target.`,
        `Held at ${nf(last)} across ${mv.length} readings, against a ${nf(t26)} 2026 target.`,
        `Held at ${nf(last)} across ${mv.length} readings.`,
      )
    const dir = last > first ? 'Up' : 'Down'
    return pick(
      `${dir} from ${nf(first)} in ${mv[0][0]} to ${nf(last)} ${when}, against the ${nf(t26)} full-year 2026 target.`,
      `${dir} from ${nf(first)} (${mv[0][0]}) to ${nf(last)} (${shortWhen}), against a ${nf(t26)} 2026 target.`,
      `${dir} from ${nf(first)} to ${nf(last)} since ${mv[0][0]}.`,
    )
  }
  if (met.length > 0 && group.length > 1)
    return pick(
      `${met.length} of ${group.length} already at the full-year 2026 target; the rest are in progress with three quarters to run.`,
      `${met.length} of ${group.length} already at the full-year 2026 target.`,
    )
  if (q1 !== null && t26)
    return pick(
      `${nf(q1)} of ${nf(t26)} at the quarter — in progress, judged against elapsed time rather than the annual number.`,
      `${nf(q1)} of ${nf(t26)} at the quarter, judged against elapsed time.`,
      `${nf(q1)} of ${nf(t26)} at the quarter.`,
    )
  return pick(
    `First reading this quarter; a baseline being set, with no comparison available yet.`,
    `First reading — a baseline, with nothing to compare against yet.`,
  )
}

export type YearKey = '2022' | '2023' | '2024' | '2025' | '2026Q1'
const targetKeyFor = (y: YearKey) => (y === '2026Q1' ? '2026' : y)

/** One line for a group viewed in a historical year — facts only, gaps stated. */
function yearLine(group: Kpi[], year: YearKey): string {
  const tk = targetKeyFor(year)
  const reported = group.filter((k) => k.actuals[year]?.value !== null)
  if (reported.length === 0) return `Not reported in ${year}. Shown so the theme's size is not misrepresented.`
  if (group.length === 1) {
    const k = group[0]
    const t = k.targets[tk]?.value
    return t !== null && t !== undefined
      ? `${year}: ${nf(k.actuals[year].value)} against a target of ${nf(t)}.`
      : `${year}: ${nf(k.actuals[year].value)}. No target was set for ${year}, so the actual stands alone.`
  }
  return `${reported.length} of ${group.length} reported in ${year}; the rest are marked, not hidden.`
}

/**
 * R8 snapshot charts: cards show current position only — never a multi-point
 * history. Representation follows the data shape (Fix 2), not the sheet's
 * literal chart-type column: a group renders as one compact actual-vs-target
 * row set; a single %-like metric gets an arc; a single count gets a bullet.
 */
export type SnapshotRep =
  | { kind: 'group-bars'; option: EChartsOption; hidden: number; rows: number; basis?: string }
  | { kind: 'bullet'; option: EChartsOption; hidden: number; rows: 1; basis?: string }
  | { kind: 'arc'; option: EChartsOption; hidden: number; rows: 1; basis?: string }
  | { kind: 'none' }

/** One indicator's standing: a value, the target it is judged against, and when. */
interface Position {
  k: Kpi
  value: number
  target: number
  year: string
}

/** Rows a grouped snapshot may show before it starts dictating card height. */
const MAX_SNAPSHOT_ROWS = 3

const short = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

const isRateLike = (k: Kpi) => k.name.includes('%') || /rate|ratio|index|nps|satisfaction/i.test(k.name)

export function snapshotFor(group: Kpi[], hue: string, maxRows: number = MAX_SNAPSHOT_ROWS): SnapshotRep {
  // a year-end or idle KPI's Q1 cell is an artifact, not a position — drawing
  // "0 of 50" for an indicator that reports in December would be a lie. The
  // same applies to any Q1 zero the parser judged "not yet reported": if the
  // movement series doesn't end at Q1, the zero is an absence, not a reading.
  const q1IsReal = (k: Kpi) => {
    const v = k.actuals['2026Q1'].value
    if (v === null) return false
    if (v !== 0) return true
    const last = k.movementSeries[k.movementSeries.length - 1]
    return last?.[0] === '2026Q1'
  }
  const withQ1: Position[] = group
    .filter(
      (k) =>
        k.state !== 'REPORTS_AT_YEAR_END' &&
        k.state !== 'IDLE_THIS_CYCLE' &&
        q1IsReal(k) &&
        (k.targets['2026'].value ?? 0) > 0,
    )
    .map((k) => ({ k, value: k.actuals['2026Q1'].value as number, target: k.targets['2026'].value as number, year: '2026Q1' }))

  /**
   * No Q1 position is not the same as nothing to show. Where an indicator has
   * a last reported year with a target of its own, the card stands it against
   * that year and says which — evidence, clearly dated, instead of an apology
   * in the space where the evidence goes (R9 fix 3).
   */
  const fallback: Position[] = group
    .map((k) => {
      const last = k.movementSeries[k.movementSeries.length - 1]
      if (!last) return null
      const tk = last[0] === '2026Q1' ? '2026' : last[0]
      const t = k.targets[tk]?.value ?? null
      return t !== null && t > 0 ? { k, value: last[1], target: t, year: last[0] } : null
    })
    .filter((p): p is Position => p !== null)

  const positions = withQ1.length > 0 ? withQ1 : fallback
  if (positions.length === 0) return { kind: 'none' }

  const years = [...new Set(positions.map((p) => p.year))]
  const basis =
    withQ1.length > 0
      ? undefined
      : years.length === 1
        ? `${years[0] === '2026Q1' ? 'Q1 2026' : years[0]} · last reported, against that year's target`
        : 'last reported year for each, against that year\'s target'

  // A grouped card always uses labelled rows, even when only one member has a
  // position: an unlabelled mark on a multi-indicator card would read as the
  // card's headline indicator when it may belong to a different one.
  if (positions.length > 1 || group.length > 1) {
    // one compact row per indicator: actual bar + target tick, shared axis.
    // The row count never changes the card's height (R9 fix 1) — beyond three
    // the card says how many it is not showing and the overlay carries them.
    const rows = positions.slice(0, maxRows)
    const max = Math.max(...rows.map((p) => Math.max(p.value, p.target)))
    return {
      kind: 'group-bars',
      hidden: positions.length - rows.length,
      rows: rows.length,
      basis,
      option: {
        grid: { left: 4, right: 44, top: 2, bottom: 2, containLabel: true },
        xAxis: { type: 'value', max: max * 1.05, show: false },
        yAxis: {
          type: 'category',
          data: rows.map((p) => short(p.k.name)).reverse(),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#666', fontFamily: 'Instrument Sans', fontSize: 10.5 },
        },
        series: [
          {
            type: 'bar',
            data: rows.map((p) => p.value).reverse(),
            barWidth: 8,
            itemStyle: { color: hue, borderRadius: [0, 3, 3, 0] },
            label: {
              show: true,
              position: 'right',
              fontFamily: 'Space Grotesk',
              fontWeight: 700,
              fontSize: 10.5,
              color: '#47605a',
              formatter: (p: unknown) => nf((p as { value: number }).value),
            },
          },
          {
            type: 'scatter',
            symbol: 'rect',
            symbolSize: [2.5, 16],
            data: rows.map((p) => p.target).reverse(),
            itemStyle: { color: '#9ca3af' },
            tooltip: { show: false },
            silent: true,
          },
        ],
      },
    }
  }

  const { k, value: a, target: t, year: pYear } = positions[0]
  // when the mark reports a year other than this quarter, the target it is
  // judged against is that year's — the label says so rather than implying 2026
  const tLabel = basis ? `${pYear === '2026Q1' ? 'Q1 2026' : pYear} target ${nf(t)}` : `target ${nf(t)}`

  if (isRateLike(k)) {
    return {
      kind: 'arc',
      hidden: 0,
      rows: 1,
      basis,
      option: {
        series: [
          {
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: Math.max(a, t) * 1.1,
            radius: '108%',
            center: ['50%', '74%'],
            progress: { show: true, width: 9, roundCap: true, itemStyle: { color: hue } },
            axisLine: { lineStyle: { width: 9, color: [[1, 'rgba(200,201,199,0.4)']] } },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            anchor: { show: false },
            title: { show: false },
            detail: {
              offsetCenter: [0, '-12%'],
              formatter: `{v|${nf(a)}}{s| of ${nf(t)}${basis ? ` · ${pYear === '2026Q1' ? 'Q1 26' : pYear}` : ''}}`,
              rich: {
                v: { fontSize: 16, fontWeight: 700, fontFamily: 'Space Grotesk', color: '#122822' },
                s: { fontSize: 10, fontFamily: 'Space Grotesk', color: '#7e938d' },
              },
            },
            data: [{ value: a }],
          },
        ],
      },
    }
  }

  const max = Math.max(a, t)
  return {
    kind: 'bullet',
    hidden: 0,
    rows: 1,
    basis,
    option: {
      grid: { left: 4, right: 46, top: '38%', bottom: '30%' },
      xAxis: { type: 'value', max: max * 1.05, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: [
        {
          type: 'bar',
          data: [a],
          barWidth: 10,
          itemStyle: { color: hue, borderRadius: [0, 3, 3, 0] },
          showBackground: true,
          backgroundStyle: { color: 'rgba(200,201,199,0.25)', borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: 'right',
            fontFamily: 'Space Grotesk',
            fontWeight: 700,
            fontSize: 11,
            color: '#47605a',
            formatter: (p: unknown) => nf((p as { value: number }).value),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'solid', color: '#9ca3af', width: 2 },
            label: {
              formatter: tLabel,
              position: 'end',
              // a target near either edge would push its label off the card,
              // so the label hangs from whichever side has the room
              align: (t / (max * 1.05) < 0.4 ? 'left' : t / (max * 1.05) > 0.72 ? 'right' : 'center') as 'left' | 'right' | 'center',
              color: '#9ca3af',
              fontSize: 9.5,
              fontFamily: 'Instrument Sans',
            },
            data: [{ xAxis: t }],
          },
        },
      ],
    },
  }
}

/**
 * The overlay's trend (Fix 5): full history plus future targets on one axis.
 * Actuals render as solid bars (honest at any point count); targets 2022–2028
 * as a dashed line with hollow markers — never styled like real data.
 */
export function overlayTrendOption(group: Kpi[], hue: string): EChartsOption {
  const AXIS_YEARS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']
  const label = (y: string) => (y === '2026' ? '2026 (Q1)' : y)
  const series: object[] = []
  group.forEach((k, i) => {
    const color = group.length === 1 ? hue : SERIES_PALETTE[i % SERIES_PALETTE.length]
    series.push({
      name: `${short(k.name, 30)} — actual`,
      type: 'bar',
      barMaxWidth: 22,
      data: AXIS_YEARS.map((y) => (y === '2026' ? k.actuals['2026Q1'].value : (k.actuals[y]?.value ?? null))),
      itemStyle: { color, borderRadius: [3, 3, 0, 0] },
      label: {
        show: true,
        position: 'top',
        fontFamily: 'Space Grotesk',
        fontSize: 9.5,
        color: '#666',
        formatter: (p: { value: number | null }) => (p.value === null ? '' : nf(p.value)),
      },
    })
    series.push({
      name: `${short(k.name, 30)} — target`,
      type: 'line',
      data: AXIS_YEARS.map((y) => k.targets[y]?.value ?? null),
      lineStyle: { type: 'dashed', width: 1.6, color },
      itemStyle: { color: '#ffffff', borderColor: color, borderWidth: 1.6 },
      symbol: 'circle',
      symbolSize: 7,
      connectNulls: true,
      z: 3,
    })
  })
  return {
    grid: { left: 44, right: 16, top: 30, bottom: group.length > 1 ? 46 : 26 },
    legend:
      group.length > 1
        ? { bottom: 0, textStyle: { fontFamily: 'Instrument Sans', fontSize: 10, color: '#47605a' }, itemWidth: 10, itemHeight: 10 }
        : undefined,
    tooltip: TOOLTIP('Dashed hollow points are targets, including future years — not actuals.'),
    xAxis: { type: 'category', data: AXIS_YEARS.map(label), ...AXIS },
    yAxis: { type: 'value', min: 0, ...AXIS },
    series: series as EChartsOption['series'],
  }
}

export function buildGroupCards(kpis: Kpi[], hue: string, year: YearKey = '2026Q1'): GroupCard[] {
  const byGroup = new Map<string, Kpi[]>()
  for (const k of kpis) {
    const key = k.chartGroup ? `g:${k.chartGroup}:${k.entity}` : `s:${k.id}`
    byGroup.set(key, [...(byGroup.get(key) ?? []), k])
  }

  // a historical year renders as uniform value tiles — that year's actual
  // against that year's target, with absences marked plainly (R6 fix 5)
  if (year !== '2026Q1') {
    const tk = targetKeyFor(year)
    return [...byGroup.entries()].map(([key, group]) => ({
      key,
      title: group[0].chartGroup ?? group[0].name,
      kpis: group,
      rep: {
        kind: 'first-reading',
        rows: group.map((k) => {
          const v = k.actuals[year]?.value ?? null
          const t = k.targets[tk]?.value ?? null
          return {
            kpi: k,
            value: v,
            target: t,
            note:
              v === null
                ? `not reported in ${year}`
                : t === null
                  ? `${year} actual · no target set that year`
                  : `${year} actual against ${year} target`,
          }
        }),
      },
      aiLine: yearLine(group, year),
      entities: [...new Set(group.map((k) => k.entity))],
    }))
  }

  return [...byGroup.entries()].map(([key, group]) => {
    const title = group[0].chartGroup ?? group[0].name
    let rep: Representation
    if (group.every((k) => k.state === 'IDLE_THIS_CYCLE')) {
      rep = { kind: 'idle', note: 'Idle this cycle — the target is 0 in an off year. Correctly quiet.' }
    } else if (group.every((k) => k.state === 'NOT_REPORTED')) {
      rep = { kind: 'not-reported', note: 'Not reported. The gap is the finding.' }
    } else if (group.every((k) => honestReadings(k).length < 3)) {
      rep = {
        kind: 'first-reading',
        rows: group.map((k) => {
          // a year-end KPI's Q1 cell is empty by design: show its last annual reading instead
          if (k.state === 'REPORTS_AT_YEAR_END') {
            const last = k.movementSeries[k.movementSeries.length - 1]
            return {
              kpi: k,
              value: last?.[1] ?? null,
              target: k.targets['2026'].value,
              note: last ? `last reading, ${last[0]} · reports at year end` : 'reports at year end · no reading yet',
            }
          }
          return {
            kpi: k,
            value: k.actuals['2026Q1'].value,
            target: k.targets['2026'].value,
            note: 'first reading · no comparison yet',
          }
        }),
      }
    } else {
      rep = { kind: 'chart', option: buildOption(group, hue) }
    }
    return {
      key,
      title,
      kpis: group,
      rep,
      aiLine: aiLineFor(group),
      entities: [...new Set(group.map((k) => k.entity))],
    }
  })
}
