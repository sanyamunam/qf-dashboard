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
import { snapshotFor, type ChartScale, type SnapshotRow } from './builders'
import { L1_FILL, L1_INK, L1_MIN_FILL_PCT } from './l1Palette'
import type { DashStatus } from '../../model/status'

const nf = (n: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n)

/** Every dimension that changes between the card and the overlay. */
const S = {
  card: { track: 12, marker: 18, num: 15, of: 10.5, check: 11, label: 11.5, gap: 10 },
  overlay: { track: 18, marker: 26, num: 22, of: 13, check: 15, label: 13.5, gap: 18 },
} as const

/**
 * A bar's colour is its indicator's VERDICT — never the theme's identity.
 *
 * These took `hue` as a fallback for the two legacy `ChartStatus` values that
 * had no colour of their own, which is how a Social Progress indicator behind
 * target came to be drawn in Social Progress indigo, and a Sustainability one
 * in a green all but identical to the on-target green. `hue` is gone from
 * both; the theme is already carried by the card's icon, its accent and the
 * page it sits on.
 */
const fillOf = (tone: DashStatus) => L1_FILL[tone]
const textOf = (tone: DashStatus) => L1_INK[tone]

/**
 * The status ledger (R10 fix 5 — the client's chosen grouped-chart treatment).
 * HTML, not canvas: full labels that never truncate, numbers with real weight,
 * a dashed target the eye can find. Rows share one axis so members compare.
 */
export function LedgerRows({
  rows,
  max,
  scale = 'card',
}: {
  rows: SnapshotRow[]
  max: number
  scale?: ChartScale
}) {
  const z = S[scale]
  return (
    <div className="flex flex-col" style={{ gap: z.gap }}>
      {rows.map((r) => {
        /* a reading of zero still gets a BAR, not a coloured speck —
           "International 0 of 2" rendered as a 2px dot that read as decoration
           rather than as a measurement */
        const w = Math.max(L1_MIN_FILL_PCT, (r.value / max) * 100)
        const tx = (r.target / max) * 100
        return (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 leading-tight text-ink-soft" style={{ fontSize: z.label }}>
                {r.label}
              </span>
              <span
                className="num shrink-0 font-bold leading-none"
                style={{ color: textOf(r.tone), fontSize: z.num }}
              >
                {nf(r.value)}
                {r.status === 'met' && (
                  <span className="ml-0.5" style={{ fontSize: z.check }}>
                    ✓
                  </span>
                )}
                {/* a figure that isn't this quarter's carries its year inline */}
                {r.year && (
                  <span className="ml-1 font-normal text-ink-mute" style={{ fontSize: z.of }}>
                    ({r.year})
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
                  background: fillOf(r.tone),
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
  /** shown in place of a mark when no honest position exists at all */
  emptyNote?: string
}) {
  const snap = snapshotFor(group, hue, title, scale)
  const basis = snap.kind === 'none' ? undefined : snap.basis

  /* when the mark reports a year other than this quarter, it says so above
     itself — a dated reading must never be mistaken for a Q1 one (R13) */
  const dated = basis ? (
    <div className={`${scale === 'overlay' ? 'mb-2 text-[11.5px]' : 'mb-1.5 text-[10.5px]'} font-medium text-ink-mute`}>
      {basis}
    </div>
  ) : null

  if (snap.kind === 'group-ledger')
    return (
      <>
        {dated}
        <LedgerRows rows={snap.rows} max={snap.max} scale={scale} />
      </>
    )
  if (snap.kind !== 'none')
    return (
      <>
        {dated}
        <EChart option={snap.option} height={snap.height} />
      </>
    )

  /**
   * Nothing chartable. A card must still never fall back to a bare figure
   * (R13): where no honest position exists it says so, and says what the
   * target it has not yet been measured against actually is.
   */
  const note = emptyNote ?? defaultEmptyNote(group)
  if (!note) return null
  return (
    <div
      className="flex items-center rounded-input bg-cream/60 px-3 italic leading-snug text-ink-mute"
      style={{ fontSize: scale === 'overlay' ? 13 : 11, minHeight: scale === 'overlay' ? 72 : undefined, paddingBlock: 10 }}
    >
      {note}
    </div>
  )
}

/** Why this card has no mark, in the platform's own voice. */
function defaultEmptyNote(group: Kpi[]): string {
  const k = group[0]
  const t = k.targets['2026'].value
  if (k.state === 'IDLE_THIS_CYCLE') return 'Idle this cycle — the 2026 target is 0 in an off year. Correctly quiet.'
  if (k.state === 'REPORTS_AT_YEAR_END')
    return t ? `Reports at year end; nothing measured yet against the ${nf(t)} target for 2026.` : 'Reports at year end — no reading exists yet.'
  return t
    ? `Nothing reported yet — the 2026 target is ${nf(t)}, with no reading to stand against it.`
    : 'Nothing reported yet, and no target is set to measure it against.'
}
