/**
 * Chart decisions live here. The sheet's chart type is a request, not a command:
 * representation follows what the data honestly supports (time points, target,
 * unit, cap). Two KPIs with the same data shape always get the same component.
 */
import type { EChartsOption } from 'echarts'
import { TREND_ACTUAL, TREND_TARGET } from './trendPalette'
import type { Kpi } from '../../model/types'
import { obsForKpi } from '../../model/bridge'
import { statusFor, statusForYear, paceMarkerFor, type DashStatus } from '../../model/status'
import { L1_FILL, L1_INK, L1_MIN_FILL_PCT } from './l1Palette'
import { AXIS, TOOLTIP, TARGET_LINE } from './EChart'
import { BAR_RADIUS } from './chartType'

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
      itemStyle: { color: group.length === 1 ? hue : SERIES_PALETTE[i % SERIES_PALETTE.length], borderRadius: wantsLine ? 0 : BAR_RADIUS },
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

  /* Stopped reporting: an indicator that reports during the year, has reported
     before, and returned nothing this quarter. The caption must state THAT and
     not narrate a closed year, or the words disagree with the mark beside them. */
  const stoppedReporting =
    q1 === 0 &&
    k.cadence !== 'annual' &&
    k.state !== 'IDLE_THIS_CYCLE' &&
    k.movementSeries.some(([, v]) => v > 0)
  if (group.length === 1 && stoppedReporting) {
    const lastReported = k.movementSeries[k.movementSeries.length - 1]
    return `Nothing reported this quarter, after ${nf(lastReported[1])} in ${lastReported[0]}${
      t26 ? `, against a ${nf(t26)} target for 2026` : ''
    }. The gap is the finding.`
  }

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
  /**
   * The old line here read "…judged against elapsed time rather than the
   * annual number", which is now the opposite of what the platform does:
   * attainment IS the annual number, and elapsed time only decides where At
   * risk begins. It also repeated on every card in a theme.
   *
   * Where the bar carries a "by now" tick the caption says nothing at all —
   * the mark shows the position, and a sentence restating it is noise. The
   * card hides an empty caption rather than drawing a rule and an icon
   * around one.
   */
  if (q1 !== null && t26 && paceOf(k) !== null) return ''
  if (q1 !== null && t26)
    return `${nf(q1)} of ${nf(t26)} for the full year, with three quarters still to run.`
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
  behind: { fill: '#c98a1e', text: '#8a6512' }, // deepened off Progressive Education's #e5a823, which it sat ΔE 5.9 from — indistinguishable
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

/**
 * An L1 fill is the KPI's STATUS, full stop.
 *
 * These used to fall back to `hue` — the theme colour — for the two
 * `ChartStatus` values that had no colour of their own (`onpace`, `neutral`).
 * That is how a Social Progress indicator behind target came to be drawn in
 * Social Progress indigo, and a Sustainability one in a green almost identical
 * to the on-target green. The `hue` parameter is gone from both; a mark that
 * cannot say how an indicator is doing must not borrow a colour that says
 * something else instead.
 */
const fillFor = (tone: DashStatus) => L1_FILL[tone]
const textFor = (tone: DashStatus) => L1_INK[tone]

/**
 * The Release-2 card model and the OBS workbook are the same indicators
 * recorded twice, so a card resolves to its row before asking the platform's
 * one `statusFor`. All 151 thematic rows resolve; an unlocatable one takes the
 * no-verdict grey, never a theme colour.
 */
export const toneOf = (k: Kpi): DashStatus => {
  const row = obsForKpi(k)
  return row ? statusFor(row, 'q1') : 'noTarget'
}

/**
 * Where an evenly-delivered indicator would stand by now — the SAME
 * `paceMarkerFor` the OBS bullet draws, so the tick on a thematic card and the
 * tick on a search card mark the same thing. Null where drawing one would say
 * nothing.
 */
export const paceOf = (k: Kpi): number | null => {
  const row = obsForKpi(k)
  return row ? paceMarkerFor(row, 'q1') : null
}

