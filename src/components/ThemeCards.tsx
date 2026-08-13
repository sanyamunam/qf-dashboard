/**
 * R2 theme cards — hero plus four. Every card is obviously a door:
 * whole-card target, accent bar that grows on hover, a persistent
 * "Explore N indicators →" CTA, and a chip naming why its spotlight
 * indicator was chosen. Cards of a tier share one internal grid.
 */
import { ChevronRight } from 'lucide-react'
import { TrajectoryMark, DotGridMark, ProgressMark, SparseMark } from './marks'
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
        <DotGridMark
          total={facts.eco.registered ?? 0}
          filled={facts.eco.certified ?? 0}
          hue={themeById('sustain').fill}
          filledLabel="Green Flag certified"
          restLabel="registered"
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
    {
      // OE joins the grid as the sixth tile (R4 fix 2) — navy and internally
      // distinct: an enabling function, not a thematic area
      themeId: 'oe',
      themeName: 'Organizational Excellence',
      dark: true,
      subtitle: 'enabling function',
      chip: null,
      figure: `${fmt(facts.oe.turnover.series[facts.oe.turnover.series.length - 1]?.[1])}%`,
      sentence: (
        <>
          employee turnover at end-2025, its best of four reported years; training hours have climbed{' '}
          <span className="num">{fmt(facts.oe.training.series[0]?.[1])}</span> to{' '}
          <span className="num">{fmt(facts.oe.training.series[facts.oe.training.series.length - 1]?.[1])}</span>
        </>
      ),
      mark: (
        <div className="[&_text]:!fill-white/70">
          <TrajectoryMark series={facts.oe.turnover.series} hue="#8fa3d4" fmtVal={(n) => `${n}%`} />
        </div>
      ),
      count: count('Organizational Excellence'),
      entities: entities('Organizational Excellence'),
    },
  ]
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
