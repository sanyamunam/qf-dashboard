/**
 * The bridge between the two models.
 *
 * The thematic pages read Release 2's `kpis.json`; the chart selector reads
 * the OBS workbook. They are the same indicators recorded twice, so a spotlight
 * KPI has to be located in the OBS rows before `selectL1`/`selectL2` can decide
 * its mark. Matching is by normalised NAME within the 151 Thematic rows, then
 * disambiguated by entity — five rows are called `Policy Recommendations`, one
 * per entity, and four are called `Beneficiaries`.
 *
 * Returns null rather than guessing. A spotlight that cannot be located draws
 * no chart at all, which is the honest outcome: the alternative is charting
 * some other entity's indicator under this one's name.
 */
import { obsKpis, type ObsKpi } from './obs'
import type { Kpi } from './types'

const thematic = obsKpis.filter((k) => !(k.dashboard ?? '').startsWith('Exec'))

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** `QF Human Capital` and `Human Capital` are the same owner recorded twice. */
const sameEntity = (a: string | null | undefined, b: string | null | undefined) => {
  const x = norm(a)
  const y = norm(b)
  return x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x)))
}

const cache = new Map<string, ObsKpi | null>()

export function obsForKpi(k: Kpi | null | undefined): ObsKpi | null {
  if (!k) return null
  if (cache.has(k.id)) return cache.get(k.id) ?? null
  const byName = thematic.filter((o) => norm(o.name) === norm(k.name))
  const hit =
    byName.length === 1
      ? byName[0]
      : (byName.find((o) => sameEntity(o.proposedEntity ?? o.entity, k.entity)) ?? null)
  cache.set(k.id, hit)
  return hit
}
