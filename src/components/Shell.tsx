/**
 * Global shell.
 * Navigation lives in the TOP header band — one row: logo, nav, search entry,
 * account. The bottom of the viewport belongs to the sticky AI search (AskBar),
 * the CEO's route to anything not on the dashboard. Top bar also carries a
 * notifications bell fed by the real findings engine (never fabricated
 * activity), and the profile.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Layers, Crown, Handshake, Bell, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { findings, kpis, fmt, THEMES } from '../model/data'
import { execRows, obsAsKpi } from '../model/dash'

/**
 * The header search reaches all 240 rows: the 151 thematic KPIs plus the 89
 * Executive rows adapted from the OBS workbook. Built once, lazily.
 */
let CORPUS: Kpi[] | null = null
const searchCorpus = (): Kpi[] => {
  if (!CORPUS) CORPUS = [...kpis, ...execRows.map((r) => obsAsKpi(r.row))]
  return CORPUS
}
import type { Kpi } from '../model/types'

export type RouteId = 'themes' | 'exec' | 'bdo'

// TODO: Home content model — removed from the nav entirely for now; restore an
// item here once its scope is decided.
const ITEMS: { id: RouteId; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'themes', label: 'Thematic View', Icon: Layers },
  { id: 'exec', label: 'Executive View', Icon: Crown },
  { id: 'bdo', label: 'BDO', Icon: Handshake },
]

/**
 * Primary navigation, in the top header band — the floating bottom pill sat
 * over card content and competed with the page, and its slot at the bottom of
 * the viewport now belongs to the AskBar. One treatment on light pages, a
 * `light` variant for the L2 theme bands. Navigation goes through the hash so
 * any header can carry it without prop-threading the router.
 */