/**
 * The verdict for the period the mark is ACTUALLY showing.
 *
 * A dated position reports a closed year against that year's target, so it
 * must be graded against that year — grading it by the quarter returned
 * `notReported` and painted the bar grey, which is the grey the reader saw.
 */
const toneForYear = (k: Kpi, year: string): DashStatus => {
  const row = obsForKpi(k)
  if (!row) return 'noTarget'
  return year === '2026Q1' ? statusFor(row, 'q1') : statusForYear(row, year)
}

export const yearLabel = (y: string) => (y === '2026Q1' ? 'Q1 2026' : y)

/**
 * Status colour is reserved for the CURRENT period, full stop.
 *
 * R13 graded a dated fallback reading against that closed year's target
 * (`closedYearStatus`, now removed). That is what let a 2025 figure earn a
 * green met-target treatment on a card reporting Q1 2026, and it is the same
 * class of error whichever year it flatters. A dated reading is still shown —
 * with its year inline and the target it stood against — but it is rendered
 * neutral, because "met" and "behind" are claims about now.
 */
const DATED_STATUS: ChartStatus = 'neutral'

/** One indicator's standing: a value, the target it is judged against, and when. */
interface Position {
  k: Kpi
  value: number
  target: number
  year: string
  status: ChartStatus
  /** the platform's verdict — what actually colours the mark */
  tone: DashStatus
  /** where an even delivery would stand by now, or null */
  pace: number | null
}

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
  /** the platform's verdict — what actually colours the bar. `status` above is
   *  the legacy five-value shape, kept only for the ✓ and the glow. */
  tone: DashStatus
  /** where an even delivery would stand by now, or null */
  pace: number | null
  /** set ONLY when the figure is not this quarter's — rendered inline beside
   *  the number, so a prior year's reading can never pass for a current one */
  year?: string
}

export type SnapshotRep =
  /* grouped: status-ledger rows, rendered in HTML by the card (R10 fix 5 — the
     client's chosen treatment; the small-multiple-arc alternative was removed
     once the two were compared live, see docs/r10-notes.md).
     `basis` is set only when the mark reports a year other than this quarter. */
  | { kind: 'group-ledger'; rows: SnapshotRow[]; max: number; basis?: string }
  | { kind: 'bullet'; option: EChartsOption; height: number; basis?: string }
  | { kind: 'arc'; option: EChartsOption; height: number; basis?: string }
  | { kind: 'none' }

const isRateLike = (k: Kpi) => k.name.includes('%') || /rate|ratio|index|nps|satisfaction/i.test(k.name)

const TRACK = 'rgba(200,201,199,0.4)'

/** Where a snapshot is being drawn: the card, or the overlay's larger anchor. */
export type ChartScale = 'card' | 'overlay'

/**
 * One gauge: full sweep = the target, so a full arc IS the target reached.
 * Overshoot rescales to the value and marks the target as a notch on the
 * track — the arc never lies about where the finish line was.
 */
function gaugeFor(
  row: SnapshotRow,
  /* no `hue` parameter, deliberately: an arc is an L1 mark and takes its
     colour from `row.tone`. A theme colour has no way back in from here. */
  center: [string, string],
  radius: string,
  sz: { ring: number; v: number; c: number; s: number; offset: string },
  /** year note, when the arc reports a year other than this quarter */
  sub?: string,
) {
  const over = row.value > row.target
  const max = over ? row.value : row.target
  const fill = fillFor(row.tone)
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
      width: sz.ring,
      roundCap: true,
      itemStyle: met
        ? { color: fill, shadowColor: 'rgba(120,190,32,0.5)', shadowBlur: 9 }
        : { color: fill },
    },
    axisLine: { lineStyle: { width: sz.ring, color: axisColor } },
    pointer: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    anchor: { show: false },
    title: { show: false },
    detail: {
      offsetCenter: [0, sz.offset],
      formatter: `{v|${nf(row.value)}}${met ? '{c| ✓}' : ''}\n{s|of ${nf(row.target)}${sub ? ` · ${sub}` : ''}}`,
      rich: {
        v: { fontSize: sz.v, fontWeight: 700, fontFamily: 'Space Grotesk', color: textFor(row.tone) },
        c: { fontSize: sz.c, fontWeight: 700, fontFamily: 'Space Grotesk', color: STATUS_COLOR.met.fill },
        s: { fontSize: sz.s, fontFamily: 'Space Grotesk', color: '#7e938d', padding: [2, 0, 0, 0] },
      },
    },
    data: [{ value: Math.min(row.value, max) }],
  }
}

