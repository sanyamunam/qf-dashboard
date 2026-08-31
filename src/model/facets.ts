/**
 * The facets an indicator can be filtered by, and how each is read off a row.
 *
 * Extracted from dash.ts so the search lexicon can build itself from the same
 * accessors the filters use, without importing the dashboard model — the
 * lexicon has to know every real value in the sheet, and the only safe source
 * for "every real value" is the function that reads it.
 */
import { obsKpis, type ObsKpi } from './obs'

export const entityOf = (k: ObsKpi) => k.proposedEntity ?? k.entity ?? 'Unassigned'
export const themeOf = (k: ObsKpi) => k.theme ?? 'Unassigned'
export const dashOf = (k: ObsKpi) => ((k.dashboard ?? '').startsWith('Exec') ? 'Executive' : 'Thematic')
/** 12 Executive rows carry no framework — an explicit facet value, not a blank. */
export const frameworkOf = (k: ObsKpi) => k.framework ?? 'Unassigned'

/* ─────────────────────── the category tree, parsed ───────────────────────
 * `Category` is `Parent - Child`, split on the space-hyphen-space delimiter
 * at parse time. A value with no delimiter is a standalone group. A row with
 * no category at all (Patents Granted – Other) routes to an explicit
 * `Uncategorised` group — never a group called `None`. */
export const UNCAT = 'Uncategorised'

export const groupOf = (k: ObsKpi) => (k.category.trim() ? k.group : UNCAT)
export const subOf = (k: ObsKpi) => (k.category.trim() ? k.subgroup : UNCAT)

export interface CatNode {
  parent: string
  total: number
  /** empty = standalone: cards render directly under the parent */
  subs: { name: string; total: number }[]
}

export function buildTree(rows: ObsKpi[]): CatNode[] {
  const parents = new Map<string, Map<string, number>>()
  for (const k of rows) {
    const g = groupOf(k)
    if (!parents.has(g)) parents.set(g, new Map())
    const subs = parents.get(g)!
    const s = subOf(k)
    subs.set(s, (subs.get(s) ?? 0) + 1)
  }
  return [...parents].map(([parent, subs]) => {
    const total = [...subs.values()].reduce((a, b) => a + b, 0)
    const subList = [...subs].map(([name, n]) => ({ name, total: n }))
    const standalone = subList.length === 1 && subList[0].name === parent
    return { parent, total, subs: standalone ? [] : subList.sort((a, b) => b.total - a.total) }
  })
}

/** Either level matches — selecting a parent includes all its children. */
export const inCategory = (k: ObsKpi, label: string): boolean => groupOf(k) === label || subOf(k) === label

/** Every distinct value the sheet actually holds, per facet. The lexicon is
 *  built from these, so it can never offer a term the data cannot answer. */
export const facetValues = () => {
  const tree = buildTree(obsKpis)
  const uniq = (xs: string[]) => [...new Set(xs)].filter((x) => x && x !== 'Unassigned')
  return {
    entity: uniq(obsKpis.map(entityOf)),
    theme: uniq(obsKpis.map(themeOf)).filter((t) => t !== 'All'),
    cat: uniq(tree.flatMap((t) => [t.parent, ...t.subs.map((s) => s.name)])).filter((c) => c !== UNCAT),
    framework: uniq(obsKpis.map(frameworkOf)),
    dash: ['Executive', 'Thematic'],
  }
}
