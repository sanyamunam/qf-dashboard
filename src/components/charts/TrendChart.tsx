/**
 * The L2 trend, as a real chart.
 *
 * The hand-drawn SVG could not solve the thing that actually matters here:
 * showing an actual and its target for the SAME year, both readable, without
 * stacking two numbers over one bar or hiding the target in a legend. ECharts
 * places a clustered pair per year, labels each bar above itself, and handles
 * the axis and the collision avoidance that were being hand-rolled badly.
 *
 * What does NOT change is the grammar the chart reference sets:
 *   · actual solid in the theme's hue, target neutral — status colour never
 *     appears in a trend, because a trend makes no verdict
 *   · a year with no target has NO target bar. Never back-filled: only
 *     30/43/42/47 of 240 rows carry a historical target
 *   · the most recent reported period is emphasised
 *   · Q1 2026 is never on this axis — `selectL2` supplies completed years and
 *     committed future years only
 */
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { fmt } from '../../model/data'
import type { TrendPoint, PartialReading } from '../../model/chartSelect'
import type { TrendHues } from './trendPalette'
import { TREND_TARGET, TREND_TARGET_DARK, TREND_RULE, TREND_RULE_DARK, TREND_AXIS_INK, TREND_AXIS_INK_DARK, TREND_DARK } from './trendPalette'

const compact = (n: number) => {
  const a = Math.abs(n)
  return a >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : a >= 10_000 ? `${Math.round(n / 1000)}k` : fmt(n)
}

