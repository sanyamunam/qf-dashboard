/**
 * THE L1 palette — one definition, read by every mark the platform draws.
 *
 * An L1 mark answers "how is this doing against target". It IS a verdict, so
 * it is coloured by one, and by nothing else. A thematic colour in an L1 mark
 * is a bug: the bars that most need to signal a problem end up carrying no
 * status signal at all, and on Sustainability — whose theme green sits beside
 * the status green — a failing indicator becomes indistinguishable from a
 * succeeding one.
 *
 * This module exists because there were TWO bullet-bar implementations. The
 * OBS marks in Marks2.tsx took their colour from `statusFor`; the Release-2
 * snapshot marks on the thematic pages carried their own five-value
 * `ChartStatus`, of which only three mapped to colours — the other two fell
 * through to the theme hue. Both now read the table below.
 *
 * Thematic colour keeps exactly one job: the L2 trend. The theme is already
 * carried on a card by its icon, its accent and the page it sits on; it does
 * not need repeating in the data mark, and repeating it costs the mark the one
 * thing it exists to say.
 */
import type { DashStatus } from '../../model/status'

/** The fill. Nothing else may set one. */
export const L1_FILL: Record<DashStatus, string> = {
  onTarget: '#2e7d32',
  /* NOT the brighter #f9a825 the marks once used: as a large fill on a white
     card that measured 1.97:1, under the 3:1 floor for a graphical element.
     This clears it at 3.25 and matches the amber on the status chip, so the
     dot and the bar on one card agree. */
  belowTarget: '#b8860b',
  atRisk: '#c0392b',
  /* nothing to judge against, so there is no verdict colour to give */
  noTarget: '#989a9c',
  notReported: '#989a9c',
}

/** The shortfall band on a gauge — the same verdict, one step back, so the gap
 *  reads as part of the same claim rather than as a second one. */
export const L1_GAP: Record<DashStatus, string> = {
  onTarget: '#bfe0c4',
  belowTarget: '#f0d9a0',
  atRisk: '#f0c6c0',
  noTarget: '#dcdedf',
  notReported: '#dcdedf',
}

/** Ink for a figure printed beside or inside a mark, darkened to hold contrast
 *  against a white card at the size these actually render. */
export const L1_INK: Record<DashStatus, string> = {
  onTarget: '#2e7d32',
  belowTarget: '#8a6512',
  atRisk: '#a5301f',
  noTarget: '#6f7376',
  notReported: '#6f7376',
}

/**
 * A minimum visible fill, as a percentage of the track.
 *
 * A reading of zero still gets a BAR, not a coloured speck. "International 0
 * of 2" rendered as a 2px dot that read as decoration rather than as a
 * measurement — the reader could not tell it apart from a bullet point. The
 * stub is small enough to stay honest about the value and large enough to
 * carry its status colour legibly.
 */
export const L1_MIN_FILL_PCT = 4
