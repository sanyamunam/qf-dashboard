/**
 * The trend palette — one place, so no chart on the platform can drift into
 * using a status colour for a series.
 *
 * STATUS COLOUR IS RESERVED FOR STATUS, and a verdict is made in exactly three
 * places: the status label, the L1 mark's fill, the polarity arrow. A trend
 * makes no verdict, so it may not borrow their language.
 *
 * But colour still has a job here, and it is IDENTITY: a trend is drawn in its
 * indicator's thematic hue. That is safe precisely because it varies with
 * theme rather than performance — two Progressive Education cards, one at risk
 * and one performing, are the same colour, so there is no verdict to infer.
 *
 * ─── why these values and not the theme hues themselves ───
 *
 * Measured in CIE Lab against every status colour, two of the six thematic
 * hues are confusable at full strength: Progressive Education #e5a823 sits
 * ΔE 5.9 from the below-target amber (indistinguishable), and Sustainability
 * #2e7d5b sits ΔE 18.3 from the old "Performing well" green. Re-hueing them
 * has nowhere to go — every teal tested lands within ΔE 12 of a status green,
 * and every warm alternative within ΔE 19 of amber or red.
 *
 * So the separation is made by REGISTER instead of by hue: a trend is the
 * theme's hue at roughly 55% chroma and 62% lightness — deep and quiet, a
 * reading rather than a fill — with earlier periods as a pale tint of the same
 * hue. Every one of these clears ΔE 28 from every status colour, which is the
 * threshold at which two colours stop being confusable at small sizes. The
 * full-strength thematic hues are untouched and still own the theme bands,
 * landing cards and identity dots.
 *
 * This works only because the status palette was narrowed at the same time:
 * see STATUS_DOT and STATUS_COLOR, where "Performing well" moved onto QF's own
 * reserved semantic lime and the below-target amber was deepened off
 * Progressive Education's gold.
 */

export interface TrendHues {
  /** the current period — carries the weight */
  now: string
  /** earlier periods — same hue, lifted back so the latest reads first */
  past: string
}

/** Keyed by ThemeMeta.id in model/data.ts. */
const BY_THEME: Record<string, TrendHues> = {
  social: { now: '#3a4267', past: '#cdd2e4' },
  sustain: { now: '#274c3a', past: '#c0d2c6' },
  /* deepened from #866528 when the L1 below-target amber moved to #b8860b for
     contrast: against the new amber the old value measured dE 28.3, sitting
     exactly on the floor where two colours stop being confusable. This
     restores the headroom to 32.5 and stays in Progressive Education's gold. */
  edu: { now: '#7a5a22', past: '#e6d7b8' },
  ai: { now: '#2b6b7e', past: '#c8dfe6' },
  health: { now: '#3f2a56', past: '#d2c9dd' },
  oe: { now: '#2b3242', past: '#ccd0d8' },
}

/**
 * An indicator with no thematic area — 12 of the 89 Executive rows — has no
 * identity to carry, so it takes the platform's neutral ink. That is the
 * honest reading: the colour says nothing because nothing is known.
 */
export const TREND_NEUTRAL: TrendHues = { now: '#122822', past: '#c3d0cd' }

export const trendHues = (themeId?: string | null): TrendHues =>
  (themeId && BY_THEME[themeId]) || TREND_NEUTRAL

/* ── the parts that never take a thematic hue ── */

/**
 * The commitment. Neutral by rule and identical across every theme: a target
 * is a reference, not a warning and not an identity. Never red — that reads as
 * a danger signal on a number nobody has missed yet.
 */
export const TREND_TARGET = '#7e938d'
/** Axis, baseline, and the reported/committed divider. */
export const TREND_RULE = '#dedfdd'
/** Year ticks and other incidental type. */
export const TREND_AXIS_INK = '#989a9c'

/** Kept for surfaces with no theme in hand (the Quarterly Brief's margin marks). */
export const TREND_ACTUAL = TREND_NEUTRAL.now
export const TREND_ACTUAL_PAST = TREND_NEUTRAL.past

/* ─────────────────────────── on a dark surface ───────────────────────────
 *
 * The Organizational Excellence band is navy, and every value above is tuned
 * for a white card — the ink actual (#122822) and the navy trend hue (#2b3242)
 * are both invisible on it. So the same grammar inverts: the reading is near
 * white, earlier periods are a translucent white, the target stays neutral and
 * dashed. Still no status colour, still one hue family, still the latest
 * period carrying the weight.
 */
export const TREND_DARK: TrendHues = { now: '#eef2f9', past: 'rgba(255,255,255,0.34)' }
export const TREND_TARGET_DARK = 'rgba(255,255,255,0.62)'
export const TREND_RULE_DARK = 'rgba(255,255,255,0.22)'
export const TREND_AXIS_INK_DARK = 'rgba(255,255,255,0.55)'
