/**
 * The global search listing — the CEO's route to anything not on the
 * dashboard, reaching ALL 240 rows, Executive and Thematic both.
 *
 * IA (rejections in docs/exec-dashboard-notes.md): one query box interpreted
 * into REMOVABLE CHIPS, one AI answer line in BOTaina's voice, and ONE LINE of
 * filter dropdowns above the results — dashboard, status, entity, thematic
 * area, category as a two-level tree (a parent includes all its children),
 * performance framework and year, all with live counts, composing with the
 * query and each other. An empty result names which filter to relax.
 *
 * The facets were a left rail until it grew past fifty simultaneous controls
 * in a column taller than the viewport; collapsing them into dropdowns gave
 * the results the full width back. Cards here carry the L1 mark only — a
 * listing is for FINDING an indicator, and the trend is one click away in the
 * overlay.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Info, Search as SearchIcon } from 'lucide-react'
import { HeaderCluster, Spark, TopNav } from '../components/Shell'
import { KpiCard } from '../components/KpiCard'
import { CardMarkL1 } from '../components/charts/Marks2'
import { FacetDropdown, FilterChips, type FacetItem } from '../components/FilterBar'
import { themeByName } from '../model/data'
import {
  obsKpis,
} from '../model/obs'
import { searchWith, zeroAmbiguityNote, type Pick as FacetPick } from '../model/search'
import {
  buildTree,
  statusFor,
  bySeverity,
  attainmentOf,
  STATUS_ORDER,
  cardKpi,
  obsAsKpi,
  lineFor,
  figureFor,
  absenceFor,
  deltaFor,
  yoyFor,
  yoyNoteFor,
  entityOf,
  themeOf,
  dashOf,
  frameworkOf,
  groupOf,
  subOf,
  STATUS_LABEL,
  STATUS_DOT,
  PERIOD_LABEL,
  type ObsKpi,
  type Period,
  type DashStatus,
  type Chip,
} from '../model/dash'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

/** Cards rendered per page. 60 paints in about a second; all 241 takes three
 *  and produces a 19,600px scroll, which is why this is paged rather than
 *  simply uncapped. */
const PAGE = 60

const hueFor = (theme: string | null) => themeByName(theme ?? '').fill

function RowMeta({ k, p }: { k: ObsKpi; p: Period }) {
  const s = statusFor(k, p)
  return (
    <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[s] }} />
        <span className="truncate">{STATUS_LABEL[s]}</span>
      </span>
      <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-mute">
        {dashOf(k)} · {themeOf(k)}
      </span>
    </span>
  )
}

const parseHash = () => {
  const q = location.hash.split('?')[1] ?? ''
  const p = new URLSearchParams(q)
  return { q: p.get('q') ?? '', cat: p.get('cat'), status: p.get('status') as DashStatus | null, dash: p.get('dash') }
}

