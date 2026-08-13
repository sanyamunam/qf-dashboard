/**
 * The Thematic View AI summary — R4 structure:
 * headline finding → spotlight row (1 performing, 2 needing attention, ranked
 * by the selection logic in model/spotlight.ts) → compressed strip for the
 * remaining areas → Ask BOTaina CTA. No line sparklines: dumbbell and delta
 * columns, every mark ≥32px tall with labelled values.
 */
import { AiRead } from './AiRead'
import { KpiIdentity } from './KpiIdentity'
import { fmt } from '../model/facts'
import { THEMES } from '../model/data'
import { summarySpotlights } from '../model/spotlight'
import type { Kpi } from '../model/types'

const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : n >= 10000 ? `${Math.round(n / 1000)}k` : fmt(n)

/* Dumbbell — two labelled endpoints, peak versus now. Reads instantly at small size. */
function Dumbbell({ peakLabel, peak, nowLabel, now, hue }: { peakLabel: string; peak: number; nowLabel: string; now: number; hue: string }) {
  const W = 190
  const y = 26
  const x1 = 34
  const x2 = W - 30
  const r1 = 7
  const r2 = Math.max(3.5, r1 * Math.sqrt(now / peak))
  return (
    <svg width="100%" height="44" viewBox={`0 0 ${W} 44`} aria-hidden preserveAspectRatio="xMidYMid meet">
      <line x1={x1 + r1} y1={y} x2={x2 - r2} y2={y} stroke={hue} strokeWidth="1.6" opacity="0.5" />
      <circle cx={x1} cy={y} r={r1} fill="none" stroke={hue} strokeWidth="2" />
      <circle cx={x2} cy={y} r={r2} fill={hue} />
      <text x={x1} y={y - 12} textAnchor="middle" fontSize="11" fontFamily="var(--font-num)" fontWeight="700" fill="#47605a">
        {compact(peak)}
      </text>
      <text x={x1} y={y + 16} textAnchor="middle" fontSize="9" fontFamily="var(--font-ui)" fill="#9aaba5">
        {peakLabel}
      </text>
      <text x={x2} y={y - 12} textAnchor="middle" fontSize="11" fontFamily="var(--font-num)" fontWeight="700" fill={hue}>
        {compact(now)}
      </text>
      <text x={x2} y={y + 16} textAnchor="middle" fontSize="9" fontFamily="var(--font-ui)" fill="#9aaba5">
        {nowLabel}
      </text>
    </svg>
  )
}

