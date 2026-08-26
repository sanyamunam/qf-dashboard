/**
 * Entity as a logo, not a word.
 *
 * DIFI, Earthna, WISE and WISH use the icon glyph extracted from their
 * supplied lockups (public/entities/*.png — mark only, never the full
 * lockup). Everything else falls back to the Qatar Foundation sidra, cropped
 * from QF's own supplied lockup the same way.
 *
 * The fallback is deliberate rather than a placeholder: every entity in the
 * sheet — Higher Education, PUE, Human Capital, Policy Hub, City Operations,
 * HBKU, the CFO Division — is part of Qatar Foundation, so the parent mark is
 * accurate. The monogram badges this replaced were invented type standing in
 * for brand assets that were never missing in the first place. Which entity it
 * actually is stays in the tooltip, and is spelled out in the overlay.
 */
const ICONS: Record<string, string> = {
  DIFI: '/entities/difi.png',
  Earthna: '/entities/earthna.png',
  WISE: '/entities/wise.png',
  WISH: '/entities/wish.png',
}

const QF = '/entities/qf.png'

export function EntityIcon({ entity, size = 20 }: { entity?: string | null; size?: number }) {
  const raw = entity?.trim()
  /* 12 of the 89 Executive rows carry no entity. Saying so is the point — the
     sidra stands in for the parent, it does not pretend a gap is filled. */
  const unassigned = !raw || raw === 'Unassigned'
  const name = unassigned ? 'Qatar Foundation' : raw
  const own = ICONS[name]
  const label = unassigned
    ? 'Entity unassigned — shown under Qatar Foundation'
    : own
      ? name
      : `${name} · Qatar Foundation`
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white"
      style={{ width: size, height: size, boxShadow: 'inset 0 0 0 1px rgba(18,40,34,0.08)' }}
      title={label}
      aria-label={label}
      role="img"
    >
      <img
        src={own ?? QF}
        alt=""
        aria-hidden
        style={{ width: size - 4, height: size - 4, objectFit: 'contain' }}
      />
    </span>
  )
}
