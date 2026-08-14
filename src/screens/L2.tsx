/**
 * L2 — inside a thematic area. R2: the theme colour is unmistakable (full-bleed
 * hue band collapsing to a sticky bar), the AI summary floats on it as glass,
 * top movers front the list, and every KPI is findable in seconds via search
 * and URL-persisted filters. The canvas below the band stays cream.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown, ArrowLeft, ChevronRight } from 'lucide-react'
import { AiRead } from '../components/AiRead'
import { HeaderCluster, LogoWhite } from '../components/Shell'
import { themeById, themeKpis } from '../model/data'
import { facts, fmt, wishDropPct } from '../model/facts'
import { topMovers } from '../model/spotlight'
import type { Kpi } from '../model/types'
import { buildGroupCards, type GroupCard, type YearKey } from '../components/charts/builders'
import { EChart } from '../components/charts/EChart'
import { BotainaFigure } from '../components/Botaina'
import { KpiCard } from '../components/KpiCard'
import { ViewSwitcher, ListView, CompareView, EntityView, type ViewId, loadView, saveView } from './views'
import { Spark } from '../components/Shell'

const THEME_NAME: Record<string, string> = {
  social: 'Social Progress',
  sustain: 'Sustainability',
  edu: 'Progressive Education',
  ai: 'Artificial Intelligence',
  oe: 'Organizational Excellence',
}

const DARK: Record<string, string> = {
  social: '#47598f',
  sustain: '#276b4e',
  edu: '#a87a16',
  ai: '#0c7d9a',
  oe: '#171f33',
}

function themeRead(themeId: string): { verdict: string; evidence: string; ask: string; confidence: string } {
  switch (themeId) {
    case 'social':
      return {
        verdict: 'One programme is shrinking faster than anything else in the portfolio is moving.',
        evidence: `WISH beneficiaries fell from ${fmt(facts.wish.peak)} at peak to ${fmt(facts.wish.q1)} this quarter, ${wishDropPct}% down, while its full-year target is ${fmt(facts.wish.target26)}. The theme's other 60 indicators are quieter, several sitting exactly on their annual numbers.`,
        ask: 'Ask WISH what changed in the delivery model, and ask who set the exactly-met 2026 targets.',
        confidence: 'Medium — 4 of 4 years reported for the driving indicator; Q1 is one quarter of twelve months.',
      }
    case 'sustain':
      return {
        verdict: 'A first quarter of baselines, with one genuinely climbing series.',
        evidence: `Eco-Schools stands at ${fmt(facts.eco.beneficiaries)} students and teachers across ${fmt(facts.eco.registered)} schools (${fmt(facts.eco.certified)} Green Flags) — first readings. Research publications are the exception: 4, then 9, then 14 papers across three years.`,
        ask: 'Ask Earthna what Green Flag renewal costs at this scale.',
        confidence: 'Low on trend — most of this theme has a single reading. High on the figures themselves.',
      }
    case 'edu':
      return {
        verdict: 'The legacy programmes are essentially complete; the new measures are just starting.',
        evidence: `WISE Prize funding stands at QAR ${fmt((facts.wise.prizeValue ?? 0) / 1e6)}m across ${fmt(facts.wise.prizeCount)} recipients, and all ${facts.wise.testbeds} Edtech testbed schools are running — both exactly at their full-year numbers in the first quarter.`,
        ask: 'Ask WISE which testbed tools schools kept after the pilots ended.',
        confidence: 'Medium — the completed programmes are certain; the in-progress ones have one reading.',
      }
    case 'ai':
      return {
        verdict: 'Two indicators cannot yet describe a priority.',
        evidence: 'One policy recommendation made against a target of three; zero adopted against a target of one. That is the entire measured surface of QF\'s newest thematic area.',
        ask: 'Ask what the 2027 indicator set should be.',
        confidence: 'High on the figures, low on meaning — two indicators, one quarter, no history.',
      }
    default:
      return {
        verdict: 'The engine room is quiet, and quiet is what it is for.',
        evidence: 'All nine hard-ceiling indicators report at year end, so no Q1 reading exists. The history is mostly favourable: turnover ended 2025 at 7.0%, its best of four reported years; training hours have climbed from 6.0 to 15.0.',
        ask: 'Ask Human Capital whether the 2025 turnover improvement held through the hiring season.',
        confidence: 'Medium — annual indicators, judged on complete prior years, none on this quarter.',
      }
  }
}

/* ---------- URL-persisted filter state ---------- */

interface Filters {
  e: string[] // entities
  fw: string[] // frameworks
  cat: string[] // categories
  av: string[] // availability: trend | first | nr
  sort: 'mover' | 'gap' | 'alpha' | 'entity'
  yr: YearKey
}

const EMPTY: Filters = { e: [], fw: [], cat: [], av: [], sort: 'mover', yr: '2026Q1' }
const YEARS: YearKey[] = ['2022', '2023', '2024', '2025', '2026Q1']

function readFilters(themeId: string): Filters {
  // URL wins; else the last state this theme was left in (so returning restores filters)
  const q = location.hash.split('?')[1] ?? sessionStorage.getItem(`almishkat.filters.${themeId}`) ?? ''
  if (!q) return { ...EMPTY }
  const p = new URLSearchParams(q)
  return {
    e: p.get('e')?.split('|').filter(Boolean) ?? [],
    fw: p.get('fw')?.split('|').filter(Boolean) ?? [],
    cat: p.get('cat')?.split('|').filter(Boolean) ?? [],
    av: p.get('av')?.split('|').filter(Boolean) ?? [],
    sort: (p.get('sort') as Filters['sort']) ?? 'mover',
    yr: (YEARS.includes(p.get('yr') as YearKey) ? (p.get('yr') as YearKey) : '2026Q1'),
  }
}

