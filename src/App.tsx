import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { Loader } from './components/Loader'
import { Bdo } from './screens/Misc'
import { Thematic } from './screens/Thematic'
import { Executive } from './screens/Executive'
import { Search } from './screens/Search'
import { L2 } from './screens/L2'
import { KpiDrawer } from './components/KpiDrawer'
import { AskBar, type RouteId } from './components/Shell'
import { BotainaDock } from './components/BotainaDock'
import { QuarterlyBrief } from './briefing/QuarterlyBrief'
import type { Kpi } from './model/types'
import { THEMES } from './model/data'
import { facts } from './model/facts'

// Home is parked (TODO: Home content model) — no route resolves to it.
type Route = { screen: 'themes' | 'exec' | 'bdo' | 'search' } | { screen: 'l2'; themeId: string }

const THEME_BY_NAME = Object.fromEntries(THEMES.map((t) => [t.name, t.id]))

function parseHash(): Route {
  const h = location.hash.replace('#', '').split('?')[0]
  if (h.startsWith('t/')) {
    const id = h.slice(2)
    if (THEMES.some((t) => t.id === id)) return { screen: 'l2', themeId: id }
  }
  if (h === 'exec' || h === 'bdo') return { screen: h }
  if (h.startsWith('search')) return { screen: 'search' }
  return { screen: 'themes' } // '', 'home', and anything unknown resolve here
}

const routeKey = (r: Route) => (r.screen === 'l2' ? `l2:${r.themeId}` : r.screen)

export default function App() {
  const [loaded, setLoaded] = useState(() => sessionStorage.getItem('almishkat.loaded') === '1')
  const [route, setRoute] = useState<Route>(parseHash)
  const [drawerKpi, setDrawerKpi] = useState<Kpi | null>(null)
  /**
   * The scope the reader actually clicked. A grouped card hands over its whole
   * group; a spotlight card hands over the single indicator it showed. The
   * overlay summarises exactly that, so its verdict can never differ from the
   * caption the reader just read (R11 fix 4). Null = derive the full group,
   * which is right for a list row or a BOTaina handoff.
   */
  const [drawerGroup, setDrawerGroup] = useState<Kpi[] | null>(null)
  const openKpi = (k: Kpi, group?: Kpi[]) => {
    setDrawerKpi(k)
    setDrawerGroup(group ?? null)
  }
  const [pointFocus, setPointFocus] = useState<string | null>(null)
  // BOTaina's docked panel: state lives here so it survives navigation
  const [botainaOpen, setBotainaOpen] = useState(false)
  const [panelW, setPanelW] = useState(400)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const scrollMemory = useRef(new Map<string, number>())
  const prevKey = useRef(routeKey(parseHash()))

  useEffect(() => {
    const target =
      route.screen === 'l2'
        ? `t/${route.themeId}`
        : route.screen === 'themes'
          ? 'themes'
          : route.screen === 'search'
            ? location.hash.replace('#', '') || 'search'
            : route.screen
    const current = location.hash.replace('#', '').split('?')[0]
    if (current !== target) location.hash = target
    // restore the scroll position this route was left at (back nav), else start at top
    const key = routeKey(route)
    const y = scrollMemory.current.get(key) ?? 0
    const t = setTimeout(() => window.scrollTo(0, y), 60)
    prevKey.current = key
    return () => clearTimeout(t)
  }, [route])

  useEffect(() => {
    const onHash = () => {
      const next = parseHash()
      // ignore the echo our own navigation produces; only real (browser/manual)
      // navigation should save scroll and switch routes here
      if (routeKey(next) === prevKey.current) return
      scrollMemory.current.set(prevKey.current, window.scrollY)
      setRoute(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    scrollMemory.current.set(prevKey.current, window.scrollY)
    setRoute(r)
  }

  // the Quarterly Brief opens from the lamp — nowhere else. Closing it
  // returns the reader exactly where they were.
  const [briefOpen, setBriefOpen] = useState(false)
  const briefReturn = useRef<{ y: number } | null>(null)
  useEffect(() => {
    const openBrief = () => {
      briefReturn.current = { y: window.scrollY }
      setBriefOpen(true)
    }
    window.addEventListener('open-brief', openBrief)
    return () => window.removeEventListener('open-brief', openBrief)
  }, [])
  const closeBrief = () => {
    setBriefOpen(false)
    window.dispatchEvent(new Event('brief-read'))
    const y = briefReturn.current?.y ?? 0
    setTimeout(() => window.scrollTo(0, y), 80)
  }

  const finishLoad = () => {
    sessionStorage.setItem('almishkat.loaded', '1')
    setLoaded(true)
  }

  const openEvidence = (kpi: Kpi) => {
    /* From the Executive Dashboard or the search listing the overlay opens IN
       PLACE — navigating to the KPI's theme would throw away the reader's
       filters. Elsewhere (header search on a thematic page) the L2 context
       is the right landing. */
    const themeId = THEME_BY_NAME[kpi.theme]
    const stay = route.screen === 'exec' || route.screen === 'search'
    if (themeId && !stay) go({ screen: 'l2', themeId })
    setDrawerKpi(kpi)
  }

  // BOTaina's handoff: navigate to Social Progress and arrive pointing at WISH
  const navigateAndPoint = () => {
    setPointFocus(facts.wish.kpi.id)
    go({ screen: 'l2', themeId: 'social' })
  }

  const active: RouteId | null =
    route.screen === 'l2' ? 'themes' : route.screen === 'search' ? 'exec' : route.screen

  return (
    <LayoutGroup>
      <AnimatePresence>{!loaded && <Loader onDone={finishLoad} />}</AnimatePresence>
      {loaded && (
        <>
          {/* the workspace makes room for her: one motion, panel + reflow together */}
          <div
            className="@container"
            style={{
              paddingRight: botainaOpen && wide ? panelW : 0,
              transition: 'padding-right 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {route.screen === 'themes' && <Thematic onEvidence={openEvidence} />}
            {route.screen === 'exec' && <Executive onEvidence={openEvidence} />}
            {route.screen === 'bdo' && <Bdo />}
            {route.screen === 'search' && <Search onEvidence={openEvidence} onBack={() => go({ screen: 'exec' })} />}
            {route.screen === 'l2' && (
              <L2
                themeId={route.themeId}
                onOpenKpi={openKpi}
                pointFocus={pointFocus}
                onBack={() => go({ screen: 'themes' })}
              />
            )}
          </div>
          <AnimatePresence>
            {briefOpen && (
              <QuarterlyBrief
                onExit={closeBrief}
                onOpenKpi={(k) => {
                  closeBrief()
                  openEvidence(k)
                }}
                onAskBotaina={(q) => {
                  closeBrief()
                  setTimeout(() => window.dispatchEvent(new CustomEvent('botaina-ask', { detail: q })), 450)
                }}
              />
            )}
          </AnimatePresence>
          <AskBar shift={botainaOpen && wide ? -panelW / 2 : 0} />
          <BotainaDock
            onNavigatePoint={navigateAndPoint}
            open={botainaOpen}
            setOpen={setBotainaOpen}
            width={panelW}
            setWidth={setPanelW}
          />
        </>
      )}
      <KpiDrawer kpi={drawerKpi} group={drawerGroup} onClose={() => setDrawerKpi(null)} />
    </LayoutGroup>
  )
}