export function TrendChart({
  points,
  partial,
  unit,
  hues,
  kind,
  dark,
  narrow,
  maxReported,
  height = 208,
}: {
  points: TrendPoint[]
  /** the quarter to date, drawn in its own year's column and marked as a
   *  different length of time — never a point on the annual series */
  partial?: PartialReading | null
  unit: string
  hues: TrendHues
  kind: 'bars' | 'line'
  dark?: boolean
  /** a column too narrow to carry a label per bar — see `label` below */
  narrow?: boolean
  /**
   * How many REPORTED years a card may show. A card is a summary and the
   * overlay is the record, so the oldest years are dropped here and kept
   * there: WISH Beneficiaries peaked at 30,000 in 2022 and reads 900 now, and
   * on one linear axis that 2022 column squashed every recent bar to a
   * sliver. Committed future years are never trimmed — they are the whole
   * point of the right-hand half.
   */
  maxReported?: number
  height?: number
}) {
  /* On the navy band the THEME hue is navy too — Organizational Excellence is
     #2b3242 — so the latest bar was navy on navy and its label invisible. The
     whole skin inverts together or none of it does. */
  const series0 = dark ? TREND_DARK : hues
  const target = dark ? TREND_TARGET_DARK : TREND_TARGET
  const rule = dark ? TREND_RULE_DARK : TREND_RULE
  const axis = dark ? TREND_AXIS_INK_DARK : TREND_AXIS_INK
  const reported = points.filter((p) => !p.future)
  const dropped = maxReported && reported.length > maxReported ? reported.length - maxReported : 0
  const shown = dropped ? [...reported.slice(dropped), ...points.filter((p) => p.future)] : points
  const droppedYears = dropped ? reported.slice(0, dropped).map((p) => p.year) : []

  const hasTarget = shown.some((p) => p.target !== null)
  /* the quarter sits in its own year's column, beside that year's commitment */
  const partialIdx = partial ? shown.findIndex((p) => p.year === partial.year) : -1
  const showPartial = partialIdx >= 0
  const actuals = shown.map((p) => p.actual)
  const lastIdx = actuals.reduce((acc, v, i) => (v !== null ? i : acc), -1)
  /**
   * At full card width every bar carries its value. The enabling-function band
   * gives each chart about 215px for seven clustered pairs — roughly 12px per
   * bar — and no label fits there, so ECharts dropped them by collision and
   * the card showed a row of targets and not one actual. In a narrow column
   * only the latest reading is labelled and the rest live in the tooltip: one
   * legible number beats seven that were never drawn.
   */
  const label = (color: string, opts?: { onlyLatest?: boolean; off?: boolean; hideIfSameAsActual?: boolean }) => ({
    show: !opts?.off,
    position: 'top' as const,
    fontFamily: 'Space Grotesk',
    fontSize: 9,
    fontWeight: 600 as const,
    color,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatter: (d: any) =>
      d.value === null ||
      d.value === undefined ||
      (opts?.onlyLatest && d.dataIndex !== lastIdx) ||
      /* a target equal to its year's actual printed the same number twice,
         side by side — "2,0002,000". One of them is enough. */
      (opts?.hideIfSameAsActual && shown[d.dataIndex]?.actual === d.value)
        ? ''
        : `${compact(d.value as number)}${unit}`,
  })

  /** the latest reported period carries the full hue; earlier ones the tint */
  const actualStyle = (i: number) => ({ color: i === lastIdx ? series0.now : series0.past, borderRadius: [3, 3, 0, 0] as [number, number, number, number] })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = (
    kind === 'bars'
      ? [
          {
            /* the target is its own bar beside the actual, not a tick on it and
               not a second number above it — the comparison the card exists to
               make is now a side-by-side one.

               DECLARED FIRST on purpose: `hideOverlap` resolves a collision in
               favour of the series laid out LAST, so with the actual declared
               first its labels were the ones dropped and the narrow OE band
               showed nothing but targets. The actual is the reading; it never
               yields. `z` still puts it in front. */
            name: 'Target',
            type: 'bar',
            data: shown.map((p) => p.target),
            barMaxWidth: 24,
            itemStyle: { color: 'transparent', borderColor: target, borderWidth: 1.4, borderType: 'dashed', borderRadius: [3, 3, 0, 0] },
            label: label(target, { off: narrow, hideIfSameAsActual: true }),
            labelLayout: { hideOverlap: true },
            z: 2,
          },
          {
            name: 'Actual',
            type: 'bar',
            data: shown.map((p, i) => (p.actual === null ? null : { value: p.actual, itemStyle: actualStyle(i) })),
            barMaxWidth: 24,
            barGap: '18%',
            barCategoryGap: '32%',
            label: label(series0.now, { onlyLatest: narrow }),
            z: 3,
          },
          /* a HATCHED bar, in its year's column and named for the quarter it
             covers. Solid would read as another completed year; the decal and
             the legend both say three months, not twelve. */
          ...(showPartial
            ? [
                {
                  name: partial!.label,
                  type: 'bar',
                  data: shown.map((_p, i) => (i === partialIdx ? partial!.value : null)),
                  barMaxWidth: 24,
                  itemStyle: {
                    color: series0.now,
                    opacity: 0.55,
                    borderRadius: [3, 3, 0, 0],
                    decal: { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [3, 4], rotation: -Math.PI / 4, color: dark ? 'rgba(31,42,68,0.65)' : 'rgba(255,255,255,0.75)' },
                  },
                  label: label(series0.now),
                  z: 4,
                },
              ]
            : []),
        ]
      : [
          {
            name: 'Target',
            type: 'line',
            data: shown.map((p) => p.target),
            lineStyle: { type: 'dashed', width: 2, color: target },
            itemStyle: { color: dark ? '#1f2a44' : '#fff', borderColor: target, borderWidth: 1.6 },
            symbol: 'circle',
            symbolSize: 8,
            /* a year that set no target is a gap, not a point to draw through */
            connectNulls: false,
            label: label(target, { off: narrow, hideIfSameAsActual: true }),
            labelLayout: { hideOverlap: true },
            z: 2,
          },
          {
            name: 'Actual',
            type: 'line',
            data: shown.map((p, i) => (p.actual === null ? null : { value: p.actual, itemStyle: actualStyle(i) })),
            lineStyle: { width: 2.5, color: series0.now },
            itemStyle: { color: series0.now },
            symbol: 'circle',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            symbolSize: ((_v: any, d: any) => (d.dataIndex === lastIdx ? 11 : 7)) as any,
            connectNulls: false,
            label: label(series0.now, { onlyLatest: narrow }),
            z: 3,
          },
          /* a lone hollow marker, never joined to the annual line — joining it
             would draw a trajectory across two different lengths of time */
          ...(showPartial
            ? [
                {
                  name: partial!.label,
                  type: 'scatter',
                  data: shown.map((_p, i) => (i === partialIdx ? partial!.value : null)),
                  symbol: 'diamond',
                  symbolSize: 12,
                  itemStyle: { color: dark ? '#1f2a44' : '#fff', borderColor: series0.now, borderWidth: 2 },
                  label: label(series0.now),
                  z: 4,
                },
              ]
            : []),
        ]
  ).filter((sr) => hasTarget || sr.name !== 'Target')

  const option: EChartsOption = {
    /* containLabel reserves room for AXIS labels only — the outermost data
       label was running past the card edge, so the grid keeps its own margin */
    grid: { left: 16, right: 16, top: 28, bottom: 36, containLabel: true },
    legend: {
      bottom: 0,
      left: 0,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 14,
      textStyle: { color: axis, fontFamily: 'Instrument Sans', fontSize: 10.5 },
      /* a KPI with no target anywhere gets no Target key — the legend was
         naming a series that draws nothing */
      data: [
        { name: 'Actual', icon: kind === 'bars' ? 'roundRect' : 'line', itemStyle: { color: series0.now } },
        ...(hasTarget
          ? [{ name: 'Target', icon: kind === 'bars' ? 'roundRect' : 'line', itemStyle: { color: 'transparent', borderColor: target, borderWidth: 1.4 }, lineStyle: { color: target, type: 'dashed' as const } }]
          : []),
        ...(showPartial
          ? [{ name: partial!.label, icon: kind === 'bars' ? 'roundRect' : 'diamond', itemStyle: { color: series0.now, opacity: 0.55, borderColor: series0.now } }]
          : []),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a4a3e',
      borderWidth: 0,
      textStyle: { color: '#fff', fontFamily: 'Space Grotesk', fontSize: 12 },
      formatter: (params: unknown) => {
        const list = (Array.isArray(params) ? params : [params]) as { axisValueLabel?: string; seriesName?: string; value?: number | null; marker?: string }[]
        const rows = list
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p) => `${p.marker} ${p.seriesName}: <b>${fmt(p.value as number)}${unit}</b>`)
          .join('<br/>')
        return `<div style="font-family:'Instrument Sans'">${list[0]?.axisValueLabel ?? ''}</div>${rows || 'not reported'}`
      },
    },
    xAxis: {
      type: 'category',
      data: shown.map((p) => p.year),
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false },
      /* every year named — two labels and five unlabelled bars left a reader
         unable to say which bar was which year */
      axisLabel: {
        interval: 0,
        color: axis,
        fontFamily: 'Instrument Sans',
        fontSize: 10,
        formatter: (v: string, i: number) => (i === lastIdx ? `{now|${v}}` : v),
        rich: { now: { color: dark ? '#fff' : series0.now, fontWeight: 700, fontFamily: 'Instrument Sans', fontSize: 10 } },
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } },
    },
    series,
  }
  return (
    <>
      <EChart option={option} height={height} />
      {/* a trimmed series says so — a chart that silently starts at 2023 would
          misstate how long this indicator has been running */}
      {dropped > 0 && (
        <p className="mt-1 text-[9.5px] leading-tight" style={{ color: axis }}>
          {droppedYears.join(', ')} {dropped === 1 ? 'is' : 'are'} in the indicator's detail view
        </p>
      )}
    </>
  )
}