function writeFilters(themeId: string, f: Filters) {
  const p = new URLSearchParams()
  if (f.e.length) p.set('e', f.e.join('|'))
  if (f.fw.length) p.set('fw', f.fw.join('|'))
  if (f.cat.length) p.set('cat', f.cat.join('|'))
  if (f.av.length) p.set('av', f.av.join('|'))
  if (f.sort !== 'mover') p.set('sort', f.sort)
  if (f.yr !== '2026Q1') p.set('yr', f.yr)
  const base = location.hash.split('?')[0]
  const qs = p.toString()
  history.replaceState(null, '', qs ? `${base}?${qs}` : base)
  sessionStorage.setItem(`almishkat.filters.${themeId}`, qs)
}

const AV_DEFS: { id: string; label: string; test: (k: Kpi) => boolean }[] = [
  { id: 'trend', label: 'Has trend history', test: (k) => k.movementSeries.length >= 3 },
  { id: 'first', label: 'First reading only', test: (k) => k.movementSeries.length < 3 && k.actuals['2026Q1'].value !== null },
  { id: 'nr', label: 'Not reported this quarter', test: (k) => k.actuals['2026Q1'].value === null },
]

function applyFilters(list: Kpi[], f: Filters, skip?: keyof Filters): Kpi[] {
  return list.filter((k) => {
    if (skip !== 'e' && f.e.length && !f.e.includes(k.entity)) return false
    if (skip !== 'fw' && f.fw.length && !f.fw.includes(k.framework)) return false
    if (skip !== 'cat' && f.cat.length && !f.cat.includes(k.category)) return false
    if (skip !== 'av' && f.av.length && !f.av.some((a) => AV_DEFS.find((d) => d.id === a)?.test(k))) return false
    return true
  })
}

/* ---------- screen ---------- */

