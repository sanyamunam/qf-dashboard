/**
 * Global shell.
 *
 * The header band is three things and no more: logo, navigation, account. The
 * indicator search, the Quarterly Brief lamp and the notifications bell were
 * all removed from it — four controls competing for one row when the sticky
 * AskBar already reaches all 240 rows from the bottom of every screen. With
 * them gone the navigation takes the centre, which is where the header's only
 * repeated action belongs.
 *
 * NOTE: the lamp was the Quarterly Brief's only door. App.tsx still listens
 * for `open-brief`, so restoring an entry point anywhere is one dispatch.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Layers, Crown, Handshake, CalendarDays, ChevronDown } from 'lucide-react'

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
      /* a single field, centred — not a full-bleed bar. Stretched to the page
         gutters it read as a docked panel lying across the last row of cards
         rather than as one control */
      className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-40px)] max-w-[620px]"
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

/**
 * Period chip + profile — shared by AppHeader, the Thematic View header zone,
 * and (as a light-on-dark variant) the L2 theme band.
 *
 * The lamp and the notifications bell were removed from the header along with
 * the indicator search: three separate entry points crowding one row, when the
 * sticky AskBar already reaches all 240 rows from the bottom of every screen.
 */
export function HeaderCluster({ hidePeriod, light }: { hidePeriod?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
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
    <header className="flex items-center gap-6 py-5">
      <img src="/al-mishkat.png" alt="Al-Mishkat" className="h-11 w-auto shrink-0" />
      <div className="flex flex-1 justify-center">
        <TopNav active={active} />
      </div>
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
