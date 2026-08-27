/**
 * R2 theme cards — hero plus four. Every card is obviously a door:
 * whole-card target, accent bar that grows on hover, a persistent
 * "Explore N indicators →" CTA, and a chip naming why its spotlight
 * indicator was chosen. Cards of a tier share one internal grid.
 */
import { ChevronRight } from 'lucide-react'
import { SpotlightIdentity, SpotlightMark } from './charts/Spotlight'
import { facts, fmt } from '../model/facts'
import { themeKpis, themeById } from '../model/data'
import type { Kpi } from '../model/types'

export interface CardDef {
  themeId: string
  themeName: string
  /** Column span at the 2-over-3 breakpoint: the top row is WIDER, never taller. */
  span: 3 | 2
  dark?: boolean
  reserved?: boolean
  subtitle?: string
  /** the ONE indicator this card charts — its headline figure names it */
  kpi: Kpi | null
  figure: string | null
  sentence: React.ReactNode
  /** the reserved slot draws its own placeholder; everything else uses the selector */
  mark?: React.ReactNode
  count: number
  entities: number
}

const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : new Intl.NumberFormat('en').format(n))

/**
 * The five thematic areas, and only those. Organizational Excellence is an
 * enabling function, not a thematic area — it lives below the grid as OEBand,
 * because a card sitting as a peer in a grid reads as a peer whatever colour
 * it is (position and silhouette are parsed before hue).
 *
 * Row one takes the two areas with the richest evidence at half width each;
 * row two takes the remaining three at a third each. Five cards fill both rows
 * exactly, so no cell is left over.
 */
export function buildCards(): CardDef[] {
  const count = (t: string) => themeKpis(t).length
  const entities = (t: string) => new Set(themeKpis(t).map((k) => k.entity)).size

  return [
    {
      themeId: 'social',
      themeName: 'Social Progress',
      span: 3,
      kpi: facts.wish.kpi,
      figure: fmt(facts.wish.q1),
      sentence: (
        <>
          people reached by WISH programmes this quarter, down from{' '}
          <span className="num">{fmt(facts.wish.first)}</span> in 2022
        </>
      ),
      count: count('Social Progress'),
      entities: entities('Social Progress'),
    },
    {
      themeId: 'sustain',
      themeName: 'Sustainability',
      span: 3,
      kpi: facts.sustain.kpi,
      figure: fmt(facts.sustain.q1),
      sentence: (
        <>
          QF entities collaborating through Earthna's Multiversity — meeting the{' '}
          <span className="num">{fmt(facts.sustain.target26)}</span> committed for 2026
        </>
      ),
      count: count('Sustainability'),
      entities: entities('Sustainability'),
    },
    {
      themeId: 'edu',
      themeName: 'Progressive Education',
      span: 2,
      kpi: facts.wise.prizeValueKpi,
      figure: `QAR ${fmt((facts.wise.prizeValue ?? 0) / 1e6)}m`,
      sentence: <>in WISE Prize funding awarded this quarter — exactly the full-year commitment</>,
      count: count('Progressive Education'),
      entities: entities('Progressive Education'),
    },
    {
      themeId: 'ai',
      themeName: 'Artificial Intelligence',
      span: 2,
      kpi: facts.ai.kpi ?? null,
      figure: fmt(facts.ai.recommendations),
      sentence: <>policy recommendation made against a commitment of three for 2026</>,
      count: count('Artificial Intelligence'),
      entities: entities('Artificial Intelligence'),
    },
    {
      // Precision Health is QF's fifth thematic area — in the brand system,
      // absent from Release 2 data. A designed reserved slot, nothing invented.
      themeId: 'health',
      themeName: 'Precision Health',
      span: 2,
      reserved: true,
      subtitle: 'reserved',
      kpi: null,
      figure: null,
      sentence: (
        <>
          QF's fifth thematic area. No indicators have been supplied in Release 2 — the slot is built and
          stays empty until the data arrives.
        </>
      ),
      // fixed height at any width — a width-scaling SVG here would make the
      // reserved card disagree with its row about how tall a card is
      mark: (
        <div className="flex h-[60px] items-center gap-[9px]" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="h-[10px] w-[10px] shrink-0 rounded-full border border-dashed"
              style={{ borderColor: '#c8c9c7' }}
            />
          ))}
        </div>
      ),
      count: 0,
      entities: 0,
    },
  ]
}

