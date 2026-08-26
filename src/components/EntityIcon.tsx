/**
 * Entity as a logo, with the name on hover.
 *
 * The avatars are derived from QF's own supplied lockups by
 * scripts/entity_marks.py — mark only, never the lockup: at 20px a lockup with
 * a strapline under it is an illegible smear. QF supplied six, and only four of
 * them (DIFI, Earthna, WISE, WISH) match an entity that appears in the sheet.
 *
 * Everything else falls back to the Qatar Foundation sidra, which is accurate
 * rather than a gap — Higher Education, PUE, Human Capital, Policy Hub, City
 * Operations, HBKU, QPHI and the CFO Division are all part of QF. But it does
 * mean most cards in a listing carry the SAME mark, so the logo alone cannot
 * tell you whose indicator you are reading. Hence the hover: a real tooltip in
 * the platform's own type rather than the browser's, which takes a second to
 * appear and cannot say two things. It opens on focus too, so the name is
 * reachable without a mouse.
 */
const ICONS: Record<string, string> = {
  DIFI: '/entities/difi.png',
  Earthna: '/entities/earthna.png',
  WISE: '/entities/wise.png',
  WISH: '/entities/wish.png',
}

const QF = '/entities/qf.png'

export function EntityIcon({
  entity,
  size = 20,
  /** the tooltip opens downward by default; upward where the icon sits low in
   *  its card and a panel below would be clipped */
  place = 'below',
}: {
  entity?: string | null
  size?: number
  place?: 'below' | 'above'
}) {
  const raw = entity?.trim()
  /* 12 of the 89 Executive rows carry no entity at all. Saying so is the
     point — the sidra stands in for the parent, it never fills the gap. */
  const unassigned = !raw || raw === 'Unassigned'
  /* rows owned by QF itself: the sidra IS their mark, so naming the parent
     underneath would just say Qatar Foundation twice */
  const isQF = raw === 'QF' || raw === 'Qatar Foundation'
  const name = unassigned ? 'Entity unassigned' : isQF ? 'Qatar Foundation' : raw!
  const own = unassigned ? undefined : ICONS[name]
  const under = unassigned ? 'shown under Qatar Foundation' : own || isQF ? null : 'Qatar Foundation'

  return (
    <span className="group/ent relative inline-flex shrink-0">
      <span
        tabIndex={0}
        role="img"
        aria-label={under ? `${name} — ${under}` : name}
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white outline-none"
        style={{ width: size, height: size, boxShadow: 'inset 0 0 0 1px rgba(18,40,34,0.08)' }}
      >
        <img src={own ?? QF} alt="" aria-hidden style={{ width: size - 4, height: size - 4, objectFit: 'contain' }} />
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute end-0 z-30 hidden whitespace-nowrap rounded-input px-2 py-1 text-start opacity-0 shadow-(--shadow-card-hover) transition-opacity duration-150 group-hover/ent:block group-hover/ent:opacity-100 group-focus-within/ent:block group-focus-within/ent:opacity-100 ${
          place === 'above' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
        }`}
        style={{ background: 'var(--color-sidra)' }}
      >
        <span className="block text-[11px] font-semibold leading-tight text-white">{name}</span>
        {under && <span className="mt-0.5 block text-[10px] leading-tight text-white/70">{under}</span>}
      </span>
    </span>
  )
}
