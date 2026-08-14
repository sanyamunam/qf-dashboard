/**
 * The one way an indicator is named, everywhere: entity small and light above,
 * indicator name below in a heavier weight and darker tone. Used by the summary
 * spotlight tiles and the L2 mover cards so the two never drift apart (R5 fix 3).
 */
import type { Kpi } from '../model/types'

export function KpiIdentity({ kpi, dark, lines }: { kpi: Kpi; dark?: boolean; lines?: 2 }) {
  return (
    <span className="block min-w-0">
      <span className={`block text-[11px] leading-tight ${dark ? 'text-white/55' : 'text-ink-mute'}`}>
        {kpi.entity}
      </span>
      <span
        className={`mt-0.5 block text-[13.5px] font-semibold leading-tight ${lines === 2 ? 'line-clamp-2' : ''} ${dark ? 'text-white' : 'text-ink'}`}
        title={kpi.name}
      >
        {kpi.name}
      </span>
    </span>
  )
}
