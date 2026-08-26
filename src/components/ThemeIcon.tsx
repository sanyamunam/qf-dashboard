/**
 * Thematic area as a mark, not a word.
 *
 * `PROGRESSIVE EDUCATION` in full caps repeated five times down a column of
 * five Progressive Education cards was the widest element in every header and
 * told the reader nothing they did not already know. The theme's own hue plus
 * one glyph carries the same identity in a sixteenth of the space; the full
 * name lives in the tooltip here and in plain text in the overlay, where there
 * is room for it and where a reader may genuinely need it spelled out.
 *
 * One family: a 16-unit grid, 1.5 stroke, round caps and joins, no fills. The
 * colours are THEMES[].fill in model/data.ts — the same hues the thematic
 * landing already uses, so a card and its theme page agree.
 */
import { themeByName } from '../model/data'

const GLYPH: Record<string, React.ReactNode> = {
  /* two figures, one behind the other */
  social: (
    <>
      <circle cx="6.2" cy="5.9" r="2.1" />
      <path d="M2.6 13.3c0-2.1 1.6-3.5 3.6-3.5s3.6 1.4 3.6 3.5" />
      <circle cx="11.7" cy="7" r="1.5" />
      <path d="M10.2 10.3c2.1-.4 3.5.9 3.5 3" />
    </>
  ),
  /* a leaf with its midrib */
  sustain: (
    <>
      <path d="M13.3 3.1C6.7 2.5 3 5.3 3 9.3a3.8 3.8 0 0 0 3.8 3.8c4.1 0 6.8-3.6 6.5-10z" />
      <path d="M11.1 5.5 5.3 12.5" />
    </>
  ),
  /* a mortarboard */
  edu: (
    <>
      <path d="M8 2.9 14.4 6 8 9.1 1.6 6z" />
      <path d="M4.4 7.5v3.3c0 1.1 1.6 2 3.6 2s3.6-.9 3.6-2V7.5" />
    </>
  ),
  /* a node and the three it reaches */
  ai: (
    <>
      <circle cx="8" cy="8" r="1.9" />
      <circle cx="3.2" cy="4.3" r="1.3" />
      <circle cx="12.8" cy="4.3" r="1.3" />
      <circle cx="8" cy="13.3" r="1.3" />
      <path d="M4.3 5.2 6.6 7M11.7 5.2 9.4 7M8 9.9v2.1" />
    </>
  ),
  /* a trace */
  health: <path d="M1.7 8.2h3.1l1.5-3.9L9.1 11.7l1.5-3.5h3.7" />,
  /* four parts held in one frame */
  oe: (
    <>
      <rect x="2.3" y="2.3" width="5" height="5" rx="1.2" />
      <rect x="8.7" y="2.3" width="5" height="5" rx="1.2" />
      <rect x="2.3" y="8.7" width="5" height="5" rx="1.2" />
      <rect x="8.7" y="8.7" width="5" height="5" rx="1.2" />
    </>
  ),
}

/** An unassigned row is a real state in this sheet — 12 of the 89 Executive
 *  rows carry no thematic area — so it gets a mark of its own rather than
 *  borrowing a theme's. */
const UNASSIGNED = (
  <>
    <circle cx="8" cy="8" r="5.4" strokeDasharray="2.6 2.4" />
  </>
)

export function ThemeIcon({ theme, size = 15 }: { theme?: string | null; size?: number }) {
  const meta = theme ? themeByName(theme) : null
  const glyph = meta ? GLYPH[meta.id] : null
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, color: glyph ? meta!.fill : 'var(--color-ink-mute)' }}
      title={theme ?? 'Thematic area unassigned'}
      aria-label={theme ?? 'Thematic area unassigned'}
      role="img"
    >
      <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph ?? UNASSIGNED}
      </svg>
    </span>
  )
}
