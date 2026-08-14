/**
 * Entity avatars. DIFI, Earthna, WISE and WISH use the icon glyph extracted
 * from their supplied lockups (public/entities/*.png — mark only, never the
 * full lockup). Policy Hub and QF Human Capital have no supplied mark:
 * FLAGGED AS MISSING BRAND ASSETS — until QF supplies them, they carry a
 * designed monogram badge in the platform's own type, not a fabricated logo.
 */
const ICONS: Record<string, string> = {
  DIFI: '/entities/difi.png',
  Earthna: '/entities/earthna.png',
  WISE: '/entities/wise.png',
  WISH: '/entities/wish.png',
}

const MONOGRAMS: Record<string, { initials: string; bg: string }> = {
  'Policy HUB': { initials: 'PH', bg: '#556bb4' },
  'QF Human Capital': { initials: 'HC', bg: '#1f2a44' },
}

export function EntityIcon({ entity, size = 20 }: { entity: string; size?: number }) {
  const icon = ICONS[entity]
  if (icon)
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white"
        style={{ width: size, height: size, boxShadow: 'inset 0 0 0 1px rgba(18,40,34,0.08)' }}
        title={entity}
      >
        <img src={icon} alt={entity} style={{ width: size - 4, height: size - 4, objectFit: 'contain' }} />
      </span>
    )
  const m = MONOGRAMS[entity]
  if (!m) return null
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[6px] font-semibold text-white"
      style={{ width: size, height: size, background: m.bg, fontSize: Math.max(8, size * 0.42), letterSpacing: '0.02em' }}
      title={`${entity} (monogram — brand mark not yet supplied)`}
    >
      {m.initials}
    </span>
  )
}
