/**
 * The global search listing — the CEO's route to anything not on the
 * dashboard, reaching ALL 240 rows, Executive and Thematic both.
 *
 * IA (rejections in docs/exec-dashboard-notes.md): one query box interpreted
 * into REMOVABLE CHIPS, one AI answer line in BOTaina's voice, a facet rail
 * beside the results with live counts — dashboard, status, category as a
 * two-level tree (a parent includes all its children), entity, thematic
 * area — composing with the query and each other. Results are the platform's
 * own KpiCard. An empty result names which filter to relax.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronRight, Search as SearchIcon, X } from 'lucide-react'
import { GlobalSearch, HeaderCluster, Spark, TopNav } from '../components/Shell'
import { KpiCard } from '../components/KpiCard'
import { CardMark } from '../components/charts/Marks2'
import { themeByName } from '../model/data'
import {
  obsKpis,
} from '../model/obs'
import {
  buildTree,
  matches,
  interpret,
  chipsToFilters,
  statusFor,
  cardKpi,
  obsAsKpi,
  lineFor,
  figureFor,
  deltaFor,
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
  type SearchFilters,
} from '../model/dash'
import type { Kpi } from '../model/types'

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

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

function FacetOpt({ on, onClick, label, n, indent }: { on: boolean; onClick: () => void; label: string; n: number; indent?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={n === 0 && !on}
      className={`flex w-full items-center justify-between gap-3 rounded-chip px-2 py-1 text-left text-[12.5px] transition-colors hover:bg-cream disabled:opacity-40 ${indent ? 'ps-6' : ''}`}
      style={{ color: on ? 'var(--color-sidra)' : 'var(--color-ink-soft)', fontWeight: on ? 600 : 400 }}
    >
      <span className="min-w-0 truncate">
        {on ? '✓ ' : ''}
        {label}
      </span>
      <span className="num shrink-0 text-[11.5px] text-ink-mute">{n}</span>
    </button>
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
  const [chips, setChips] = useState<Chip[]>([])
  const [residue, setResidue] = useState('')
  const [openParents, setOpenParents] = useState<Set<string>>(new Set())

  /* an arriving filter — a status card, a category label, the header search —
     lands as visible chips the reader can see and remove */
  useEffect(() => {
    const apply = () => {
      const h = parseHash()
      const next: Chip[] = []
      if (h.cat) next.push({ kind: 'cat', value: h.cat, label: h.cat })
      if (h.status) next.push({ kind: 'status', value: h.status, label: STATUS_LABEL[h.status] })
      if (h.dash) next.push({ kind: 'dash', value: h.dash, label: `${h.dash} dashboard` })
      if (h.q) {
        const it = interpret(h.q)
        next.push(...it.chips)
        setResidue(it.residue)
        setInput(h.q)
      } else {
        setResidue('')
      }
      setChips(next)
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  const submit = (rawQ: string) => {
    const it = interpret(rawQ)
    setChips((prev) => [...prev.filter((c) => !c.fromText), ...it.chips.map((c) => ({ ...c, fromText: true }))])
    setResidue(it.residue)
  }

  const filters: SearchFilters = useMemo(() => chipsToFilters(chips, residue), [chips, residue])
  const shown = useMemo(() => obsKpis.filter((k) => matches(k, filters, period)), [filters, period])

  const toggle = (kind: Chip['kind'], value: string, label = value) =>
    setChips((prev) => {
      const has = prev.some((c) => c.kind === kind && c.value === value)
      return has ? prev.filter((c) => !(c.kind === kind && c.value === value)) : [...prev, { kind, value, label }]
    })

  const countWhere = (skip: keyof SearchFilters, test: (k: ObsKpi) => boolean) =>
    obsKpis.filter((k) => matches(k, filters, period, skip) && test(k)).length

  const tree = useMemo(() => buildTree(obsKpis), [])
  const entities = useMemo(() => [...new Set(obsKpis.map(entityOf))].sort(), [])
  const themes = useMemo(() => [...new Set(obsKpis.map(themeOf))].sort(), [])
  const frameworks = useMemo(() => [...new Set(obsKpis.map(frameworkOf))].sort(), [])
  const on = (kind: Chip['kind'], value: string) => chips.some((c) => c.kind === kind && c.value === value)

  const answer = useMemo(() => {
    if (shown.length === 0) return null
    const risk = shown.filter((k) => statusFor(k, period) === 'atRisk').length
    const mon = shown.filter((k) => statusFor(k, period) === 'monitoring').length
    const nr = shown.filter((k) => statusFor(k, period) === 'notReported').length
    const parts = [risk > 0 ? `${risk} at risk` : null, mon > 0 ? `${mon} without a target` : null, nr > 0 ? `${nr} not reported` : null].filter(Boolean)
    return `I found ${shown.length} indicator${shown.length === 1 ? '' : 's'}${
      chips.length ? ` for ${chips.map((c) => c.label).join(', ')}` : ''
    }${residue ? ` matching “${residue}”` : ''} — ${parts.length ? parts.join(', ') : 'none needing intervention'} for ${PERIOD_LABEL[period]}.`
  }, [shown, chips, residue, period])

  const relaxHint = useMemo(() => {
    if (shown.length > 0) return null
    for (const key of ['status', 'cats', 'entities', 'themes', 'frameworks', 'stopped', 'dash', 'q'] as (keyof SearchFilters)[]) {
      const val = filters[key]
      const has = Array.isArray(val) ? val.length > 0 : Boolean(val)
      if (has && obsKpis.some((k) => matches(k, filters, period, key))) {
        const label =
          key === 'q'
            ? `the search term “${filters.q}”`
            : key === 'cats'
              ? 'the category filter'
              : key === 'dash'
                ? 'the dashboard filter'
                : key === 'frameworks'
                  ? 'the framework filter'
                  : key === 'stopped'
                    ? 'the stopped-reporting filter'
                    : `the ${key === 'entities' ? 'entity' : key === 'themes' ? 'thematic area' : 'status'} filter`
        return `Nothing matches everything at once — removing ${label} would show results.`
      }
    }
    return 'Nothing matches — try clearing a chip above.'
  }, [shown, filters, period])

  const clearAll = () => {
    setChips([])
    setResidue('')
    setInput('')
    location.hash = 'search'
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[1180px] px-5 pb-36 md:px-8">
      <header className="pt-6">
        <div className="flex items-center justify-between gap-6">
          <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" style={{ margin: '11px 0' }} />
          <TopNav active="exec" />
          <GlobalSearch onPick={onEvidence} />
          <HeaderCluster hidePeriod />
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <button onClick={onBack} className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-sidra">
              <ArrowLeft size={14} strokeWidth={1.8} /> Executive View
            </button>
            <h1 className="text-[30px] font-semibold leading-none tracking-tight text-ink">Search all indicators</h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Showing <span className="font-semibold text-ink">{shown.length}</span> of {obsKpis.length} · Executive and
              Thematic · {PERIOD_LABEL[period]}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-input bg-cream/80 p-1" role="radiogroup" aria-label="Reporting period">
            {(['2025', 'q1'] as Period[]).map((p) => {
              const onP = period === p
              return (
                <button
                  key={p}
                  role="radio"
                  aria-checked={onP}
                  onClick={() => setPeriod(p)}
                  className="rounded-chip px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200"
                  style={onP ? { background: '#fff', color: 'var(--color-sidra)', boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-ink-soft)' }}
                >
                  {PERIOD_LABEL[p]}
                </button>
              )
            })}
          </div>
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

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="label text-[10px] text-ink-mute">{chips.length || residue ? 'Understood as' : 'No filter — showing everything'}</span>
        {chips.map((c) => (
          <button
            key={`${c.kind}:${c.value}`}
            onClick={() => toggle(c.kind, c.value)}
            className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-[12px] font-medium text-sidra"
          >
            {c.label} <X size={12} strokeWidth={2.2} />
          </button>
        ))}
        {residue && (
          <button onClick={() => setResidue('')} className="flex items-center gap-1.5 rounded-full bg-cream/60 px-3 py-1 text-[12px] font-medium text-ink-soft">
            “{residue}” <X size={12} strokeWidth={2.2} />
          </button>
        )}
        {(chips.length > 0 || residue) && (
          <button onClick={clearAll} className="text-[12px] text-ink-mute underline">
            Clear all
          </button>
        )}
      </div>

      {/* BOTaina's one-line answer over the result set */}
      {answer && (
        <section className="ai-frame mt-4 shadow-(--shadow-card)" aria-label="AI answer">
          <div className="ai-glass flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip" style={{ background: 'var(--ai-wash-subtle)' }}>
              <Spark size={13} />
            </span>
            <p className="voice text-[13.5px] leading-snug text-ink">{answer}</p>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* the facet rail — live counts, composing with the query */}
        <aside className="w-full shrink-0 lg:w-[250px]">
          <div className="flex flex-col gap-5 rounded-card bg-card p-4 shadow-(--shadow-card)">
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Dashboard</h3>
              {['Executive', 'Thematic'].map((d) => (
                <FacetOpt key={d} label={d} n={countWhere('dash', (k) => dashOf(k) === d)} on={on('dash', d)} onClick={() => toggle('dash', d, `${d} dashboard`)} />
              ))}
            </div>
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Status · {PERIOD_LABEL[period]}</h3>
              {(Object.keys(STATUS_LABEL) as DashStatus[]).map((s) => (
                <FacetOpt
                  key={s}
                  label={STATUS_LABEL[s]}
                  n={countWhere('status', (k) => statusFor(k, period) === s)}
                  on={on('status', s)}
                  onClick={() => toggle('status', s, STATUS_LABEL[s])}
                />
              ))}
            </div>
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Category</h3>
              {tree.map((nd) => (
                <div key={nd.parent}>
                  <div className="flex items-center">
                    {nd.subs.length > 0 && (
                      <button
                        onClick={() =>
                          setOpenParents((prev) => {
                            const next = new Set(prev)
                            if (next.has(nd.parent)) next.delete(nd.parent)
                            else next.add(nd.parent)
                            return next
                          })
                        }
                        aria-label={`${openParents.has(nd.parent) ? 'Collapse' : 'Expand'} ${nd.parent}`}
                        className="shrink-0 p-0.5 text-ink-mute"
                      >
                        {openParents.has(nd.parent) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <FacetOpt
                        label={nd.parent}
                        n={countWhere('cats', (k) => groupOf(k) === nd.parent)}
                        on={on('cat', nd.parent)}
                        onClick={() => toggle('cat', nd.parent)}
                      />
                    </div>
                  </div>
                  {openParents.has(nd.parent) &&
                    nd.subs.map((s) => (
                      <FacetOpt
                        key={s.name}
                        indent
                        label={s.name}
                        n={countWhere('cats', (k) => subOf(k) === s.name)}
                        on={on('cat', s.name)}
                        onClick={() => toggle('cat', s.name)}
                      />
                    ))}
                </div>
              ))}
            </div>
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Entity</h3>
              {entities.map((e) => (
                <FacetOpt key={e} label={e} n={countWhere('entities', (k) => entityOf(k) === e)} on={on('entity', e)} onClick={() => toggle('entity', e)} />
              ))}
            </div>
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Thematic area</h3>
              {themes.map((t) => (
                <FacetOpt key={t} label={t} n={countWhere('themes', (k) => themeOf(k) === t)} on={on('theme', t)} onClick={() => toggle('theme', t)} />
              ))}
              {/* 4 rows carry the value `All` — kept visible as data, flagged
                  as a question for QF rather than silently absorbed */}
              <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">
                `All` is the sheet's own value on 4 rows — flagged to QF as either a real cross-cutting scope or a data
                fault.
              </p>
            </div>
            <div>
              <h3 className="label mb-1.5 text-[10px] text-ink-mute">Performance framework</h3>
              {frameworks.map((f) => (
                <FacetOpt
                  key={f}
                  label={f}
                  n={countWhere('frameworks', (k) => frameworkOf(k) === f)}
                  on={on('framework', f)}
                  onClick={() => toggle('framework', f, `${f} framework`)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* the results — the same KpiCard as everywhere else */}
        <div className="min-w-0 flex-1">
          {shown.length === 0 ? (
            <p className="text-[14px] text-ink-soft">{relaxHint}</p>
          ) : (
            <motion.div
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {shown.slice(0, 60).map((k) => (
                <KpiCard
                  key={k.row}
                  group={[cardKpi(k, period)]}
                  hue={hueFor(k.theme)}
                  onOpen={() => onEvidence(obsAsKpi(k.row))}
                  status={<RowMeta k={k} p={period} />}
                  line={lineFor(k, period)}
                  mark={<CardMark k={k} p={period} />}
                  figure={figureFor(k, period)}
                  delta={deltaFor(k, period)}
                />
              ))}
            </motion.div>
          )}
          {shown.length > 60 && (
            <p className="mt-4 text-[12px] text-ink-mute">
              Showing the first 60 of {shown.length} — narrow with a facet or a search term.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
