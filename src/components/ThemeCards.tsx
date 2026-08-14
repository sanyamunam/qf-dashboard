/**
 * Theme cards — hero plus four. Every card is obviously a door:
 * whole-card target, accent bar that grows on hover, a persistent
 * "Explore N indicators →" CTA, and a chip naming why its spotlight
 * indicator was chosen. Cards of a tier share one internal grid.
 *
 * R15: the grid holds the FIVE thematic areas and nothing else.
 * Organizational Excellence is an enabling function, not a sixth theme, and
 * renders below the grid as a wide band (`OEBand`) whose silhouette says so
 * before any label is read. R4 had folded it in as a sixth tile purely to
 * fill a 3×2 grid; that fixed the layout and broke the meaning.
 */
import { ChevronRight } from 'lucide-react'
import { TrajectoryMark, ProgressMark, SparseMark } from './marks'
import { RingMark } from './charts/RingMark'
import { facts, fmt } from '../model/facts'
import { themeKpis, themeById } from '../model/data'
import { spotlightFor, type ChipReason } from '../model/spotlight'

export interface CardDef {
  themeId: string
  themeName: string
  hero?: boolean
  dark?: boolean
  reserved?: boolean
  subtitle?: string
  chip: ChipReason | null
  figure: string | null
  sentence: React.ReactNode
  mark: React.ReactNode
  count: number
  entities: number
}

const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : new Intl.NumberFormat('en').format(n))

export function buildCards(): CardDef[] {
  const count = (t: string) => themeKpis(t).length
  const entities = (t: string) => new Set(themeKpis(t).map((k) => k.entity)).size

  return [
    {
      themeId: 'social',
      themeName: 'Social Progress',
      // the hero: this theme carries the portfolio's lead finding (WISH down
      // 96% from its peak), so it is the one that earns the extra width
      hero: true,
      chip: spotlightFor('Social Progress').chip,
      figure: fmt(facts.wish.q1),
      sentence: (
        <>
          people reached by WISH programmes this quarter, down from{' '}
          <span className="num">{fmt(facts.wish.first)}</span> in 2022
        </>
      ),
      mark: <TrajectoryMark series={facts.wish.series} hue={themeById('social').fill} fmtVal={compact} />,
      count: count('Social Progress'),
      entities: entities('Social Progress'),
    },
    {
      themeId: 'sustain',
      themeName: 'Sustainability',
      chip: 'BASELINE',
      figure: fmt(facts.eco.beneficiaries),
      sentence: (
        <>
          students and teachers in Eco-Schools across <span className="num">{fmt(facts.eco.registered)}</span>{' '}
          schools, <span className="num">{fmt(facts.eco.certified)}</span> Green Flag certified
        </>
      ),
      mark: (
        <RingMark
          value={facts.eco.certified ?? 0}
          total={facts.eco.registered ?? 0}
          hue={themeById('sustain').fill}
          valueLabel="Green Flag certified"
          totalLabel="schools registered"
        />
      ),
      count: count('Sustainability'),
      entities: entities('Sustainability'),
    },
    {
      themeId: 'edu',
      themeName: 'Progressive Education',
      chip: 'BASELINE',
      figure: `QAR ${fmt((facts.wise.prizeValue ?? 0) / 1e6)}m`,
      sentence: (
        <>
          awarded to <span className="num">{fmt(facts.wise.prizeCount)}</span> WISE Prize recipients;{' '}
          <span className="num">{facts.wise.testbeds}</span> schools run Edtech testbeds
        </>
      ),
      mark: (
        <ProgressMark
          hue={themeById('edu').fill}
          rows={[
            { label: 'WISE Prize recipients', value: facts.wise.prizeCount ?? 0, target: facts.wise.prizeCountTarget ?? 0 },
            { label: 'Edtech testbed schools', value: facts.wise.testbeds, target: facts.wise.testbedsTarget },
          ]}
        />
      ),
      count: count('Progressive Education'),
      entities: entities('Progressive Education'),
    },
    {
      themeId: 'ai',
      themeName: 'Artificial Intelligence',
      chip: 'LARGEST GAP',
      figure: null,
      sentence: (
        <>QF's newest priority is measured by two indicators. One policy recommendation made, none adopted.</>
      ),
      mark: (
        <SparseMark
          hue={themeById('ai').fill}
          items={[
            { label: 'recommendations', actual: facts.ai.recommendations ?? 0, target: facts.ai.recTarget ?? 0 },
            { label: 'adoptions', actual: facts.ai.adoptions ?? 0, target: facts.ai.adoptTarget ?? 0 },
          ]}
        />
      ),
      count: count('Artificial Intelligence'),
      entities: entities('Artificial Intelligence'),
    },
    {
      // Precision Health is QF's fifth thematic area — in the brand system,
      // absent from Release 2 data. A designed reserved slot, nothing invented.
      themeId: 'health',
      themeName: 'Precision Health',
      reserved: true,
      subtitle: 'reserved',
      chip: null,
      figure: null,
      sentence: (
        <>
          QF's fifth thematic area. No indicators have been supplied in Release 2 — the slot is built and
          stays empty until the data arrives.
        </>
      ),
      mark: (
        <svg viewBox="0 0 300 60" width="100%" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={16 + i * 21} cy={30} r={5} fill="none" stroke="#c8c9c7" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          ))}
        </svg>
      ),
      count: 0,
      entities: 0,
    },
  ]
}