export function snapshotFor(group: Kpi[], hue: string, title?: string, scale: ChartScale = 'card'): SnapshotRep {
  // the overlay draws the same mark as the card, larger (R11 fix 2)
  const big = scale === 'overlay'
  /**
   * A year-end or idle KPI's Q1 cell is an artifact, not a position — drawing
   * "0 of 50" for an indicator that reports in December would be a lie. Those
   * are excluded by STATE in the filter below, which is the only sound test.
   *
   * Everything else that has a Q1 cell has a real reading, INCLUDING a zero.
   * This previously also required the movement series to end at Q1, and since
   * the parser strips trailing Q1 zeros from that series, every genuine zero
   * failed the test, fell through to the stale-year fallback, and was graded
   * against a closed year's target — which rendered eight indicators that
   * delivered nothing this quarter as green, met-target cards while they sat
   * in Needs Attention. A zero from an indicator that reports during the year
   * is the finding, not an absence.
   */
  const q1IsReal = (k: Kpi) => k.actuals['2026Q1'].value !== null
  const q1Positions: Position[] = group
    .filter(
      (k) =>
        k.state !== 'REPORTS_AT_YEAR_END' &&
        k.state !== 'IDLE_THIS_CYCLE' &&
        q1IsReal(k) &&
        /* a zero target is a real target when lower is better — Budget
           Variance's ceiling IS 0. A zero target on a Green KPI stays
           excluded: that is the cyclical off-year artifact. */
        ((k.targets['2026'].value ?? 0) > 0 || (k.polarity === 'Red' && k.targets['2026'].value === 0)),
    )
    .map((k) => ({
      k,
      value: k.actuals['2026Q1'].value as number,
      target: k.targets['2026'].value as number,
      year: '2026Q1',
      status: statusOf(k),
      tone: toneOf(k),
      pace: paceOf(k),
    }))

  /**
   * R13: having no Q1 position is not the same as having nothing to show.
   * Where an indicator's last reported year has a target of its own, the card
   * stands it against THAT year and says which — dated evidence instead of a
   * bare figure. What it must never do is chart a 2025 actual against the 2026
   * target: that would claim progress this quarter that has not been reported.
   */
  const fallback: Position[] = group
    .map((k) => {
      // No state exclusion here, unlike the Q1 path. Those exclusions guard
      // against reading a year-end or off-cycle indicator's Q1 CELL, which is
      // an artifact — they say nothing about its history. A year-end reporter's
      // last closed year against that year's own target is a real reading, and
      // is exactly the case this fallback exists for.
      const last = k.movementSeries[k.movementSeries.length - 1]
      if (!last) return null
      const tk = last[0] === '2026Q1' ? '2026' : last[0]
      const t = k.targets[tk]?.value ?? null
      if (t === null || (t <= 0 && !(k.polarity === 'Red' && t === 0))) return null
      return { k, value: last[1], target: t, year: last[0], status: DATED_STATUS, tone: toneForYear(k, last[0]), pace: null as number | null }
    })
    .filter((p): p is Position => p !== null)

  const positions = q1Positions.length > 0 ? q1Positions : fallback
  if (positions.length === 0) return { kind: 'none' }

  // when the mark reports a year other than this quarter, every label says so
  const years = [...new Set(positions.map((p) => p.year))]
  const basis =
    q1Positions.length > 0
      ? undefined
      : years.length === 1
        ? `${yearLabel(years[0])} · last reported, against that year's target`
        : "last reported year for each, against that year's target"

  // a grouped CARD always gets the labelled treatment — even when only one
  // member has a real position, an unlabelled mark could be read as any of
  // the members, so the label stays (the R9-found ambiguity, fixed for good)
  if (positions.length > 1 || group.length > 1) {
    // Sheet order, always. The card receives its group already sorted by
    // whatever L2 sort is active while the overlay reads the raw set, so
    // without this the same group's rows appear in two different orders
    // between the card and the overlay opened from it (R11 fix 2).
    const ordered = [...positions].sort((a, b) => a.k.row - b.k.row)
    // the card caps at three rows to keep its footprint fixed; the overlay has
    // the room to show every member of the group
    const rows: SnapshotRow[] = ordered.slice(0, big ? 8 : 3).map((p) => ({
      label: memberLabel(p.k, title),
      value: p.value,
      target: p.target,
      status: p.status,
      tone: p.tone,
      pace: p.pace,
      year: p.year === '2026Q1' ? undefined : yearLabel(p.year),
    }))
    return {
      kind: 'group-ledger',
      rows,
      basis,
      max: Math.max(...rows.map((r) => Math.max(r.value, r.target))) * 1.05,
    }
  }

  const { k, value: a, target: t, status: st, tone, pace, year: pYear } = positions[0]

  /* A single indicator with nothing reported draws NO mark. Its Q1 cell holds
     a literal 0 in the Release-2 model, so without this it rendered a bar that
     said "0 of 130" for a quarter nobody submitted — and then had to be
     painted grey, because an absence has no verdict to colour it with. The
     card's own note says what happened instead. */
  if (tone === 'notReported') return { kind: 'none' }

  if (isRateLike(k)) {
    return {
      kind: 'arc',
      height: big ? 172 : 84,
      basis,
      option: {
        series: [
          gaugeFor(
            { label: '', value: a, target: t, status: st, tone, pace },
            ['50%', '76%'],
            big ? '126%' : '120%',
            big
              ? { ring: 17, v: 36, c: 25, s: 15, offset: '-6%' }
              : { ring: 10, v: 19, c: 14, s: 10, offset: '-8%' },
            basis ? yearLabel(pYear) : undefined,
          ),
        ],
      },
    }
  }

  // single count: bullet whose fill, number and dashed target all carry status
  const met = st === 'met'
  const max = Math.max(a, t)
  return {
    kind: 'bullet',
    height: big ? 104 : 58,
    basis,
    option: {
      grid: big
        ? { left: 6, right: 88, top: 38, bottom: 26 }
        : { left: 4, right: 48, top: 21, bottom: 15 },
      xAxis: { type: 'value', max: max * 1.05, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: [
        {
          type: 'bar',
          /* A reading of ZERO still draws a bar. Plotted at 0 the series
             renders nothing at all, so an indicator that delivered none of its
             target looked identical to one with no mark — the two states the
             platform works hardest to keep apart. The stub is the same
             minimum the ledger rows use; the label below prints the true 0,
             so nothing here overstates the reading. */
          data: [a === 0 ? (max * 1.05 * L1_MIN_FILL_PCT) / 100 : a],
          barWidth: big ? 22 : 12,
          itemStyle: met
            ? { color: fillFor(tone), borderRadius: [0, 6, 6, 0], shadowColor: 'rgba(120,190,32,0.45)', shadowBlur: 7 }
            : { color: fillFor(tone), borderRadius: [0, 6, 6, 0] },
          showBackground: true,
          backgroundStyle: { color: 'rgba(200,201,199,0.25)', borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: 'right',
            fontFamily: 'Space Grotesk',
            fontWeight: 700,
            fontSize: big ? 26 : 14,
            color: textFor(tone),
            // the year rides with the number whenever it isn't this quarter's
            formatter: () => `${nf(a)}${met ? ' ✓' : ''}${basis ? ` (${yearLabel(pYear)})` : ''}`,
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#47605a', width: big ? 2.5 : 2 },
            label: {
              formatter: basis ? `${yearLabel(pYear)} target ${nf(t)}` : `target ${nf(t)}`,
              position: 'end',
              // a target near either edge would push its label off the card
              align: (t / (max * 1.05) < 0.35 ? 'left' : t / (max * 1.05) > 0.75 ? 'right' : 'center') as 'left' | 'center' | 'right',
              color: '#47605a',
              fontSize: big ? 13 : 11,
              fontWeight: 600,
              fontFamily: 'Instrument Sans',
            },
            /* the commitment, and — where one exists — the dashed "by now"
               tick marking where an even delivery would stand at the end of
               the quarter. The pace mark is deliberately lighter and thinner
               than the target: the commitment is the reference that matters,
               and two marks of equal weight would leave the reader deciding
               which is which. Red begins behind this tick, so the bar and the
               status label are the same claim. */
            data: [
              { xAxis: t },
              ...(pace !== null
                ? [
                    {
                      xAxis: pace,
                      lineStyle: { type: 'dotted' as const, color: '#989a9c', width: 1.5 },
                      label: {
                        formatter: 'by now',
                        position: 'end' as const,
                        color: '#989a9c',
                        fontSize: big ? 11 : 9,
                        fontWeight: 400 as const,
                        fontFamily: 'Instrument Sans',
                      },
                    },
                  ]
                : []),
            ],
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
  /**
   * The Q1 cell of an indicator that hasn't reported this quarter holds a 0
   * the parser judged an artifact. Plotting it draws a zero-height bar
   * labelled "0" — a reading that doesn't exist, directly contradicting the
   * summary above it. Absent is absent (R11).
   */
  const q1Actual = (k: Kpi) => {
    const v = k.actuals['2026Q1'].value
    if (v === null || v !== 0) return v
    // only a year-end reporter's or an off-cycle indicator's zero is an
    // artifact; every other zero is a real reading and must be plotted, or the
    // trend hides the very quarter the card is reporting on
    return k.state === 'REPORTS_AT_YEAR_END' || k.state === 'IDLE_THIS_CYCLE' ? null : 0
  }
  const series: object[] = []
  group.forEach((k, i) => {
    /* NEVER the status palette, and never the thematic hue: two of the six
       thematic hues are the status colours to the eye, so a trend drawn in one
       states a verdict the trend is not making. A single indicator takes the
       neutral ink; members of a group need telling apart, which is identity
       rather than judgement, so they keep the series palette. */
    const color = group.length === 1 ? TREND_ACTUAL : SERIES_PALETTE[i % SERIES_PALETTE.length]
    series.push({
      name: `${short(k.name, 30)} — actual`,
      type: 'bar',
      barMaxWidth: 22,
      data: AXIS_YEARS.map((y) => (y === '2026' ? q1Actual(k) : (k.actuals[y]?.value ?? null))),
      itemStyle: { color, borderRadius: BAR_RADIUS },
      label: {
        show: true,
        position: 'top',
        fontFamily: 'Space Grotesk',
        fontSize: 9.5,
        color: '#666',
        formatter: (p: { value: number | null }) => (p.value === null ? '' : nf(p.value)),
      },
    })
    const targetColor = group.length === 1 ? TREND_TARGET : color
    series.push({
      name: `${short(k.name, 30)} — target`,
      type: 'line',
      data: AXIS_YEARS.map((y) => k.targets[y]?.value ?? null),
      lineStyle: { type: 'dashed', width: 1.6, color: targetColor },
      itemStyle: { color: '#ffffff', borderColor: targetColor, borderWidth: 1.6 },
      symbol: 'circle',
      symbolSize: 7,
      /* a year that set no target is a gap, not a point to draw through —
         only 30/43/42/47 of 240 rows carry a historical target, so joining
         across the nulls invents commitments nobody made */
      connectNulls: false,
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
  // Members go in sheet order, whatever sort produced the list. The active L2
  // sort orders the CARDS; letting it also decide which member lands at
  // group[0] made the card's caption — and the KPI a click opens — change with
  // the sort, so a card and its overlay could state different verdicts (R11).
  for (const [key, members] of byGroup) byGroup.set(key, [...members].sort((a, b) => a.row - b.row))

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
