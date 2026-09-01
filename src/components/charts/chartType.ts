/**
 * THE typography of a mark — one definition, read by every chart the platform
 * draws.
 *
 * The ECharts marks already asked for Space Grotesk by name. The SVG marks
 * asked for nothing, so every figure they drew inherited the UI face,
 * proportionally spaced. That is the whole bug this module fixes: in a
 * proportional face "1" is narrower than "8", so a bullet bar reading 1,200,000
 * and the one below it reading 8,800,000 set their value labels to different
 * widths, and a column of figures down a listing page never lines up. Worse,
 * the same card re-rendered on a new period shifted its own label sideways.
 *
 * Tabular figures fix both: every digit occupies one width, so a number is as
 * wide as its digit COUNT and nothing else.
 *
 * The second style here is the micro-label — "target 1,500", "by now", "0%".
 * These are not data, they are the scale the data is read against, and they
 * earn their legibility from being small, letterspaced and quiet rather than
 * from size. Letterspacing is what keeps a 9px label readable; without it the
 * glyphs close up and the label turns into a smudge at exactly the size we
 * need it smallest.
 */

/** The numeral face. Any figure a mark prints uses this — no exceptions, or
 *  the column stops aligning at the first one that opts out. */
export const NUM_FONT = '"Space Grotesk", ui-monospace, monospace'

/** A figure drawn inside or beside a mark. Spread onto an SVG <text>. */
export const numStyle = {
  fontFamily: NUM_FONT,
  fontVariantNumeric: 'tabular-nums',
} as const

/**
 * A caption naming the scale — the target, the pace tick, an axis end.
 *
 * Deliberately NOT uppercased. Amicro sets these in caps, which reads well on
 * a label like "BENCHMARK" but not on ours: our captions carry figures
 * ("target 1,500"), and caps force the digits to fight the letters for the
 * same optical weight. The letterspacing is what carries the treatment.
 */
export const microStyle = {
  fontFamily: NUM_FONT,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.04em',
} as const

/**
 * The corner radius of a trend bar, top corners only.
 *
 * Amicro's signature is the full-radius pill column, and at 24px wide that
 * would mean a radius of 12 — a dome. We do not take it that far, for one
 * reason: these bars are read against a target bar beside them, and a domed
 * top has no single height to compare. 6 reads as clearly rounded while
 * leaving a flat centre section that still states the value.
 *
 * The BOTTOM corners stay square, and that is not a compromise either. A trend
 * bar is anchored to zero; rounding the foot would lift it off its own
 * baseline and imply the series floats.
 */
export const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0]

/**
 * The same corner, for a bar drawn in CSS rather than by ECharts.
 *
 * DERIVED, not restated. The dashboard's mini bar mark is a flex row of divs,
 * so it needs a `border-radius` string — and a second literal is exactly how
 * the two bullet-bar implementations drifted apart before l1Palette.ts pulled
 * them back together. CSS clamps a radius to half the box, so a card packed
 * with narrow bars degrades to a pill instead of overflowing.
 */
export const BAR_RADIUS_CSS = `${BAR_RADIUS[0]}px ${BAR_RADIUS[1]}px ${BAR_RADIUS[2]}px ${BAR_RADIUS[3]}px`