/* Delta columns — fat columns, most recent emphasised, zero rendered hollow. */
function DeltaColumns({ series, hue, emphasizeZero }: { series: [string, number][]; hue: string; emphasizeZero?: boolean }) {
  const W = 190
  const max = Math.max(...series.map(([, v]) => v), 1)
  const bw = Math.min(26, (W - 20) / series.length - 8)
  const step = (W - 16) / series.length
  const h = (v: number) => Math.max(2, (v / max) * 24)
  return (
    <svg width="100%" height="44" viewBox={`0 0 ${W} 44`} aria-hidden preserveAspectRatio="xMidYMid meet">
      {series.map(([yr, v], i) => {
        const x = 8 + i * step + (step - bw) / 2
        const last = i === series.length - 1
        const isZero = v === 0
        return (
          <g key={yr}>
            {isZero ? (
              <line x1={x} y1={32} x2={x + bw} y2={32} stroke={emphasizeZero ? '#8a1538' : hue} strokeWidth="2.4" />
            ) : (
              <rect x={x} y={32 - h(v)} width={bw} height={h(v)} rx="2.5" fill={hue} opacity={last ? 1 : 0.38} />
            )}
            {(last || i === 0) && (
              <text
                x={x + bw / 2}
                y={isZero ? 26 : 32 - h(v) - 4}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-num)"
                fontWeight="700"
                fill={last ? (isZero && emphasizeZero ? '#8a1538' : hue) : '#7e938d'}
              >
                {compact(v)}
              </text>
            )}
            <text x={x + bw / 2} y="42" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-ui)" fill="#9aaba5">
              {yr === '2026Q1' ? 'Q1' : yr.slice(2)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SpotTile({
  kind,
  kpi,
  figure,
  delta,
  mark,
  onEvidence,
}: {
  kind: 'performing' | 'attention'
  kpi: Kpi
  figure: string
  delta: string
  mark: React.ReactNode
  onEvidence: (k: Kpi) => void
}) {
  const tone = kind === 'performing' ? '#3c6a5f' : '#8a1538'
  return (
    <button
      onClick={() => onEvidence(kpi)}
      className="flex flex-col rounded-card p-3.5 text-left transition-colors duration-200 hover:bg-cream/60"
      style={{ background: 'rgba(246,241,231,0.45)' }}
    >
      <span className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: tone }}>
        {kind === 'performing' ? 'PERFORMING' : 'NEEDS ATTENTION'}
      </span>
      <span className="mt-1.5">
        <KpiIdentity kpi={kpi} />
      </span>
      <span className="num mt-1.5 text-[22px] font-bold leading-none text-ink">{figure}</span>
      <span className="mt-2">{mark}</span>
      <span className="mt-1 text-[11px] leading-snug" style={{ color: tone }}>
        {delta}
      </span>
    </button>
  )
}

export function PortfolioBrief({ onEvidence }: { onEvidence: (kpi: Kpi) => void }) {
  const { performing, attention } = summarySpotlights()
  const [decline, stopped] = attention

  const spotThemes = new Set([performing, ...attention].map((k) => k?.theme))
  const restThemes = THEMES.filter((t) => !spotThemes.has(t.name))
  const STATES: Record<string, string> = {
    Sustainability: 'baselines set, research climbing',
    'Progressive Education': 'legacy programmes complete',
    'Artificial Intelligence': 'two indicators, none adopted',
    'Social Progress': 'quiet outside the spotlight',
    'Organizational Excellence': 'quiet by design',
    'Precision Health': 'reserved, no data yet',
  }

  const declineVals = decline?.movementSeries ?? []
  const declinePeak = Math.max(...declineVals.map(([, v]) => v))
  const declinePeakYear = declineVals.find(([, v]) => v === declinePeak)?.[0] ?? ''
  const declineNow = declineVals[declineVals.length - 1]
  const stoppedSeries: [string, number][] = stopped
    ? [...stopped.movementSeries, ['2026Q1', 0] as [string, number]]
    : []
  const perfSeries = performing?.movementSeries ?? []
  const perfFirst = perfSeries[0]?.[1] ?? 0
  const perfLast = perfSeries[perfSeries.length - 1]?.[1] ?? 0

  const askBotaina = () => {
    window.dispatchEvent(new CustomEvent('botaina-ask', { detail: `What happened at ${decline?.entity ?? 'WISH'}?` }))
  }

  return (
    <AiRead
      verdict={<>Nothing is breaching. One programme is collapsing, and one revenue line has gone quiet.</>}
      body={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {decline && (
            <SpotTile
              kind="attention"
              kpi={decline}
              onEvidence={onEvidence}
              figure={fmt(declineNow?.[1])}
              delta={`−${Math.round((1 - (declineNow?.[1] ?? 0) / declinePeak) * 100)}% from its ${declinePeakYear} peak`}
              mark={
                <Dumbbell
                  peak={declinePeak}
                  peakLabel={`peak ${declinePeakYear}`}
                  now={declineNow?.[1] ?? 0}
                  nowLabel={declineNow?.[0] === '2026Q1' ? 'Q1 26' : declineNow?.[0] ?? ''}
                  hue="#8a1538"
                />
              }
            />
          )}
          {stopped && (
            <SpotTile
              kind="attention"
              kpi={stopped}
              onEvidence={onEvidence}
              figure="0 reported"
              delta={`QAR ${compact(stoppedSeries[stoppedSeries.length - 2]?.[1] ?? 0)} in 2025 · nothing yet this quarter`}
              mark={<DeltaColumns series={stoppedSeries} hue="#556bb4" emphasizeZero />}
            />
          )}
          {performing && (
            <SpotTile
              kind="performing"
              kpi={performing}
              onEvidence={onEvidence}
              figure={fmt(perfLast)}
              delta={`+${Math.round(((perfLast - perfFirst) / perfFirst) * 100)}% over ${perfSeries.length} readings`}
              mark={<DeltaColumns series={perfSeries} hue="#2e7d5b" />}
            />
          )}
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream pt-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {restThemes.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: t.fill }} />
                <span className="font-medium">{t.name}</span>
                <span className="text-ink-mute">— {STATES[t.name]}</span>
              </span>
            ))}
          </div>
          <button
            onClick={askBotaina}
            className="ms-auto flex shrink-0 items-center gap-2 rounded-full py-1 pe-3.5 ps-1 text-[12.5px] font-medium text-white transition-transform duration-200 hover:scale-[1.03]"
            style={{ background: 'var(--ai-gradient)' }}
          >
            <span className="block h-7 w-7 overflow-hidden rounded-full bg-cream">
              <img src="/botaina.gif" alt="" className="h-full w-full object-cover" />
            </span>
            Ask BOTaina →
          </button>
        </div>
      }
    />
  )
}