export function Search({ onEvidence, onBack }: { onEvidence: (kpi: Kpi) => void; onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('q1')
  const [input, setInput] = useState('')
  /* manual picks only — the typed question is resolved fresh every render by
     `searchWith`, so a chip can never describe a filter that did not run */
  const [chips, setChips] = useState<Chip[]>([])
  const [typed, setTyped] = useState('')

  /* an arriving filter — a status card, a category label, the header search —
     lands as visible chips the reader can see and remove */
  useEffect(() => {
    const apply = () => {
      const h = parseHash()
      const next: Chip[] = []
      if (h.cat) next.push({ kind: 'cat', value: h.cat, label: h.cat })
      if (h.status) next.push({ kind: 'status', value: h.status, label: STATUS_LABEL[h.status] })
      if (h.dash) next.push({ kind: 'dash', value: h.dash, label: `${h.dash} dashboard` })
      setTyped(h.q)
      if (h.q) setInput(h.q)
      setChips(next)
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  const submit = (rawQ: string) => setTyped(rawQ)

  /* ONE engine for the question and the dropdowns. `applied` is what actually
     ran after any relaxation, so the chips below can never advertise a filter
     that was discarded. Rows come back risk-ordered. */
  const picks: FacetPick[] = useMemo(
    () => chips.map((c) => ({ facet: c.kind as FacetPick['facet'], value: c.value, label: c.label })),
    [chips],
  )
  const result = useMemo(() => searchWith(typed, picks, period), [typed, picks, period])
  const shown = result.rows

  /* how many are in the DOM. Reset on every new result set, so changing a
     filter never leaves the reader scrolled into a page that no longer
     describes what they asked for. */
  const [visible, setVisible] = useState(PAGE)
  useEffect(() => setVisible(PAGE), [typed, picks, period])

  const toggle = (kind: Chip['kind'], value: string, label = value) =>
    setChips((prev) => {
      const has = prev.some((c) => c.kind === kind && c.value === value)
      return has ? prev.filter((c) => !(c.kind === kind && c.value === value)) : [...prev, { kind, value, label }]
    })

  /* a count says "how many you would see if you picked this", so THIS facet's
     own picks are lifted before counting */
  const countWhere = (skipFacet: string, test: (k: ObsKpi) => boolean) =>
    searchWith(typed, picks.filter((x) => x.facet !== skipFacet), period).rows.filter(test).length

  const tree = useMemo(() => buildTree(obsKpis), [])
  const entities = useMemo(() => [...new Set(obsKpis.map(entityOf))].sort(), [])
  const themes = useMemo(() => [...new Set(obsKpis.map(themeOf))].sort(), [])
  const frameworks = useMemo(() => [...new Set(obsKpis.map(frameworkOf))].sort(), [])
  const picked = (kind: Chip['kind']) => chips.filter((c) => c.kind === kind).map((c) => c.value)
  const clearKind = (kind: Chip['kind']) => setChips((prev) => prev.filter((c) => c.kind !== kind))

  /**
   * The dropdowns, built from the same real columns the rail used. Counts are
   * computed with THIS facet's own filter lifted, so a count says "how many
   * you would see if you picked this" rather than shrinking to zero the moment
   * a sibling option is chosen.
   */
  const facets: {
    kind: Chip['kind']
    label: string
    items: FacetItem[]
    labelFor?: (v: string) => string
  }[] = useMemo(
    () => [
      {
        kind: 'dash',
        label: 'Dashboard',
        labelFor: (v) => `${v} dashboard`,
        items: ['Executive', 'Thematic'].map((d) => ({ value: d, label: d, n: countWhere('dash', (k) => dashOf(k) === d) })),
      },
      {
        kind: 'status',
        label: 'Status',
        labelFor: (v) => STATUS_LABEL[v as DashStatus],
        items: STATUS_ORDER.map((s) => ({
          value: s,
          label: STATUS_LABEL[s],
          dot: STATUS_DOT[s],
          n: countWhere('status', (k) => statusFor(k, period) === s),
        })),
      },
      {
        kind: 'entity',
        label: 'Entity',
        items: entities.map((e) => ({ value: e, label: e, n: countWhere('entity', (k) => entityOf(k) === e) })),
      },
      {
        kind: 'theme',
        label: 'Thematic area',
        items: themes.map((t) => ({ value: t, label: t, n: countWhere('theme', (k) => themeOf(k) === t) })),
      },
      {
        kind: 'cat',
        label: 'Category',
        /* the two-level tree, flattened into one list but never levelled —
           a child is indented, and picking a parent still includes it */
        items: tree.flatMap((nd) => [
          { value: nd.parent, label: nd.parent, n: countWhere('cat', (k) => groupOf(k) === nd.parent) },
          ...nd.subs.map((s) => ({
            value: s.name,
            label: s.name,
            indent: true,
            n: countWhere('cat', (k) => subOf(k) === s.name),
          })),
        ]),
      },
      {
        kind: 'framework',
        label: 'Framework',
        labelFor: (v) => `${v} framework`,
        items: frameworks.map((f) => ({ value: f, label: f, n: countWhere('framework', (k) => frameworkOf(k) === f) })),
      },
    ],
    [chips, typed, period, tree, entities, themes, frameworks],
  )

  /* BOTaina's line is generated by the engine from what actually ran, so it
     can never describe a filter the search discarded */
  const answer = result.line
  /* the sheet cannot tell "nothing achieved yet" from "not reported" — where a
     result set turns on that, say so rather than letting the count stand alone */
  const ambiguity = useMemo(() => zeroAmbiguityNote(shown, period), [shown, period])

  const relaxHint = useMemo(() => {
    if (shown.length > 0) return null
    if (result.applied.length > 1)
      return `Nothing matches all of ${result.applied.map((c) => c.label).join(' + ')} at once — try removing one.`
    if (result.appliedText) return `No indicator mentions “${result.appliedText}”.`
    return 'Nothing matches — try clearing a chip above.'
  }, [shown, result])

  const clearAll = () => {
    setChips([])
    setTyped('')
    setInput('')
    location.hash = 'search'
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <header className="pt-6">
        {/* logo, navigation, account — the nav takes the centre now that the
            header search, the lamp and the bell have gone */}
        <div className="flex items-center gap-6">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <div className="flex flex-1 justify-center">
            <TopNav active="exec" />
          </div>
          <HeaderCluster hidePeriod />
        </div>
        <div className="mt-8">
          <button onClick={onBack} className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-sidra">
            <ArrowLeft size={14} strokeWidth={1.8} /> Executive View
          </button>
          <h1 className="text-[30px] font-semibold leading-none tracking-tight text-ink">Search all indicators</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            Showing <span className="font-semibold text-ink">{shown.length}</span> of {obsKpis.length} · Executive and
            Thematic · {PERIOD_LABEL[period]}
          </p>
        </div>
      </header>

      {/* the query, interpreted into chips the reader can see and remove */}
      <form
        className="mt-6 flex items-center gap-2.5 rounded-input bg-card py-1.5 pe-2 ps-4 shadow-(--shadow-card)"
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
      >
        <SearchIcon size={16} strokeWidth={1.7} className="shrink-0 text-ink-mute" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — “which KPIs are at risk”, “what has no target”, “education indicators”"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[13.5px] outline-none placeholder:text-ink-mute"
        />
        <button type="submit" className="rounded-chip bg-cream px-3 py-1.5 text-[12.5px] font-medium text-sidra">
          Search
        </button>
      </form>

      {/* ONE line of filters, sticky beneath the header so they stay reachable
          while the results scroll. Collapsed, every facet is a single pill. */}
      <div
        className="sticky top-0 z-30 -mx-5 mt-4 px-5 py-3 md:-mx-8 md:px-8"
        /* the page ground, opaque — results scrolling under a translucent bar
           would read as a rendering fault, not a layer */
        style={{ background: 'var(--color-cream)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {facets.map((f) => (
            <FacetDropdown
              key={f.kind}
              label={f.label}
              items={f.items}
              selected={picked(f.kind)}
              onToggle={(v) => toggle(f.kind, v, f.labelFor ? f.labelFor(v) : v)}
              onClear={() => clearKind(f.kind)}
            />
          ))}
          <FacetDropdown
            label={`Year · ${period === 'q1' ? 'Q1 2026' : '2025'}`}
            single
            items={(['2025', 'q1'] as Period[]).map((p) => ({
              value: p,
              label: PERIOD_LABEL[p],
              n: searchWith(typed, picks, p).rows.length,
            }))}
            selected={[period]}
            onToggle={(v) => setPeriod(v as Period)}
            onClear={() => setPeriod('q1')}
          />
        </div>
        {/* the chips are `result.applied` — what RAN, never what was attempted.
            A manual pick removes itself; a chip the question produced clears
            the question, because that is what put it there. */}
        <FilterChips
          chips={result.applied.map((c) => ({
            key: c.manual ? `m:${c.entries[0].facet}:${c.entries[0].value}` : `q:${c.term}`,
            label: c.label,
          }))}
          onRemove={(key) => {
            const [scope, ...rest] = key.split(':')
            if (scope === 'm') {
              const [kind, ...v] = rest
              toggle(kind as Chip['kind'], v.join(':'))
            } else {
              setTyped('')
              setInput('')
            }
          }}
          onClearAll={clearAll}
          residue={result.appliedText || undefined}
          onClearResidue={() => {
            setTyped('')
            setInput('')
          }}
        />
      </div>

      {/* When the search had to give something up, it says so BEFORE the
          results — the reader must be able to see how the question was read,
          and correct it, rather than trusting a list that quietly answers a
          slightly different question. */}
      {result.note && (
        <p className="mt-3 flex items-start gap-2 rounded-input bg-cream/70 px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-soft">
          <Info size={14} strokeWidth={1.9} className="mt-[1px] shrink-0 text-ink-mute" />
          <span>{result.note}</span>
        </p>
      )}

      {/* BOTaina's one-line answer over the result set */}
      {answer && (
        <section className="ai-frame mt-3 shadow-(--shadow-card)" aria-label="AI answer">
          <div className="ai-glass flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip" style={{ background: 'var(--ai-wash-subtle)' }}>
              <Spark size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <p className="voice text-[13.5px] leading-snug text-ink">{answer}</p>
              {/* the one thing the sheet cannot answer, said rather than hidden */}
              {ambiguity && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-mute">{ambiguity}</p>}
            </span>
          </div>
        </section>
      )}

      {/* results take the full width the rail used to occupy */}
      <div className="mt-6">
        {/* the results — the same KpiCard as everywhere else */}
        <div className="min-w-0">
          {shown.length === 0 ? (
            <p className="text-[14px] text-ink-soft">{relaxHint}</p>
          ) : (
            <motion.div
              className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {shown.slice(0, visible).map((k) => (
                <KpiCard
                  key={k.row}
                  group={[cardKpi(k, period)]}
                  hue={hueFor(k.theme)}
                  onOpen={() => onEvidence(obsAsKpi(k.row))}
                  status={<RowMeta k={k} p={period} />}
                  line={lineFor(k, period)}
                  mark={<CardMarkL1 k={k} p={period} />}
                  figure={figureFor(k, period)}
                  delta={deltaFor(k, period)}
                  yoy={yoyFor(k, period)}
                  yoyNote={yoyNoteFor(k, period)}
                  absence={absenceFor(k, period)}
                  attainment={attainmentOf(k, period)}
                />
              ))}
            </motion.div>
          )}
          {/**
           * Nothing is hidden — it is PAGED, and the reader decides.
           *
           * The old line stopped at 60 and told the reader to narrow their
           * search, which put the burden on them for a limit the page chose.
           * But rendering all 241 costs about three seconds of jank on every
           * filter change and a 19,600px scroll, so paging is not arbitrary:
           * the first page paints in about a second, and everything beyond it
           * is one click away.
           *
           * "Show all" exists because a page that only loads on demand cannot
           * be searched with the browser's own find — anyone scanning or
           * printing the full list needs it in the DOM.
           */}
          {shown.length > visible && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setVisible((v) => v + PAGE)}
                className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-[1px]"
                style={{ background: 'linear-gradient(180deg, #107660 0%, #095c4a 100%)' }}
              >
                Show {Math.min(PAGE, shown.length - visible)} more
              </button>
              <button
                onClick={() => setVisible(shown.length)}
                className="text-[12.5px] font-medium text-sidra underline underline-offset-2"
              >
                Show all {shown.length}
              </button>
              <span className="text-[12px] text-ink-mute">
                showing {visible} of {shown.length}
              </span>
            </div>
          )}
          {shown.length > PAGE && shown.length === visible && (
            <p className="mt-6 text-[12px] text-ink-mute">All {shown.length} shown.</p>
          )}
        </div>
      </div>
    </div>
  )
}