/**
 * Organizational Excellence (R15). Not a card — a band: full width, and short
 * enough that its silhouette alone reads as a different kind of thing from the
 * theme cards above it, before any label is parsed. Same content as the tile it
 * replaces, laid out along the horizontal rather than stacked down a card.
 */
export function OEBand({ onOpen }: { onOpen: (themeId: string) => void }) {
  const oeCount = themeKpis('Organizational Excellence').length
  const oeEntities = new Set(themeKpis('Organizational Excellence').map((k) => k.entity)).size
  const turnover = facts.oe.turnover.series
  const training = facts.oe.training.series
  const latest = turnover[turnover.length - 1]?.[1]

  return (
    <button
      onClick={() => onOpen('oe')}
      /* wraps rather than crushes: when the row runs out of width the CTA
         drops to its own line, instead of three columns each being squeezed */
      className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-card p-6 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-8 @xl:gap-y-4"
      style={{ background: 'var(--color-th-oe)', boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
      aria-label={`Organizational Excellence — enabling function, explore ${oeCount} indicators`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[4px] transition-all duration-300 group-hover:h-[5px]" style={{ background: '#8fa3d4' }} />

      {/* identity + the headline figure, reading across rather than down */}
      <div className="min-w-0 @xl:min-w-[280px] @xl:max-w-[34ch] @xl:flex-1">
        <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-white">
          Organizational Excellence
        </h3>
        <div className="mt-1 text-[11.5px] text-white/50">
          {oeCount} indicators · {oeEntities} entities · enabling function
        </div>
        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="num text-[30px] font-bold leading-none text-white">{fmt(latest)}%</span>
          <span className="text-[12.5px] leading-snug text-white/70">
            employee turnover at end-2025, its best of four reported years
          </span>
        </div>
      </div>

      {/* the trend alongside the figure, not beneath it */}
      <div className="w-full @xl:min-w-[230px] @xl:max-w-[280px] @xl:flex-1">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/45">
          Turnover, 2022 → 2025
        </div>
        <div className="[&_text]:!fill-white/70">
          <TrajectoryMark series={turnover} hue="#8fa3d4" fmtVal={(n) => `${n}%`} H={64} />
        </div>
        <div className="text-[11px] text-white/50">
          Training hours per employee up from <span className="num">{fmt(training[0]?.[1])}</span> to{' '}
          <span className="num">{fmt(training[training.length - 1]?.[1])}</span>
        </div>
      </div>

      <span
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-input border-[1.5px] px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-200 @xl:ml-auto"
        style={{ borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        Explore {oeCount} indicators
        <ChevronRight size={16} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </button>
  )
}

const CHIP_STYLE: Record<ChipReason, string> = {
  'BIGGEST MOVER': 'rgba(85,107,180,0.12)',
  'LARGEST GAP': 'rgba(138,21,56,0.09)',
  BASELINE: 'rgba(3,70,56,0.08)',
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

      {/* group 2: the spotlight — chip, figure, sentence tight together */}
      <div className="mt-5 flex items-center gap-2">
        {def.chip && (
          <span
            className="rounded-chip px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em]"
            style={{ background: CHIP_STYLE[def.chip], color: textHue }}
          >
            ◆ {def.chip}
          </span>
        )}
      </div>
      <div className="mt-1.5">
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

      {/* group 3: the evidence mark */}
      <div className="mt-5 self-end">{def.mark}</div>

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
