/**
 * "Since you last looked" — persists a per-user snapshot of KPI states and only
 * renders when there is genuine delta. No fabricated activity: on a first visit,
 * or when nothing changed, it renders nothing at all.
 */
import { useMemo } from 'react'
import { kpis } from '../model/data'
import { STATE_LABEL, type KpiState } from '../model/types'

const KEY = 'almishkat.lastLooked.v1'

interface Snapshot {
  at: number
  states: Record<string, KpiState>
}

export function useDelta() {
  return useMemo(() => {
    let prev: Snapshot | null = null
    try {
      prev = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    } catch {
      prev = null
    }
    const current: Snapshot = {
      at: Date.now(),
      states: Object.fromEntries(kpis.map((k) => [k.id, k.state])),
    }
    localStorage.setItem(KEY, JSON.stringify(current))
    if (!prev) return null
    const changes = kpis
      .filter((k) => prev!.states[k.id] && prev!.states[k.id] !== k.state)
      .map((k) => ({ kpi: k, from: prev!.states[k.id], to: k.state }))
    if (changes.length === 0) return null
    const days = Math.max(1, Math.round((current.at - prev.at) / 86400000))
    return { days, changes }
  }, [])
}

export function DeltaStrip() {
  const delta = useDelta()
  if (!delta) return null
  return (
    <section aria-label="Since you last looked" className="flex items-baseline gap-5 px-1">
      <span className="label shrink-0 text-ink-mute">
        Since you last looked · {delta.days} day{delta.days > 1 ? 's' : ''}
      </span>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13.5px] text-ink-soft">
        {delta.changes.slice(0, 3).map(({ kpi, from, to }) => (
          <span key={kpi.id}>
            → {kpi.name} moved from {STATE_LABEL[from].toLowerCase()} to {STATE_LABEL[to].toLowerCase()}
          </span>
        ))}
      </div>
    </section>
  )
}
