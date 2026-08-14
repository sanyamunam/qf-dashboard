/**
 * Chart decisions live here. The sheet's chart type is a request, not a command:
 * representation follows what the data honestly supports (time points, target,
 * unit, cap). Two KPIs with the same data shape always get the same component.
 */
import type { EChartsOption } from 'echarts'
import type { Kpi } from '../../model/types'
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

/** One sentence under every chart. Verdict-shaped, comparison basis stated. */
export function aiLineFor(group: Kpi[]): string {
  const k = group[0]
  const t26 = k.targets['2026'].value
  const q1 = k.actuals['2026Q1'].value

  if (group.every((g) => g.state === 'IDLE_THIS_CYCLE'))
    return `Idle by design: the 2026 target is 0 for an off-cycle year, so a quiet quarter is the plan working.`
  if (group.every((g) => g.state === 'REPORTS_AT_YEAR_END'))
    return `Reports at year end; no Q1 reading exists, so no quarterly judgement is possible yet.`
  if (k.state === 'ABOVE_CEILING')
    return `Above its ceiling: ${nf(q1)} against a limit of ${nf(t26)}. This is the one kind of red that is real.`

  const met = group.filter((g) => g.state === 'TARGET_ALREADY_MET')
  if (met.length === group.length && group.length > 1)
    return `All ${group.length} already sit at or above their full-year 2026 targets after one quarter — a target-calibration question as much as a result.`
  if (met.length === group.length && group.length === 1 && !k.exactHit && k.movementSeries.length < 3)
    return `Already at or above its full-year 2026 target (${nf(q1)} of ${nf(t26)}) with three quarters still to run — worth a look at how the target was set.`
  if (k.exactHit)
    return `Landed exactly on its full-year target (${nf(q1)} of ${nf(t26)}) in the first quarter, which says more about the target than the work.`

  // trend statements use the parser's movement series, which excludes
  // trailing Q1 zero-cells — "0 so far this year" is never read as a decline
  const mv = k.movementSeries
  if (mv.length >= 3) {
    const first = mv[0][1]
    const last = mv[mv.length - 1][1]
    const when = mv[mv.length - 1][0] === '2026Q1' ? 'this quarter' : `in ${mv[mv.length - 1][0]}`
    if (first === last)
      return `Held at ${nf(last)} across ${mv.length} readings ending ${when}, against the ${nf(t26)} full-year 2026 target.`
    const dir = last > first ? 'Up' : 'Down'
    return `${dir} from ${nf(first)} in ${mv[0][0]} to ${nf(last)} ${when}, against the ${nf(t26)} full-year 2026 target.`
  }
  if (met.length > 0 && group.length > 1)
    return `${met.length} of ${group.length} already at the full-year 2026 target; the rest are in progress with three quarters to run.`
  if (q1 !== null && t26)
    return `${nf(q1)} of ${nf(t26)} at the quarter — in progress, judged against elapsed time rather than the annual number.`
  return `First reading this quarter; a baseline being set, with no comparison available yet.`
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

/* ————————————————————————————————————————————————————————————————
 * R10: executive snapshot charts. The chart itself carries the verdict —
 * colour and shape say met / on pace / behind before any number is read,
 * driven by the SAME status logic as the card's polarity arrow so the two
 * never disagree.
 * ———————————————————————————————————————————————————————————————— */

/** The chart's verdict about one indicator's Q1 position. */
export type ChartStatus = 'met' | 'onpace' | 'behind' | 'neutral' | 'breach'

/** Status colours: fill for marks, text dark enough to carry the number. */
export const STATUS_COLOR: Record<'met' | 'behind' | 'breach', { fill: string; text: string }> = {
  met: { fill: '#78be20', text: '#3f7300' }, // QF semantic lime — reserved for genuinely good news
  behind: { fill: '#dda32e', text: '#8a6512' }, // muted amber — visibly not the confident state
  breach: { fill: '#8a1538', text: '#8a1538' }, // maroon — the one real red
}

/**
 * Status for the chart, from the same engine that drives the arrow.
 * Honesty rules: pace is judged against elapsed time (Q1 = 25% of the year)
 * and ONLY for continuously-reporting indicators — an annual indicator can't
 * be "behind" in March. Ceilings never earn the lime "done" state: under a
 * ceiling is fine, not finished.
 */
export function statusOf(k: Kpi): ChartStatus {
  const v = k.actuals['2026Q1'].value
  const t = k.targets['2026'].value
  if (k.state === 'ABOVE_CEILING') return 'breach'
  if (k.polarity === 'Red') return 'neutral'
  if (k.state === 'TARGET_ALREADY_MET' || k.exactHit || (v !== null && t !== null && t > 0 && v >= t)) return 'met'
  if (k.cadence !== 'continuous') return 'neutral'
  if (v !== null && t !== null && t > 0) return v / t >= 0.25 ? 'onpace' : 'behind'
  return 'neutral'
}

const fillFor = (s: ChartStatus, hue: string) => (s === 'met' || s === 'behind' || s === 'breach' ? STATUS_COLOR[s].fill : hue)
const textFor = (s: ChartStatus) => (s === 'met' || s === 'behind' || s === 'breach' ? STATUS_COLOR[s].text : '#122822')

/**
 * A member's label inside a grouped card: the card title already says the
 * group, so words the title carries are removed ("International Partnerships"
 * under "Partnerships" → "International"). A deliberate edit, never a CSS
 * slice — if the edit leaves nothing meaningful, the full name stays.
 */
export function memberLabel(k: Kpi, title?: string): string {
  const name = k.name.replace(/^[#%]\s*/, '')
  if (!title) return name
  const titleWords = new Set(
    title
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  )
  const kept = name.split(' ').filter((w) => !titleWords.has(w.toLowerCase().replace(/\W/g, '')))
  const out = kept
    .join(' ')
    .replace(/^(?:in|of|the|for|and)\s+/i, '')
    .replace(/^[()\s]+|[()\s]+$/g, '')
    .trim()
  // "Reports and Strategic Publications" minus "Publications" leaves a
  // conjunction with no head noun — when the edit would break a phrase like
  // that, the full name is the honest label
  const removedSomething = kept.length < name.split(' ').length
  const danglingConjunction = removedSomething && /\s(?:and|or|&)\s/i.test(out)
  return out.length >= 4 && !danglingConjunction ? out : name
}

/** One indicator's standing, ready for either grouped treatment. */
export interface SnapshotRow {
  label: string
  value: number
  target: number
  status: ChartStatus
}

export type SnapshotRep =
  /* grouped: status-ledger rows, rendered in HTML by the card (R10 fix 5 — the
     client's chosen treatment; the small-multiple-arc alternative was removed
     once the two were compared live, see docs/r10-notes.md) */
  | { kind: 'group-ledger'; rows: SnapshotRow[]; max: number }
  | { kind: 'bullet'; option: EChartsOption; height: number }
  | { kind: 'arc'; option: EChartsOption; height: number }
  | { kind: 'none' }

const isRateLike = (k: Kpi) => k.name.includes('%') || /rate|ratio|index|nps|satisfaction/i.test(k.name)

const TRACK = 'rgba(200,201,199,0.4)'

/**
 * One gauge: full sweep = the target, so a full arc IS the target reached.
 * Overshoot rescales to the value and marks the target as a notch on the
 * track — the arc never lies about where the finish line was.
 */
function gaugeFor(row: SnapshotRow, hue: string, center: [string, string], radius: string, big: boolean) {
  const over = row.value > row.target
  const max = over ? row.value : row.target
  const fill = fillFor(row.status, hue)
  const met = row.status === 'met'
  const axisColor: [number, string][] = over
    ? [
        [Math.max(0.01, row.target / row.value - 0.008), TRACK],
        [Math.min(1, row.target / row.value + 0.008), '#122822'],
        [1, TRACK],
      ]
    : [[1, TRACK]]
  return {
    type: 'gauge' as const,
    startAngle: 200,
    endAngle: -20,
    min: 0,
    max,
    center,
    radius,
    progress: {
      show: true,
      width: big ? 10 : 8,
      roundCap: true,
      itemStyle: met
        ? { color: fill, shadowColor: 'rgba(120,190,32,0.5)', shadowBlur: 9 }
        : { color: fill },
    },
    axisLine: { lineStyle: { width: big ? 10 : 8, color: axisColor } },
    pointer: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    anchor: { show: false },
    title: { show: false },
    detail: {
      offsetCenter: [0, big ? '-8%' : '0%'],
      formatter: met ? `{v|${nf(row.value)}}{c| ✓}\n{s|of ${nf(row.target)}}` : `{v|${nf(row.value)}}\n{s|of ${nf(row.target)}}`,
      rich: {
        v: { fontSize: big ? 19 : 17, fontWeight: 700, fontFamily: 'Space Grotesk', color: textFor(row.status) },
        c: { fontSize: big ? 14 : 12, fontWeight: 700, fontFamily: 'Space Grotesk', color: STATUS_COLOR.met.fill },
        s: { fontSize: 10, fontFamily: 'Space Grotesk', color: '#7e938d', padding: [2, 0, 0, 0] },
      },
    },
    data: [{ value: Math.min(row.value, max) }],
  }
}

export function snapshotFor(group: Kpi[], hue: string, title?: string): SnapshotRep {
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
  const withQ1 = group.filter(
    (k) =>
      k.state !== 'REPORTS_AT_YEAR_END' &&
      k.state !== 'IDLE_THIS_CYCLE' &&
      q1IsReal(k) &&
      (k.targets['2026'].value ?? 0) > 0,
  )
  if (withQ1.length === 0) return { kind: 'none' }

  // a grouped CARD always gets the labelled treatment — even when only one
  // member has a real Q1 position, an unlabelled mark could be read as any of
  // the members, so the label stays (the R9-found ambiguity, fixed for good)
  if (withQ1.length > 1 || group.length > 1) {
    const rows: SnapshotRow[] = withQ1.slice(0, 3).map((k) => ({
      label: memberLabel(k, title),
      value: k.actuals['2026Q1'].value as number,
      target: k.targets['2026'].value as number,
      status: statusOf(k),
    }))
    return { kind: 'group-ledger', rows, max: Math.max(...rows.map((r) => Math.max(r.value, r.target))) * 1.05 }
  }

  const k = withQ1[0]
  const a = k.actuals['2026Q1'].value as number
  const t = k.targets['2026'].value as number
  const st = statusOf(k)

  if (isRateLike(k)) {
    return {
      kind: 'arc',
      height: 84,
      option: {
        series: [gaugeFor({ label: '', value: a, target: t, status: st }, hue, ['50%', '76%'], '120%', true)],
      },
    }
  }

  // single count: bullet whose fill, number and dashed target all carry status
  const met = st === 'met'
  const max = Math.max(a, t)
  return {
    kind: 'bullet',
    height: 58,
    option: {
      grid: { left: 4, right: 48, top: 21, bottom: 15 },
      xAxis: { type: 'value', max: max * 1.05, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: [
        {
          type: 'bar',
          data: [a],
          barWidth: 12,
          itemStyle: met
            ? { color: fillFor(st, hue), borderRadius: [0, 4, 4, 0], shadowColor: 'rgba(120,190,32,0.45)', shadowBlur: 7 }
            : { color: fillFor(st, hue), borderRadius: [0, 4, 4, 0] },
          showBackground: true,
          backgroundStyle: { color: 'rgba(200,201,199,0.25)', borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            fontFamily: 'Space Grotesk',
            fontWeight: 700,
            fontSize: 14,
            color: textFor(st),
            formatter: () => (met ? `${nf(a)} ✓` : nf(a)),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#47605a', width: 2 },
            label: {
              formatter: `target ${nf(t)}`,
              position: 'end',
              // a target near either edge would push its label off the card
              align: (t / (max * 1.05) < 0.35 ? 'left' : t / (max * 1.05) > 0.75 ? 'right' : 'center') as 'left' | 'center' | 'right',
              color: '#47605a',
              fontSize: 11,
              fontWeight: 600,
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
/* series legend names only — axis/card labels are never sliced (R10 fix 1) */
const short = (s: string, n = 30) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

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
