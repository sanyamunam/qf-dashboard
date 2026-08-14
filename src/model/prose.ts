/// <reference types="vite/client" />
/**
 * Generate-to-fit (R9 fix 2). Nothing the platform writes is ever clipped:
 * where space is limited, the sentence is written shorter, not shown shorter.
 *
 * Every surface with a fixed height declares a character budget. A generator
 * offers its phrasings longest-first; `fit` returns the fullest one that
 * concludes inside the budget. The last candidate is the floor — it must be
 * short enough to survive any budget, because there is nothing after it.
 */

/** Budgets are derived from the narrowest real width each surface can reach. */
export const BUDGET = {
  /** card caption, 2 lines at 11.5px — sm cards can narrow to ~300px */
  captionSm: 92,
  /** spotlight caption, 2 lines at 11.5px in a half-width card */
  captionLg: 170,
  /** page summary verdict, 2 lines at 19px with the BOTaina dock open */
  verdict: 112,
  /** page summary evidence, 3 lines at 13.5px capped to 80ch, dock open */
  evidence: 250,
  /** the one-line ask under a summary */
  ask: 120,
} as const

/** The fullest phrasing that finishes inside `budget`. Never truncates. */
export function fit(candidates: string[], budget: number): string {
  for (const c of candidates) if (c.length <= budget) return c
  return candidates[candidates.length - 1]
}

/**
 * Dev-only guard: a floor candidate that still overruns is an authoring bug,
 * not a rendering one, and should be fixed in the sentence.
 */
export function assertFits(text: string, budget: number, label: string): string {
  if (import.meta.env.DEV && text.length > budget)
    console.warn(`[prose] ${label} overruns its ${budget}-char budget by ${text.length - budget}: "${text}"`)
  return text
}
