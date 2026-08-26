/**
 * The one way an indicator is named, everywhere: entity small and light above,
 * indicator name below in a heavier weight and darker tone. Used by the summary
 * spotlight tiles and the L2 mover cards so the two never drift apart (R5 fix 3).
 *
 * `showEntity` off on the KPI card, where the entity is now carried by its
 * logo — printing both would put the same fact on screen twice and take back
 * the header space the logo was meant to free.
 */
import type { Kpi } from '../model/types'

export function KpiIdentity({ kpi, dark, showEntity = true }: { kpi: Kpi; dark?: boolean; showEntity?: boolean }) {
  return (
    <span className="block min-w-0">
      {showEntity && (
        <span className={`block text-[11px] leading-tight ${dark ? 'text-white/55' : 'text-ink-mute'}`}>
          {kpi.entity}
        </span>
      )}
      <span
        className={`block text-[13.5px] font-semibold leading-tight ${showEntity ? 'mt-0.5' : ''} ${dark ? 'text-white' : 'text-ink'}`}
      >
        {kpi.name}
      </span>
    </span>
  )
}