export function ThemeCard({ def, onOpen }: { def: CardDef; onOpen: (themeId: string) => void }) {
  const theme = themeById(def.themeId)
  const dark = def.dark
  const textHue = dark
    ? 'rgba(255,255,255,0.75)'
    : theme.fill === '#e5a823'
      ? '#c98f1b'
      : theme.fill === '#0cc1e9'
        ? '#0e93b5'
        : theme.fill
  return (
    <button
      onClick={() => !def.reserved && onOpen(def.themeId)}
      tabIndex={def.reserved ? -1 : undefined}
      aria-disabled={def.reserved || undefined}
      className={`group relative grid h-full w-full overflow-hidden rounded-card text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${def.reserved ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1 focus-visible:-translate-y-1'}`}
      style={{
        background: dark ? 'var(--color-th-oe)' : 'var(--color-card)',
        boxShadow: 'var(--shadow-card)',
        gridTemplateRows: 'auto auto auto 1fr auto auto',
        padding: '20px 22px 18px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
      aria-label={
        def.reserved
          ? `${def.themeName} — reserved, no indicators supplied yet`
          : `${def.themeName} — explore ${def.count} indicators`
      }
    >
      {/* theme accent bar: 4px at rest, 5px on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[4px] transition-all duration-300 group-hover:h-[5px]"
        style={{ background: dark ? '#8fa3d4' : theme.fill }}
      />

      {/* group 1: the title block — the theme name IS the card's title (R5 fix 5) */}
      <h3
        className={`pt-1 text-[18px] font-semibold leading-tight tracking-tight ${dark ? 'text-white' : 'text-ink'}`}
        style={dark ? undefined : { color: textHue }}
      >
        {def.themeName}
      </h3>
      <div className={`mt-1 text-[11.5px] ${dark ? 'text-white/50' : 'text-ink-mute'}`}>
        {def.reserved
          ? 'awaiting first indicators · reserved'
          : `${def.count} indicators · ${def.entities} ${def.entities === 1 ? 'entity' : 'entities'}${def.subtitle ? ` · ${def.subtitle}` : ''}`}
      </div>

      {/* group 2: the spotlight — the KPI named, then its figure and caption.
          The BIGGEST MOVER / BASELINE / LARGEST GAP chips are gone: the
          indicator's own status is the qualifier, and it is a fact rather than
          an editorial pick. */}
      <div className="mt-5">
        {def.kpi && <SpotlightIdentity kpi={def.kpi} dark={dark} />}
      </div>
      <div className="mt-3">
        {def.figure && (
          <div className={`num text-[30px] font-bold leading-none ${dark ? 'text-white' : 'text-sidra'}`}>
            {def.figure}
          </div>
        )}
        <p
          className={`mt-2 text-[13px] leading-[1.5] ${dark ? 'text-white/75' : 'text-ink-soft'}`}
          style={{ maxWidth: '40ch' }}
        >
          {def.sentence}
        </p>
      </div>

      {/* group 3: the evidence mark — whatever the shared selector returns for
          this KPI's data shape, and only for THIS KPI */}
      <div className="mt-5 self-end">
        {def.kpi ? <SpotlightMark kpi={def.kpi} dark={dark} /> : def.mark}
      </div>

      {/* group 4: the card's action — a real control, not a text link (R4 fix 3) */}
      {def.reserved ? (
        <span className="mt-5 flex items-center justify-center rounded-input border-[1.5px] border-dashed px-3 py-2 text-[12.5px] text-ink-mute" style={{ borderColor: 'rgba(18,40,34,0.14)' }}>
          No indicators yet
        </span>
      ) : (
      <span
        className="mt-5 flex items-center justify-center gap-1.5 rounded-input border-[1.5px] px-3 py-2 text-[13px] font-semibold transition-colors duration-200"
        style={
          dark
            ? { borderColor: 'rgba(255,255,255,0.35)', color: '#fff', background: 'rgba(255,255,255,0.08)' }
            : { borderColor: theme.fill, color: textHue, background: theme.soft }
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.18)' : theme.fill
          if (!dark) e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : theme.soft
          if (!dark) e.currentTarget.style.color = textHue
        }}
      >
        Explore {def.count} indicators
        <ChevronRight size={16} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
      )}
    </button>
  )
}