export function L2({
  themeId,
  onOpenKpi,
  pointFocus,
  onBack,
}: {
  themeId: string
  onOpenKpi: (kpi: Kpi) => void
  pointFocus?: string | null
  onBack: () => void
}) {
  const theme = themeById(themeId)
  const name = THEME_NAME[themeId]
  const all = themeKpis(name)
  const entities = [...new Set(all.map((k) => k.entity))]
  const categories = [...new Set(all.map((k) => k.category))]
  const read = themeRead(themeId)
  const isOE = themeId === 'oe'
  const movers = useMemo(() => topMovers(name), [name])

  const [filters, setFilters] = useState<Filters>(() => readFilters(themeId))
  const [stuck, setStuck] = useState(false)
  const [prog, setProg] = useState(0)
  const [aiResult, setAiResult] = useState<Interp | null>(null)
  // the arrangement, not the data: persists per theme for the session (R8)
  const [view, setView] = useState<ViewId>(() => loadView(themeId))
  const changeView = (v: ViewId) => {
    setView(v)
    saveView(themeId, v)
  }
  const aiFieldRef = useRef<HTMLInputElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)

  useEffect(() => writeFilters(themeId, filters), [themeId, filters])
  useEffect(() => {
    const onScroll = () => {
      setStuck(window.scrollY > 130)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProg(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // one search on the page: ⌘K scrolls to the AI search and focuses it
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        aiFieldRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setTimeout(() => aiFieldRef.current?.focus({ preventScroll: true }), 350)
      }
      if (e.key === 'Escape') {
        // Escape mirrors the back control unless a transient layer is open
        if (document.activeElement === aiFieldRef.current) (document.activeElement as HTMLElement).blur()
        else if (!document.querySelector('[role="dialog"]')) onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  // BOTaina navigate-and-point handoff: scroll to the target group card
  useEffect(() => {
    if (!pointFocus) return
    const t = setTimeout(() => {
      document.querySelector(`[data-kpis*="${pointFocus}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 500)
    return () => clearTimeout(t)
  }, [pointFocus])

  const visible = useMemo(() => applyFilters(all, filters), [all, filters])
  // the same sort the Grid bands use, applied flat for List / By Entity
  const sortedVisible = useMemo(() => {
    const s = [...visible]
    const gapOf = (k: Kpi) =>
      k.cadence === 'continuous' && (k.targets['2026'].value ?? 0) > 0 && k.actuals['2026Q1'].value !== null
        ? 1 - (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number)
        : -2
    if (filters.sort === 'alpha') s.sort((a, b) => a.name.localeCompare(b.name))
    else if (filters.sort === 'entity') s.sort((a, b) => a.entity.localeCompare(b.entity) || a.name.localeCompare(b.name))
    else if (filters.sort === 'gap') s.sort((a, b) => gapOf(b) - gapOf(a))
    else s.sort((a, b) => (b.movementScore ?? -1) - (a.movementScore ?? -1))
    return s
  }, [visible, filters.sort])
  const annotate = themeId === 'social' && filters.yr === '2026Q1' ? facts.wish.kpi.id : null

  // a historical year regenerates the summary — and admits thinness rather than
  // manufacturing a claim (R6 fix 5)
  const yearRead = useMemo(() => {
    if (filters.yr === '2026Q1') return null
    const y = filters.yr
    const reported = all.filter((k) => k.actuals[y]?.value !== null)
    const withTarget = all.filter((k) => k.targets[y]?.value !== null && k.targets[y]?.value !== undefined)
    const thin = reported.length < all.length / 3
    return {
      verdict: thin
        ? `${y} is a thin year on record for ${name}.`
        : `${name} in ${y}, as reported at the time.`,
      evidence: `${reported.length} of ${all.length} indicators carry a ${y} actual, and ${withTarget.length} had a ${y} target. Figures below show ${y} actuals against ${y} targets; everything without a reading is marked, not hidden.${thin ? ' The record is too sparse to support a portfolio-level claim for this year, so none is made.' : ''}`,
      ask: `Ask whether ${y} history for the remaining indicators exists outside this workbook.`,
      confidence: `High on what is shown — every figure is a reported cell. Coverage: ${reported.length} of ${all.length}.`,
    }
  }, [filters.yr, all, name])

  const toggle = (key: 'e' | 'fw' | 'cat' | 'av', v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }))

  const activeChips = [
    ...filters.e.map((v) => ({ key: 'e' as const, v })),
    ...filters.fw.map((v) => ({ key: 'fw' as const, v })),
    ...filters.cat.map((v) => ({ key: 'cat' as const, v })),
    ...filters.av.map((v) => ({ key: 'av' as const, v: AV_DEFS.find((d) => d.id === v)?.label ?? v })),
  ]

  const count = (key: 'e' | 'fw' | 'cat' | 'av', test: (k: Kpi) => boolean) =>
    applyFilters(all, filters, key).filter(test).length

  return (
    <div className="min-h-dvh pb-36">
      {/* sticky collapsed bar: logo, breadcrumb, search — position is always visible */}
      <div
        className="fixed inset-x-0 top-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ background: theme.fill, transform: stuck ? 'translateY(0)' : 'translateY(-100%)' }}
      >
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-5 md:px-8">
          <span className="flex min-w-0 items-center gap-4">
            <LogoWhite className="h-7 w-auto shrink-0" />
            <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
              <button onClick={onBack} className="shrink-0 text-white/70 transition-colors hover:text-white">
                Thematic View
              </button>
              <ChevronRight size={13} strokeWidth={1.7} className="shrink-0 text-white/45" />
              <span className="truncate font-semibold text-white">{name}</span>
            </nav>
          </span>
          {/* no search here — ⌘K jumps to the one AI search below (R7 fix 5) */}
          <span className="shrink-0 text-[12px] text-white/60">
            <span className="num">{all.length}</span> indicators · ⌘K to search
          </span>
        </div>
        {/* scroll progress along the bar's bottom edge */}
        <span aria-hidden className="block h-[2px] bg-white/40 transition-[width] duration-150" style={{ width: `${prog}%` }} />
      </div>

      {/* full-bleed hue band, carrying the platform chrome (R6 fix 1) */}
      <div
        ref={bandRef}
        className="relative"
        style={{ background: `linear-gradient(180deg, ${theme.fill} 0%, ${DARK[themeId]} 100%)` }}
      >
        <div className="mx-auto max-w-[1180px] px-5 md:px-8">
          {/* the platform's top bar, light-on-dark, no surface of its own.
              One search per page: it lives in the explore section (R7 fix 1). */}
          <div className="flex items-center justify-between gap-6 pt-4">
            <LogoWhite className="h-9 w-auto shrink-0" />
            <HeaderCluster hidePeriod light />
          </div>

          {/* chrome → title → summary: gaps between groups visibly larger than within them */}
          <div className="flex items-end justify-between gap-6 pb-16 pt-12">
            <div>
              <button
                onClick={onBack}
                className="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:text-white"
              >
                <ArrowLeft size={15} strokeWidth={1.7} /> Thematic View
              </button>
              <h1 className="text-[40px] font-semibold leading-none tracking-tight text-white">{name}</h1>
              <div className="mt-2 text-[13.5px] text-white/75">
                {all.length} indicators · {entities.join(', ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-5 md:px-8">
        {/* the one summary component — regenerates when a historical year is selected */}
        <AiRead
          overlap
          verdict={yearRead ? yearRead.verdict : read.verdict}
          body={<p className="max-w-[80ch]">{yearRead ? yearRead.evidence : read.evidence}</p>}
          ask={yearRead ? yearRead.ask : read.ask}
          meta={
            yearRead ? (
              <>{yearRead.confidence}</>
            ) : (
              <>
                Confidence: {read.confidence} · What I can't see: quarterly milestones — QF has not defined
                expected pace.
              </>
            )
          }
        />

        {/* the briefing continues straight into its evidence — nothing in between (R6 fix 3).
            These four are chosen by the platform and do not respond to filters.
            All four cards share identical dimensions and an identical internal
            baseline grid; a shorter section leaves its slot empty (R7 fix 2). */}
        {(movers.attention.length > 0 || movers.performing.length > 0) && (
          <div className="mt-5 grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-2">
            <MoverColumn
              title="Needs attention"
              tone="#8a1538"
              kpis={movers.attention.slice(0, 2)}
              hue={theme.fill}
              onOpen={onOpenKpi}
              emptyNote="Nothing in this theme is moving unfavourably. That is the finding."
            />
            <MoverColumn
              title="Performing"
              tone="#3c6a5f"
              kpis={movers.performing.slice(0, 2)}
              hue={theme.fill}
              onOpen={onOpenKpi}
              emptyNote="No favourable movement measurable yet — most indicators have a single reading."
            />
          </div>
        )}

        {/* ——— explore: every indicator in the theme, with AI search (R6 fix 4).
            One panel, three distinct layers: title+search, examples (help text),
            filters (controls) — each separated by real space (R7 fix 4). ——— */}
        <section className="mt-12 rounded-panel bg-card p-7 shadow-(--shadow-card)">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold tracking-tight text-ink">
              Explore all {all.length} indicators
            </h2>
            <ViewSwitcher view={view} onChange={changeView} hue={theme.fill} multiEntity={entities.length > 1} />
          </div>
          <div className="mt-5">
            <AiSearchBar all={all} themeName={name} hue={theme.fill} onResult={setAiResult} active={aiResult} inputRef={aiFieldRef} />
          </div>

          {/* filters — controls, visually distinct from the suggestions above */}
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-cream pt-5 text-[12.5px]">
          {/* year: each option carries its data count so sparseness is visible before the click */}
          <FilterMenu
            label={`Year: ${filters.yr === '2026Q1' ? 'Q1 2026' : filters.yr}`}
            hue={theme.fill}
            active={filters.yr !== '2026Q1'}
          >
            {YEARS.map((y) => {
              const n = all.filter((k) => k.actuals[y]?.value !== null).length
              return (
                <Opt
                  key={y}
                  on={filters.yr === y}
                  onClick={() => setFilters((f) => ({ ...f, yr: y }))}
                  label={`${y === '2026Q1' ? 'Q1 2026' : y} · ${n} of ${all.length}`}
                />
              )
            })}
          </FilterMenu>
          {entities.length > 1 && (
            <FilterMenu label="Entity" hue={theme.fill} active={filters.e.length > 0}>
              {entities.map((e) => (
                <Opt key={e} on={filters.e.includes(e)} onClick={() => toggle('e', e)} label={e} n={count('e', (k) => k.entity === e)} />
              ))}
            </FilterMenu>
          )}
          {!isOE && (
            <FilterMenu label="Framework" hue={theme.fill} active={filters.fw.length > 0}>
              {['Impact', 'Strategic', 'Operational'].map((f) => (
                <Opt key={f} on={filters.fw.includes(f)} onClick={() => toggle('fw', f)} label={f} n={count('fw', (k) => k.framework === f)} />
              ))}
            </FilterMenu>
          )}
          <FilterMenu label="Category" hue={theme.fill} active={filters.cat.length > 0} searchable={categories.length > 8}>
            {categories.map((c) => (
              <Opt key={c} on={filters.cat.includes(c)} onClick={() => toggle('cat', c)} label={c} n={count('cat', (k) => k.category === c)} />
            ))}
          </FilterMenu>
          <FilterMenu label="Data availability" hue={theme.fill} active={filters.av.length > 0}>
            {AV_DEFS.map((d) => (
              <Opt key={d.id} on={filters.av.includes(d.id)} onClick={() => toggle('av', d.id)} label={d.label} n={count('av', d.test)} />
            ))}
          </FilterMenu>
          <FilterMenu label={`Sort: ${{ mover: 'Biggest mover', gap: 'Largest gap', alpha: 'Alphabetical', entity: 'Entity' }[filters.sort]}`} hue={theme.fill} active={filters.sort !== 'mover'}>
            {(['mover', 'gap', 'alpha', 'entity'] as const).map((s) => (
              <Opt
                key={s}
                on={filters.sort === s}
                onClick={() => setFilters((f) => ({ ...f, sort: s }))}
                label={{ mover: 'Biggest mover', gap: 'Largest gap', alpha: 'Alphabetical', entity: 'Entity' }[s]}
              />
            ))}
          </FilterMenu>

          {activeChips.map(({ key, v }) => (
            <button
              key={key + v}
              onClick={() => {
                if (key === 'av') {
                  const id = AV_DEFS.find((d) => d.label === v)?.id ?? v
                  toggle('av', id)
                } else toggle(key, v)
              }}
              className="flex items-center gap-1 rounded-chip px-2.5 py-1 text-[12px] font-medium text-white"
              style={{ background: theme.fill }}
            >
              {v} <X size={12} strokeWidth={2} />
            </button>
          ))}
          {activeChips.length >= 2 && (
            <button onClick={() => setFilters((f) => ({ ...EMPTY, sort: f.sort }))} className="text-[12px] text-ink-mute underline">
              Clear all
            </button>
          )}
          </div>
        </section>

        {/* AI-search results replace the banded list while a question is active */}
        {aiResult ? (
          <div className="mt-6">
            <p className="voice flex items-start gap-2 text-[15px] italic leading-snug text-ink">
              <span className="mt-0.5 shrink-0">
                <Spark size={13} />
              </span>
              <span>{aiResult.answer}</span>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aiResult.kpis.map((k) => (
                <KpiCard key={k.id} group={[k]} hue={theme.fill} size="sm" onOpen={() => onOpenKpi(k)} />
              ))}
              {aiResult.kpis.length === 0 && (
                <div className="col-span-full rounded-card bg-card p-6 text-[13.5px] italic text-ink-mute shadow-(--shadow-card)">
                  Nothing in {name} matches that reading of the question — try removing a chip above.
                </div>
              )}
            </div>
          </div>
        ) : view === 'list' ? (
          <ListView kpis={sortedVisible} hue={theme.fill} sort={filters.sort} year={filters.yr} />
        ) : view === 'compare' ? (
          <CompareView
            kpis={visible}
            defaults={[...movers.attention, ...movers.performing]}
            hue={theme.fill}
            onOpenKpi={onOpenKpi}
          />
        ) : view === 'entity' && entities.length > 1 ? (
          <EntityView kpis={sortedVisible} hue={theme.fill} year={filters.yr} />
        ) : (
          <Bands
            visible={visible}
            isOE={isOE}
            hue={theme.fill}
            onOpenKpi={onOpenKpi}
            annotate={annotate}
            sort={filters.sort}
            year={filters.yr}
            filtersActive={activeChips.length > 0 || filters.yr !== '2026Q1' || filters.sort !== 'mover'}
            focusId={pointFocus ?? null}
            onRelax={() => setFilters((f) => ({ ...EMPTY, sort: f.sort }))}
          />
        )}
      </div>
    </div>
  )
}

/* ---------- AI search: a question resolves to a filter over the indicator set,
   answered in BOTaina's voice with the interpretation shown as chips (R6 fix 4) ---------- */

export interface Interp {
  chips: { id: string; label: string }[]
  kpis: Kpi[]
  answer: string
}

interface Facet {
  id: string
  label: string
  test: (k: Kpi) => boolean
  rank: (k: Kpi) => number
  answer: (matches: Kpi[], themeName: string) => string
}

const gapRatio = (k: Kpi) =>
  k.cadence === 'continuous' && (k.targets['2026'].value ?? 0) > 0 && k.actuals['2026Q1'].value !== null
    ? 1 - (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number)
    : -1

const INTENTS: { match: RegExp; facet: Facet }[] = [
  {
    match: /(low|behind|fall|falling|fell|declin|drop|worst|underperform|shrink|down)/,
    facet: {
      id: 'declining',
      label: 'Movement: declining or far from target',
      test: (k) => (k.propChange ?? 0) < -0.05 || gapRatio(k) > 0.6,
      rank: (k) => -(k.propChange ?? 0) * 10 + Math.max(0, gapRatio(k)),
      answer: (m, t) => {
        if (m.length === 0) return `Nothing in ${t} is moving unfavourably against its own history — that is the finding.`
        const worst = [...m].sort((a, b) => (a.propChange ?? 0) - (b.propChange ?? 0))[0]
        return `${m.length} indicator${m.length > 1 ? 's' : ''} in ${t} ${m.length > 1 ? 'have' : 'has'} fallen against prior readings or sit far from a real commitment — ${worst.name} is the steepest.`
      },
    },
  },
  {
    match: /(stopped|stop reporting|gone quiet|went quiet|silent|no longer report)/,
    facet: {
      id: 'stopped',
      label: 'Stopped reporting this quarter',
      test: (k) =>
        k.cadence === 'continuous' &&
        k.actuals['2026Q1'].value === 0 &&
        ['2022', '2023', '2024', '2025'].some((y) => (k.actuals[y].value ?? 0) !== 0),
      rank: (k) => Math.max(...k.movementSeries.map(([, v]) => v), 0),
      answer: (m, t) =>
        m.length
          ? `${m.length} indicator${m.length > 1 ? 's' : ''} in ${t} reported nothing this quarter after active prior years — worth confirming the figures are still being collected.`
          : `Every previously active indicator in ${t} has a Q1 figure.`,
    },
  },
  {
    match: /(no target|without target|missing target|target not set)/,
    facet: {
      id: 'notarget',
      label: 'No 2026 target set',
      test: (k) => k.targets['2026'].value === null,
      rank: () => 0,
      answer: (m, t) =>
        m.length
          ? `${m.length} indicator${m.length > 1 ? 's' : ''} in ${t} ${m.length > 1 ? 'have' : 'has'} no 2026 target — a governance gap, not a performance one.`
          : `Every indicator in ${t} carries a 2026 target.`,
    },
  },
  {
    match: /(not reported|unreported|missing|no data|no reading)/,
    facet: {
      id: 'nr',
      label: 'Not reported this quarter',
      test: (k) => k.actuals['2026Q1'].value === null,
      rank: () => 0,
      answer: (m, t) =>
        m.length
          ? `${m.length} indicator${m.length > 1 ? 's' : ''} in ${t} ${m.length > 1 ? 'have' : 'has'} no Q1 reading — most report annually, so the gap is cadence, not neglect.`
          : `Everything in ${t} has a Q1 reading.`,
    },
  },
  {
    match: /(met|exact|already at|hit the target|achieved)/,
    facet: {
      id: 'met',
      label: 'Already at full-year target',
      test: (k) => k.state === 'TARGET_ALREADY_MET',
      rank: (k) => (k.exactHit ? 1 : 0),
      answer: (m, t) =>
        m.length
          ? `${m.length} indicator${m.length > 1 ? 's' : ''} in ${t} already sit at the full-year 2026 target after one quarter — the exact hits say more about the targets than the work.`
          : `Nothing in ${t} has reached its full-year target yet.`,
    },
  },
  {
    match: /(performing|improv|grow|climb|rising|up|best|strong)/,
    facet: {
      id: 'climbing',
      label: 'Movement: improving',
      test: (k) => (k.propChange ?? 0) > 0.05,
      rank: (k) => k.movementScore ?? 0,
      answer: (m, t) => {
        if (m.length === 0) return `No favourable movement is measurable yet in ${t} — most indicators have a single reading.`
        const best = [...m].sort((a, b) => (b.movementScore ?? 0) - (a.movementScore ?? 0))[0]
        return `${m.length} indicator${m.length > 1 ? 's have' : ' has'} climbed against prior readings in ${t} — ${best.name} is the strongest.`
      },
    },
  },
]

const STOPWORDS = new Set('which indicators indicator are is the a an any anything with show me what has have in of to for on this that and or'.split(' '))

export function interpret(q: string, all: Kpi[], themeName: string): Interp {
  const s = q.toLowerCase()
  const intent = INTENTS.find((i) => i.match.test(s))?.facet ?? null
  const keywords = s
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !(intent && intent.id !== 'kw' && INTENTS.some((i) => i.match.test(w))))
  const kwTest = (k: Kpi) =>
    keywords.length === 0 ||
    keywords.some((w) => [k.name, k.category, k.entity, k.definition ?? ''].some((h) => h.toLowerCase().includes(w)))

  const chips: Interp['chips'] = []
  let pool = all
  if (intent) {
    pool = pool.filter(intent.test)
    chips.push({ id: intent.id, label: intent.label })
  }
  if (!intent || keywords.length > 0) {
    const kwPool = pool.filter(kwTest)
    // a keyword facet only helps if it actually narrows without emptying
    if (keywords.length > 0 && (intent === null || kwPool.length > 0)) {
      pool = kwPool
      chips.push({ id: 'kw', label: `Mentions: ${keywords.join(', ')}` })
    }
  }
  const ranked = intent ? [...pool].sort((a, b) => intent.rank(b) - intent.rank(a)) : pool
  const answer = intent
    ? intent.answer(ranked, themeName)
    : ranked.length
      ? `${ranked.length} indicator${ranked.length > 1 ? 's' : ''} in ${themeName} mention ${keywords.join(', ') || 'that'}.`
      : `Nothing in ${themeName} matches "${q}".`
  return { chips, kpis: ranked, answer }
}

function AiSearchBar({
  all,
  themeName,
  hue,
  onResult,
  active,
  inputRef,
}: {
  all: Kpi[]
  themeName: string
  hue: string
  onResult: (r: Interp | null) => void
  active: Interp | null
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')

  const run = (text: string) => {
    if (!text.trim()) {
      onResult(null)
      setAsked('')
      return
    }
    setAsked(text)
    onResult(interpret(text, all, themeName))
  }

  const removeChip = (id: string) => {
    if (!active) return
    const remaining = active.chips.filter((c) => c.id !== id)
    if (remaining.length === 0) {
      onResult(null)
      setQ('')
      setAsked('')
      return
    }
    // re-run with the facet removed: keyword-only or intent-only reading of the same question
    if (id === 'kw') {
      const intent = INTENTS.find((i) => i.match.test(asked.toLowerCase()))?.facet
      if (intent) {
        const pool = all.filter(intent.test).sort((a, b) => intent.rank(b) - intent.rank(a))
        onResult({ chips: [{ id: intent.id, label: intent.label }], kpis: pool, answer: intent.answer(pool, themeName) })
      }
    } else {
      const kw = asked
      onResult(interpret(kw.replace(INTENTS.find((i) => i.facet.id === id)?.match ?? /$^/, ''), all, themeName))
    }
  }

  const SEEDS = ['Which indicators are performing low?', 'What has stopped reporting?', 'Anything with no target?']

  return (
    <div>
      <form
        className="ai-field flex items-center gap-2.5 py-1.5 pe-2 ps-4 shadow-(--shadow-card)"
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
      >
        <Spark size={15} />
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask about ${themeName} in your own words — or type an indicator name`}
          className="w-full bg-transparent py-1.5 text-[14px] outline-none placeholder:text-ink-mute"
          aria-label={`Ask about ${themeName}`}
        />
        {active && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              run('')
            }}
            className="rounded-full p-1.5 text-ink-mute hover:bg-cream"
            aria-label="Clear question"
          >
            <X size={14} strokeWidth={1.7} />
          </button>
        )}
        <button
          type="submit"
          className="shrink-0 rounded-full px-4 py-2 text-[12.5px] font-medium text-white"
          style={{ background: 'var(--ai-gradient)' }}
        >
          Ask
        </button>
      </form>

      {active ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-ink-mute">Understood as:</span>
          {active.chips.map((c) => (
            <button
              key={c.id}
              onClick={() => removeChip(c.id)}
              className="flex items-center gap-1 rounded-chip px-2.5 py-1 font-medium text-white"
              style={{ background: hue }}
            >
              {c.label} <X size={12} strokeWidth={2} />
            </button>
          ))}
        </div>
      ) : (
        /* suggestions, not controls: quiet serif help text attached to the field
           above — nothing pill/card-like that could be mistaken for a filter */
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 ps-1 text-[12px]">
          <span className="italic text-ink-mute">Try asking:</span>
          {SEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQ(s)
                run(s)
              }}
              className="voice rounded-full px-1 italic text-ink-soft underline decoration-dotted decoration-ink-mute/50 underline-offset-4 transition-colors hover:text-sidra"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- pieces ---------- */

function SearchBox(props: {
  theme: string
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  setQuery: (s: string) => void
  open: boolean
  setOpen: (b: boolean) => void
  results: { k: Kpi; field: number }[]
  all: Kpi[]
  onPick: (k: Kpi) => void
  compact?: boolean
}) {
  const { inputRef, query, setQuery, open, setOpen, results, all, onPick, compact } = props
  const suggestions = all.slice(0, 3)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div ref={boxRef} className="relative" style={{ width: compact ? 300 : 340 }}>
      <div className="flex items-center gap-2 rounded-input bg-white/90 px-3 py-2 shadow-sm">
        <Search size={15} strokeWidth={1.5} className="shrink-0 text-ink-mute" />
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              onPick(results[0].k)
              setOpen(false)
            }
          }}
          placeholder="Find any indicator"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-mute"
          aria-label="Search indicators"
        />
        <kbd className="rounded bg-cream px-1.5 py-0.5 text-[10px] text-ink-mute">⌘K</kbd>
      </div>
      <AnimatePresence>
        {open && (query || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-input bg-card shadow-(--shadow-card-hover)"
          >
            {query ? (
              results.length ? (
                results.map(({ k }) => (
                  <button
                    key={k.id}
                    onClick={() => {
                      onPick(k)
                      setOpen(false)
                    }}
                    className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-cream"
                  >
                    <span className="text-[13px] text-ink">
                      <Highlight text={k.name} q={query} />
                      <span className="ml-2 text-[11px] text-ink-mute">{k.entity}</span>
                    </span>
                    <span className="num shrink-0 text-[12.5px] text-sidra">
                      {k.actuals['2026Q1'].value !== null ? fmt(k.actuals['2026Q1'].value) : k.actuals['2026Q1'].raw ?? '—'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3.5 py-3 text-[12.5px] text-ink-mute">
                  Nothing matches. Try:{' '}
                  {suggestions.map((s) => (
                    <button key={s.id} onClick={() => setQuery(s.name)} className="mr-2 text-sidra underline">
                      {s.name}
                    </button>
                  ))}
                </div>
              )
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[rgba(80,226,195,0.35)] px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function FilterMenu({
  label,
  hue,
  active,
  searchable,
  children,
}: {
  label: string
  hue: string
  active: boolean
  searchable?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-chip bg-card px-3 py-1.5 font-medium shadow-(--shadow-card) transition-colors"
        style={{ color: active ? hue : 'var(--color-ink-soft)' }}
      >
        {label} <ChevronDown size={13} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[300px] min-w-[230px] overflow-y-auto rounded-input bg-card p-1.5 shadow-(--shadow-card-hover)"
          >
            {searchable && (
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter options"
                className="mb-1 w-full rounded-chip bg-cream px-2.5 py-1.5 text-[12.5px] outline-none"
              />
            )}
            <div className="flex flex-col">
              {Array.isArray(children)
                ? (children as React.ReactElement<{ label?: string }>[]).filter(
                    (c) => !q || (c.props.label ?? '').toLowerCase().includes(q.toLowerCase()),
                  )
                : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Opt({ on, onClick, label, n }: { on: boolean; onClick: () => void; label: string; n?: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-chip px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-cream"
      style={{ color: on ? 'var(--color-sidra)' : 'var(--color-ink-soft)', fontWeight: on ? 600 : 400 }}
    >
      <span>
        {on ? '✓ ' : ''}
        {label}
      </span>
      {n !== undefined && <span className="num text-[11px] text-ink-mute">{n}</span>}
    </button>
  )
}

function MoverColumn({
  title,
  tone,
  kpis,
  hue,
  onOpen,
  emptyNote,
}: {
  title: string
  tone: string
  kpis: Kpi[]
  hue: string
  onOpen: (k: Kpi) => void
  emptyNote: string
}) {
  return (
    /* full height + a growing card area: the two columns are siblings in a
       stretched grid, so this makes all four spotlight cards share one height
       rather than each section sizing its own row */
    <div className="flex h-full flex-col">
      <h3 className="label mb-2.5" style={{ color: tone }}>
        {title}
      </h3>
      {kpis.length === 0 ? (
        <div className="flex-1 rounded-card bg-card p-5 text-[13px] italic text-ink-mute shadow-(--shadow-card)" style={{ minHeight: 200 }}>
          {emptyNote}
        </div>
      ) : (
        /* spotlight = the same card as the explore grid, one size up (R8 fix 6);
           items-stretch keeps the four cards level without hard-coding a height */
        <div className="grid flex-1 grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          {kpis.map((k) => (
            <KpiCard key={k.id} group={[k]} hue={hue} size="lg" className="h-full" onOpen={() => onOpen(k)} />
          ))}
          {/* the shorter section keeps its slot rather than stretching */}
          {kpis.length === 1 && (
            <div aria-hidden className="min-h-[200px] rounded-card border border-dashed" style={{ borderColor: 'rgba(18,40,34,0.1)' }} />
          )}
        </div>
      )}
    </div>
  )
}


const BANDS = [
  { id: 'Impact', q: 'Did anything change in the world?' },
  { id: 'Strategic', q: 'Are we building the capability to keep changing it?' },
  { id: 'Operational', q: 'Is the machine running?' },
] as const

/** One honest sentence for a collapsed band — what a CEO needs before deciding to open it (R8 fix 4).
    Each indicator is counted once, most-important condition first, so the counts sum to the band. */
function bandLine(kpis: Kpi[]): string {
  const ent = new Set(kpis.map((k) => k.entity)).size
  const tally = { ceiling: 0, met: 0, quiet: 0, first: 0, rest: 0 }
  for (const k of kpis) {
    if (k.state === 'ABOVE_CEILING') tally.ceiling++
    else if (k.state === 'TARGET_ALREADY_MET' || k.exactHit) tally.met++
    else if (k.state === 'IDLE_THIS_CYCLE' || k.state === 'REPORTS_AT_YEAR_END') tally.quiet++
    else if (k.movementSeries.length < 2) tally.first++
    else tally.rest++
  }
  const parts: string[] = []
  if (tally.ceiling) parts.push(`${tally.ceiling} above a ceiling`)
  if (tally.met) parts.push(`${tally.met} already at the 2026 target`)
  if (tally.first) parts.push(`${tally.first} first readings`)
  if (tally.quiet) parts.push(`${tally.quiet} quiet by design`)
  if (tally.rest) parts.push(`${tally.rest} in progress`)
  return `${ent > 1 ? `across ${ent} entities — ` : ''}${parts.join(', ')}.`
}

function Bands({
  visible,
  isOE,
  hue,
  onOpenKpi,
  annotate,
  sort,
  year,
  filtersActive,
  focusId,
  onRelax,
}: {
  visible: Kpi[]
  isOE: boolean
  hue: string
  onOpenKpi: (kpi: Kpi) => void
  annotate: string | null
  sort: Filters['sort']
  year: YearKey
  filtersActive: boolean
  focusId: string | null
  onRelax: () => void
}) {
  // CEO-first density: bands are closed until asked for; the spotlights above
  // carry the judgement. A narrowed set (filters, a historical year) is a
  // request for the detail, so it opens everything. A BOTaina handoff or an
  // annotated finding opens the band that contains it — a pointed-at card
  // must never sit behind a fold.
  const [openBands, setOpenBands] = useState<Set<string>>(() => {
    const s = new Set<string>(isOE ? ['Operational'] : [])
    for (const id of [focusId, annotate])
      if (id) {
        const fw = visible.find((k) => k.id === id)?.framework
        if (fw) s.add(fw)
      }
    return s
  })

  if (visible.length === 0)
    return (
      <div className="mt-8 rounded-card bg-card p-8 text-center shadow-(--shadow-card)">
        <p className="text-[14px] text-ink">No indicators match this combination.</p>
        <p className="mt-1 text-[12.5px] text-ink-mute">
          The data-availability filter is usually the one to relax first.
        </p>
        <button onClick={onRelax} className="mt-3 rounded-chip px-3 py-1.5 text-[12.5px] font-medium text-white" style={{ background: hue }}>
          Clear filters
        </button>
      </div>
    )

  return (
    <>
      {(isOE ? [BANDS[2]] : BANDS).map((band) => {
        const bandKpis = visible.filter((k) => k.framework === band.id)
        if (bandKpis.length === 0) return null
        const open = filtersActive || openBands.has(band.id)
        return (
          <section key={band.id} className="mt-9" aria-label={`${band.id} band`}>
            <button
              onClick={() =>
                setOpenBands((s) => {
                  const n = new Set(s)
                  if (n.has(band.id)) n.delete(band.id)
                  else n.add(band.id)
                  return n
                })
              }
              className="flex w-full items-baseline justify-between gap-4 border-b-2 pb-2 text-left"
              style={{ borderColor: `color-mix(in srgb, ${hue} 25%, transparent)` }}
              aria-expanded={open}
            >
              <div className="flex items-baseline gap-3">
                <h2 className="label text-[12px]" style={{ color: hue }}>
                  {band.id}
                </h2>
                <span className="voice text-[14px] italic text-ink-mute">{band.q}</span>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-[13px] text-ink-mute">
                <span className="num">{bandKpis.length}</span>
                <ChevronDown size={15} strokeWidth={1.8} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {open ? (
              <BandBody kpis={bandKpis} hue={hue} onOpenKpi={onOpenKpi} annotateKpiId={annotate} sort={sort} year={year} />
            ) : (
              /* the collapsed state is a characterisation, not a teaser */
              <div className="py-3.5 text-[13.5px] leading-snug text-ink-soft">{bandLine(bandKpis)}</div>
            )}
          </section>
        )
      })}
    </>
  )
}

function BandBody({
  kpis,
  hue,
  onOpenKpi,
  annotateKpiId,
  sort,
  year,
}: {
  kpis: Kpi[]
  hue: string
  onOpenKpi: (kpi: Kpi) => void
  annotateKpiId: string | null
  sort: Filters['sort']
  year: YearKey
}) {
  const groups = useMemo(() => {
    const sorted = [...kpis]
    if (sort === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'entity') sorted.sort((a, b) => a.entity.localeCompare(b.entity) || a.name.localeCompare(b.name))
    if (sort === 'mover') sorted.sort((a, b) => (b.movementScore ?? -1) - (a.movementScore ?? -1))
    if (sort === 'gap')
      sorted.sort((a, b) => {
        const g = (k: Kpi) =>
          k.cadence === 'continuous' && (k.targets['2026'].value ?? 0) > 0 && k.actuals['2026Q1'].value !== null
            ? 1 - (k.actuals['2026Q1'].value as number) / (k.targets['2026'].value as number)
            : -2
        return g(b) - g(a)
      })
    const m = new Map<string, Kpi[]>()
    for (const k of sorted) m.set(k.category, [...(m.get(k.category) ?? []), k])
    return m
  }, [kpis, sort])

  return (
    <div className="mt-4 flex flex-col gap-7">
      <AnimatePresence mode="popLayout">
        {[...groups.entries()].map(([cat, list], gi) => {
          const cards = buildGroupCards(list, hue, year)
          return (
            <motion.div
              key={cat}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: gi * 0.03 }}
            >
              <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
                <span aria-hidden className="h-3.5 w-[3px] rounded-full" style={{ background: hue }} />
                {cat}
              </h3>
              {year !== '2026Q1' ? (
                /* a historical year keeps its uniform value tiles (R6 fix 5) */
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {cards.map((c) => (
                    <GroupCardView key={c.key} card={c} onOpen={() => onOpenKpi(c.kpis[0])} />
                  ))}
                </div>
              ) : (
                /* the same card as everywhere else — snapshot only, trends in the overlay (R8 fixes 1/6) */
                <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((c) => (
                    <AnnotatedSlot key={c.key} annotated={c.kpis.some((k) => k.id === annotateKpiId)}>
                      <KpiCard
                        group={c.kpis}
                        title={c.title}
                        hue={hue}
                        size="sm"
                        className="h-full"
                        onOpen={() => onOpenKpi(c.kpis[0])}
                        meta={c.rep.kind === 'idle' || c.rep.kind === 'not-reported' ? c.rep.note : undefined}
                      />
                    </AnnotatedSlot>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function availabilityLabel(k: Kpi): string {
  if (k.state === 'REPORTS_AT_YEAR_END') return 'reports at year end'
  if (k.state === 'IDLE_THIS_CYCLE') return 'idle this cycle by design'
  if (k.state === 'NOT_REPORTED') return 'not reported this quarter'
  return k.movementSeries.length >= 3 ? `${k.movementSeries.length} readings` : 'first reading'
}

/* BOTaina's handoff annotation, anchored to the card itself — the card no
   longer carries a trend chart, so there is no chart pixel to point at (R8). */
function AnnotatedSlot({ annotated, children }: { annotated: boolean; children: React.ReactNode }) {
  if (!annotated) return <>{children}</>
  return (
    <div className="relative">
      {children}
      <motion.div
        className="pointer-events-none absolute -top-9 right-2 z-10 flex items-end gap-1.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <BotainaFigure size={52} state="pointing" />
        <div className="mb-4 max-w-[170px] rounded-input bg-sidra px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-md">
          This is the number I would raise first.
        </div>
      </motion.div>
    </div>
  )
}

/* Historical-year tiles only — the current quarter renders KpiCard. */
function GroupCardView({ card, onOpen }: { card: GroupCard; onOpen: () => void }) {
  return (
    <div
      className="relative cursor-pointer rounded-card bg-card p-5 transition-shadow duration-200 hover:shadow-(--shadow-card-hover)"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onClick={onOpen}
      role="button"
      data-kpis={card.kpis.map((k) => k.id).join(',')}
      aria-label={`${card.title} — open detail`}
    >
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h4 className="text-[13.5px] font-semibold text-ink">{card.title}</h4>
        <span className="shrink-0 text-[11px] text-ink-mute">
          {card.entities.join(', ')} ·{' '}
          {card.kpis.length > 1 ? `${card.kpis.length} indicators` : availabilityLabel(card.kpis[0])}
        </span>
      </div>

      {card.rep.kind === 'first-reading' && (
        <div className="grid grid-cols-2 gap-3 py-2">
          {card.rep.rows.map((r) => (
            <div key={r.kpi.id} className="rounded-input bg-cream/70 p-3">
              <div className="num text-[24px] font-bold text-sidra">
                {r.value === null ? '—' : new Intl.NumberFormat('en', { notation: r.value >= 1e6 ? 'compact' : 'standard' }).format(r.value)}
                {r.target !== null && r.target > 0 && (
                  <span className="ml-1 text-[12px] font-normal text-ink-mute">
                    of {new Intl.NumberFormat('en', { notation: r.target >= 1e6 ? 'compact' : 'standard' }).format(r.target)}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-tight text-ink-soft">{r.kpi.name}</div>
              <div className="mt-1 text-[10.5px] italic text-ink-mute">{r.note}</div>
            </div>
          ))}
        </div>
      )}

      {(card.rep.kind === 'idle' || card.rep.kind === 'not-reported') && (
        <div className="flex h-[120px] items-center justify-center rounded-input bg-cream/60 px-6 text-center text-[13px] italic text-ink-mute">
          {card.rep.note}
        </div>
      )}

      <p className="mt-2.5 flex items-start gap-2 border-t border-cream pt-2.5">
        <span className="mt-0.5">
          <Spark size={12} />
        </span>
        <span className="voice text-[13.5px] italic leading-snug text-ink">{card.aiLine}</span>
      </p>
    </div>
  )
}
