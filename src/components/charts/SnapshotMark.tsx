/**
 * The snapshot mark — one component, so a card and the overlay opened from it
 * can never show different marks for the same indicator (R11 fix 2: the
 * overlay's anchor chart IS the card's chart, drawn larger).
 *
 * Which mark appears follows the data shape, decided in `snapshotFor`:
 * a grouped card gets labelled ledger rows, a single rate-like metric gets an
 * arc, a single count gets a bullet.
 */
import type { Kpi } from '../../model/types'
import { EChart } from './EChart'
import { snapshotFor, STATUS_COLOR, type ChartScale, type SnapshotRow } from './builders'

const nf = (n: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)

/** Every dimension that changes between the card and the overlay. */
const S = {
  card: { track: 12, marker: 18, num: 15, of: 10.5, check: 11, label: 11.5, gap: 10 },
  overlay: { track: 18, marker: 26, num: 22, of: 13, check: 15, label: 13.5, gap: 18 },
} as const

const fillOf = (s: SnapshotRow['status'], hue: string) =>
  s === 'met' || s === 'behind' || s === 'breach' ? STATUS_COLOR[s].fill : hue
const textOf = (s: SnapshotRow['status']) =>
  s === 'met' || s === 'behind' || s === 'breach' ? STATUS_COLOR[s].text : '#122822'

/**
 * The status ledger (R10 fix 5 — the client's chosen grouped-chart treatment).
 * HTML, not canvas: full labels that never truncate, numbers with real weight,
 * a dashed target the eye can find. Rows share one axis so members compare.
 */
export function LedgerRows({
  rows,
  max,
  hue,
  scale = 'card',
}: {
  rows: SnapshotRow[]
  max: number
  hue: string
  scale?: ChartScale
}) {
  const z = S[scale]
  return (
    <div className="flex flex-col" style={{ gap: z.gap }}>
      {rows.map((r) => {
        const w = Math.max(2, (r.value / max) * 100)
        const tx = (r.target / max) * 100
        return (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 leading-tight text-ink-soft" style={{ fontSize: z.label }}>
                {r.label}
              </span>
              <span
                className="num shrink-0 font-bold leading-none"
                style={{ color: textOf(r.status), fontSize: z.num }}
              >
                {nf(r.value)}
                {r.status === 'met' && (
                  <span className="ml-0.5" style={{ fontSize: z.check }}>
                    ✓
                  </span>
                )}
                <span className="ml-1 font-normal text-ink-mute" style={{ fontSize: z.of }}>
                  of {nf(r.target)}
                </span>
              </span>
            </div>
            <div
              className="relative mt-1 overflow-visible rounded-full"
              style={{ height: z.track, background: 'rgba(200,201,199,0.3)' }}
            >
              <div
                className="ledger-fill h-full rounded-full"
                style={{
                  width: `${w}%`,
                  background: fillOf(r.status, hue),
                  boxShadow: r.status === 'met' ? '0 0 7px rgba(120,190,32,0.45)' : undefined,
                }}
              />
              {/* the target marker: dashed, darker than the bar, unmissable */}
              <span
                aria-hidden
                className="absolute w-0 border-l-2 border-dashed"
                style={{
                  left: `${Math.min(99, tx)}%`,
                  top: (z.track - z.marker) / 2,
                  height: z.marker,
                  borderColor: '#47605a',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SnapshotMark({
  group,
  hue,
  title,
  scale = 'card',
  emptyNote,
}: {
  group: Kpi[]
  hue: string
  title?: string
  scale?: ChartScale
  /** shown in place of a mark when no honest Q1 position exists */
  emptyNote?: string
}) {
  const snap = snapshotFor(group, hue, title, scale)

  if (snap.kind === 'group-ledger') return <LedgerRows rows={snap.rows} max={snap.max} hue={hue} scale={scale} />
  if (snap.kind !== 'none') return <EChart option={snap.option} height={snap.height} />
  if (!emptyNote) return null
  return (
    <div
      className="flex items-center rounded-input bg-cream/60 px-3 italic leading-snug text-ink-mute"
      style={{ fontSize: scale === 'overlay' ? 13 : 11, minHeight: scale === 'overlay' ? 72 : undefined, paddingBlock: 10 }}
    >
      {emptyNote}
    </div>
  )
}