export function TopNav({ active, light }: { active: RouteId | null; light?: boolean }) {
  return (
    <nav
      className={`flex items-center gap-0.5 rounded-full p-1 ${light ? '' : 'bg-card shadow-(--shadow-card)'}`}
      style={light ? { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)' } : undefined}
      aria-label="Primary navigation"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const on = active === id
        return (
          <button
            key={id}
            onClick={() => {
              location.hash = id
            }}
            className="group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-200"
            style={{
              color: on ? (light ? 'var(--color-sidra)' : '#fff') : light ? 'rgba(255,255,255,0.85)' : 'var(--color-ink-soft)',
            }}
            aria-current={on ? 'page' : undefined}
          >
            {on && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-full"
                style={
                  light
                    ? { background: '#ffffff', boxShadow: '0 2px 8px rgba(2,44,36,0.35)' }
                    : { background: 'linear-gradient(180deg, #107660 0%, #095c4a 100%)', boxShadow: '0 2px 8px rgba(2,44,36,0.3)' }
                }
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon size={16} strokeWidth={on ? 2.1 : 1.7} />
              <span className={`whitespace-nowrap max-lg:hidden ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/**
 * The sticky AI search — pinned to the bottom of the viewport on every screen,
 * the position the navigation vacated. This is the CEO's route to anything not
 * on the dashboard, so it is the most reachable control on the page: full
 * width within the gutters, the AI gradient ring, ⌘K from anywhere. Every
 * screen carries pb-36, so it never covers the last row of content.
 */
export function AskBar({ shift = 0 }: { shift?: number }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const term = q.trim()
    if (!term) return
    /* re-assign even when already on #search so a second question re-applies */
    const next = `search?q=${encodeURIComponent(term)}`
    if (location.hash === `#${next}`) window.dispatchEvent(new HashChangeEvent('hashchange'))
    else location.hash = next
    setQ('')
    inputRef.current?.blur()
  }

  return (
    <motion.div
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-40px)] max-w-[1116px]"
      animate={{ x: `calc(-50% + ${shift}px)` }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    >
      <form
        className="ai-field flex items-center gap-2.5 py-1.5 pe-2 ps-4"
        style={{ boxShadow: '0 14px 36px -12px rgba(3,70,56,0.35), var(--shadow-card)' }}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        role="search"
        aria-label="Ask across all indicators"
      >
        <Spark size={14} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
          }}
          placeholder="Ask across all 240 indicators"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[13.5px] outline-none placeholder:text-ink-mute"
          aria-label="Ask across all 240 indicators"
        />
        <kbd className="rounded bg-cream px-1.5 py-0.5 text-[10px] text-ink-mute max-md:hidden">⌘K</kbd>
        <button
          type="submit"
          className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-[1px]"
          style={{ background: 'linear-gradient(180deg, #107660 0%, #095c4a 100%)' }}
        >
          Ask
        </button>
      </form>
    </motion.div>
  )
}

function NotificationsBell({ light }: { light?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const THEME_BY_NAME = Object.fromEntries(THEMES.map((t) => [t.name, t.id]))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-[1px] ${
          light ? 'text-white/85 hover:bg-white/15 hover:text-white' : 'bg-card text-ink-soft shadow-(--shadow-card) hover:text-sidra hover:shadow-(--shadow-card-hover)'
        }`}
        style={light ? { border: '1px solid rgba(255,255,255,0.28)' } : undefined}
        aria-label={`${findings.length} findings need you`}
      >
        <Bell size={18} strokeWidth={1.7} />
        {findings.length > 0 && (
          <span
            className="num absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={
              light
                ? { background: '#fff', color: 'var(--color-sidra)' }
                : { background: 'var(--color-sidra)', color: '#fff', boxShadow: '0 0 0 2px var(--color-cream)' }
            }
          >
            {findings.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-panel bg-card shadow-(--shadow-card-hover)"
          >
            <div className="label border-b border-cream px-4 py-2.5 text-ink-mute">
              Needs you · computed from cells, never manufactured
            </div>
            {findings.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  const tid = THEME_BY_NAME[f.kpi.theme]
                  if (tid) location.hash = `t/${tid}`
                  setOpen(false)
                }}
                className="block w-full border-b border-cream px-4 py-3 text-left transition-colors last:border-0 hover:bg-cream/60"
              >
                <div className="text-[13px] font-medium leading-snug text-ink">{f.headline}</div>
                <div className="voice mt-1 text-[12px] italic leading-snug text-ink-soft">{f.ask}</div>
              </button>
            ))}
            {findings.length === 0 && (
              <div className="px-4 py-5 text-[13px] italic text-ink-mute">Nothing needs you today.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Global KPI search — fills the header centre with something useful: any of the
 * 151 indicators, found from anywhere, straight into its evidence drawer.
 */
export function GlobalSearch({ onPick, light }: { onPick: (k: Kpi) => void; light?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
    }
  }, [])

  const results = q.trim()
    ? searchCorpus()
        .map((k) => {
          const hay = [k.name, k.entity, k.category, k.definition ?? '']
          const idx = hay.findIndex((h) => h.toLowerCase().includes(q.toLowerCase()))
          return idx >= 0 ? { k, field: idx } : null
        })
        .filter(Boolean)
        .sort((a, b) => a!.field - b!.field)
        .slice(0, 7)
    : []

  const hi = (text: string) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase())
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark className="rounded bg-[rgba(80,226,195,0.35)] px-0.5">{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    )
  }

  return (
    <div ref={ref} className="relative w-full max-w-[400px] max-md:hidden">
      <div
        className={`flex h-10 items-center gap-2 rounded-full px-3.5 transition-shadow duration-200 ${
          light ? '' : 'bg-card shadow-(--shadow-card) focus-within:shadow-(--shadow-card-hover)'
        }`}
        style={light ? { background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)' } : undefined}
      >
        <Search size={15} strokeWidth={1.7} className={`shrink-0 ${light ? 'text-white/70' : 'text-ink-mute'}`} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            /* Enter hands the whole question to the search listing — the
               dropdown is a quick pick, the page is for a real query */
            if (e.key === 'Enter') {
              location.hash = `search?q=${encodeURIComponent(q.trim())}`
              setOpen(false)
              setQ('')
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Find an indicator"
          className={`w-full bg-transparent text-[13px] outline-none ${light ? 'text-white placeholder:text-white/60' : 'placeholder:text-ink-mute'}`}
          aria-label="Search all indicators"
        />
      </div>
      <AnimatePresence>
        {open && q.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-input bg-card shadow-(--shadow-card-hover)"
          >
            {results.length ? (
              <>
              {results.map((r) => (
                <button
                  key={r!.k.id}
                  onClick={() => {
                    onPick(r!.k)
                    setOpen(false)
                    setQ('')
                  }}
                  className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-cream"
                >
                  <span className="min-w-0 text-[13px] text-ink">
                    {hi(r!.k.name)}
                    <span className="ml-2 text-[11px] text-ink-mute">
                      {r!.k.entity} · {r!.k.theme}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[12.5px] text-sidra">
                    {r!.k.actuals['2026Q1'].value !== null ? fmt(r!.k.actuals['2026Q1'].value) : r!.k.actuals['2026Q1'].raw ?? '—'}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  location.hash = `search?q=${encodeURIComponent(q.trim())}`
                  setOpen(false)
                  setQ('')
                }}
                className="w-full border-t border-cream px-3.5 py-2.5 text-left text-[12px] font-semibold text-sidra transition-colors hover:bg-cream"
              >
                Search all 240 indicators →
              </button>
              </>
            ) : (
              <div className="px-3.5 py-3 text-[12.5px] text-ink-mute">No indicator matches "{q}".</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The lamp — Al Mishkat's identity device, and the Quarterly Brief's only
 * door. Lit until this quarter's brief has been opened; quiet after; always
 * one tap away. Tapping returns the reader exactly where they were.
 */
export function Lamp({ light }: { light?: boolean }) {
  const [lit, setLit] = useState(true)
  useEffect(() => {
    import('../briefing/quarterly').then((m) => setLit(m.isBriefUnread()))
    const refresh = () => import('../briefing/quarterly').then((m) => setLit(m.isBriefUnread()))
    window.addEventListener('brief-read', refresh)
    return () => window.removeEventListener('brief-read', refresh)
  }, [])
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('open-brief'))}
      className="flex h-10 items-center gap-2 rounded-full px-3 transition-all duration-200 hover:-translate-y-[1px]"
      style={
        light
          ? { border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.14)' }
          : { background: 'var(--color-card)', boxShadow: 'var(--shadow-card)' }
      }
      aria-label={lit ? 'The Quarterly Brief is ready — open it' : 'Open the Quarterly Brief'}
      title={lit ? 'The Quarterly Brief · Q1 2026' : 'The Quarterly Brief · read'}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden className={lit ? 'lamp-lit' : ''}>
        <path d="M4 21 V10 a8 8 0 0 1 16 0 V21" fill="none" stroke={light ? '#ffffff' : '#034638'} strokeWidth="1.8" />
        <path d="M12 14.6 c-1.8-1.5-1.4-3.6 0-5 c1.4 1.4 1.8 3.5 0 5 Z" fill={lit ? '#e5a823' : light ? 'rgba(255,255,255,0.4)' : '#c8c9c7'} />
        <line x1="8.5" y1="18" x2="15.5" y2="18" stroke={light ? '#ffffff' : '#034638'} strokeWidth="1.8" />
      </svg>
      <span className={`whitespace-nowrap text-[11.5px] max-xl:hidden ${light ? 'text-white/80' : 'text-ink-mute'}`}>
        {lit ? 'Quarterly Brief · Q1 2026' : "You're up to date"}
      </span>
    </button>
  )
}

/** Period chip + notifications + profile — shared by AppHeader, the Thematic
 * View header zone, and (as a light-on-dark variant) the L2 theme band. */
export function HeaderCluster({ hidePeriod, light }: { hidePeriod?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Lamp light={light} />
      {!hidePeriod && (
        <span
          className={`flex h-10 items-center gap-2 rounded-full px-3.5 text-[12.5px] ${light ? 'text-white/85' : 'bg-card text-ink-soft shadow-(--shadow-card)'}`}
          style={light ? { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)' } : undefined}
        >
          <CalendarDays size={15} strokeWidth={1.7} className={light ? 'text-white/85' : 'text-sidra'} />
          <span className={`font-semibold ${light ? 'text-white' : 'text-ink'}`}>Q1 2026</span>
          <span className={`max-sm:hidden ${light ? 'text-white/60' : 'text-ink-mute'}`}>· updated 8 Aug</span>
        </span>
      )}
      <NotificationsBell light={light} />
      <button
        className={`flex h-10 items-center gap-2.5 rounded-full py-1 pe-3 ps-1 transition-all duration-200 hover:-translate-y-[1px] ${
          light ? 'hover:bg-white/15' : 'bg-card shadow-(--shadow-card) hover:shadow-(--shadow-card-hover)'
        }`}
        style={light ? { border: '1px solid rgba(255,255,255,0.28)' } : undefined}
        aria-label="Executive Office account"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: light ? 'rgba(255,255,255,0.22)' : 'linear-gradient(135deg, #045a48, #023328)' }}
        >
          EO
        </span>
        <span className={`whitespace-nowrap text-[12.5px] font-medium max-xl:hidden ${light ? 'text-white' : 'text-ink'}`}>Executive Office</span>
        <ChevronDown size={14} strokeWidth={1.7} className={`max-md:hidden ${light ? 'text-white/60' : 'text-ink-mute'}`} />
      </button>
    </div>
  )
}

/** The supplied wordmark, rendered white for dark bands (CSS filter — the asset itself is untouched). */
export function LogoWhite({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <img src="/al-mishkat.png" alt="Al-Mishkat" className={className} style={{ filter: 'brightness(0) invert(1)' }} />
  )
}

export function AppHeader({ active = 'themes' }: { active?: RouteId }) {
  return (
    <header className="flex items-center justify-between gap-6 py-5">
      <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto" />
      <TopNav active={active} />
      <HeaderCluster />
    </header>
  )
}

/** The gradient spark — replaces the bullet on every inline AI line (R12: green). */
export function Spark({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden style={{ display: 'inline-block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="ai-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--ai-green-mid)" />
          <stop offset="100%" stopColor="var(--ai-green-bright)" />
        </linearGradient>
      </defs>
      <path d="M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z" fill="url(#ai-spark)" />
    </svg>
  )
}
