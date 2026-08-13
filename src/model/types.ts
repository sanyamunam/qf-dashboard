export type CellReading = { value: number | null; raw: string | null; flag: string | null }

export type KpiState =
  | 'NO_TARGET_SET'
  | 'IDLE_THIS_CYCLE'
  | 'NOT_REPORTED'
  | 'REPORTS_AT_YEAR_END'
  | 'ABOVE_CEILING'
  | 'WITHIN_LIMIT'
  | 'TARGET_ALREADY_MET'
  | 'IN_PROGRESS'

export type Cadence = 'continuous' | 'annual' | 'cyclical'

export interface Kpi {
  id: string
  row: number
  entity: string
  polarity: 'Green' | 'Red'
  category: string
  theme: string
  framework: 'Impact' | 'Strategic' | 'Operational'
  name: string
  definition: string | null
  l1Chart: string | null
  chartGroup: string | null
  l2Chart: string | null
  actuals: Record<string, CellReading>
  targets: Record<string, CellReading>
  reportingPeriod: string | null
  cadence: Cadence
  historyPoints: number
  hasEnoughHistoryForLine: boolean
  state: KpiState
  propChange: number | null
  movementScore: number | null
  movementSeries: [string, number][]
  exactHit: boolean
  overshoot: boolean
}

export interface KpiModel {
  generatedFrom: string
  period: string
  parseWarnings: string[]
  kpis: Kpi[]
}

export const STATE_LABEL: Record<KpiState, string> = {
  NO_TARGET_SET: 'No target set',
  IDLE_THIS_CYCLE: 'Idle this cycle',
  NOT_REPORTED: 'Not reported',
  REPORTS_AT_YEAR_END: 'Reports at year end',
  ABOVE_CEILING: 'Above ceiling',
  WITHIN_LIMIT: 'Within limit',
  TARGET_ALREADY_MET: 'Target already met',
  IN_PROGRESS: 'In progress',
}

export const ACTUAL_YEARS = ['2022', '2023', '2024', '2025', '2026Q1'] as const
