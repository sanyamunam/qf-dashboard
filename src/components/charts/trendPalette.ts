/**
 * The trend palette — one place, so no chart on the platform can drift back
 * into using a status colour for a series.
 *
 * STATUS COLOUR IS RESERVED FOR STATUS. Green means "Performing well", amber
 * "below target", maroon "At risk", and those verdicts are made in exactly
 * three places: the status label, the L1 mark's fill, and the polarity arrow.
 * A trend chart makes no verdict, so it may not borrow their language — an
 * untargeted indicator drawn in brand green read as performing well while its
 * own caption said "Untargeted, so direction only", and a target path drawn in
 * red read as a danger signal when a commitment is a reference line.
 *
 * The thematic hue was the obvious alternative and does not work here: two of
 * the six ARE the status colours to the eye (Sustainability #2e7d5b against
 * status green #3c6a5f, Progressive Education #e5a823 against the below-target
 * amber). On a mixed listing that reintroduces the exact conflict being
 * removed, so the actual series takes a neutral ink ramp instead — one family,
 * two weights, no verdict available to infer.
 */

/** The current reading. The platform's own ink — a fact, not a judgement. */
export const TREND_ACTUAL = '#122822'
/** Earlier periods: same family, lifted back so the latest reads first. */
export const TREND_ACTUAL_PAST = '#c3d0cd'
/** The commitment. Neutral by rule — never red, never green. */
export const TREND_TARGET = '#7e938d'
/** Axis, baseline and the reported/committed divider. */
export const TREND_RULE = '#dedfdd'
/** Year ticks and other incidental type. */
export const TREND_AXIS_INK = '#989a9c'
