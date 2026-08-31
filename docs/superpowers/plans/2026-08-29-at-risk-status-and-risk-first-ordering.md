# At Risk status + risk-first ordering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth status, `At Risk`, for indicators materially behind their expected pace, and make every listing on the platform default to riskiest-first.

**Architecture:** All five verdicts and the severity ordering come from ONE place — `src/model/status.ts` — which `dash.ts` re-exports so no surface computes its own. A tunable settings object holds the threshold. Attainment (actual ÷ expected-by-now, polarity-aware) is computed once and exposed on every card so a classification can always be traced. Sorting is a single `bySeverity` comparator applied at every list site.

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind · Vitest (added in Task 1, model layer only)

---

## Findings that shape this plan (verified against the workbook before writing)

These were measured, not assumed. `scripts/parse_obs.py` → `src/data/obs.json`, 240 rows.

**The naive threshold really is useless.** Q1 actual against 25% of the raw 2026 target flags **75 of 151** Thematic rows. The brief predicted ~69; the exact number differs but the point holds — that is a quarter of the year elapsing, not 75 emergencies.

**The zero problem is bigger than the current rule catches.** 80 rows have a Q1 cell of exactly `0`. Today `annualZeroIsAbsent` treats a zero as an absence only when the row has 2022–25 history — 28 rows. The other **52 have no history at all** and are read as real zeros; 47 of those carry a 2026 target, so all 47 would classify as `At Risk`. Among them: `% Satisfaction with Ya Hala program` (target 70), `QF Factory for Leaders – Satisfaction` (target 90), `%Succession Planning Rate` (target 70), `Summit NPS` (target 85). **15 of the 47 are Human Capital rows** — exactly the failure the brief names.

**The rule this plan adopts.** A zero is an absence when the row has prior history (today's rule) **OR when the indicator is point-in-time** — a rate, percentage, score, or NPS. A 0% satisfaction score is not a measurement; a count of 0 deliveries genuinely is. Measured outcomes:

| Zero rule | Exec At Risk | Thematic At Risk | Verdict |
|---|---|---|---|
| Today only | 7 | 44 | keeps 18 satisfaction/NPS artefacts |
| **+ point-in-time (this plan)** | **7** | **26** | removes the artefacts, keeps real zeros |
| Every zero absent (brief read literally) | 2 | 2 | fails "a larger Thematic set" |

The brief expects "roughly 5 Executive and a larger Thematic set". This plan yields 7 and 26 — the closest fit, and nowhere near 69/75, which is the brief's own test that the pace adjustment is applied.

**Open tuning question, deliberately not resolved in code.** Five of the seven Executive at-risk rows are Policy Adoption / Policy Recommendations with an *annual target of 1 or 2*. Their pace bar is 0.25–0.5, so a Q1 zero scores attainment 0 and classifies At Risk — yet delivering one policy adoption in Q4 is a normal year. The threshold is tunable and attainment is on the card, so QF can see this and decide. Flag it at review rather than hard-coding a small-target exemption.

**Polarity confirmed:** exactly 15 rows carry `Polarity: Red`, matching the brief.

---

## File Structure

**Create**
- `src/model/status.ts` — the single source: `RISK`, `DashStatus`, `attainmentOf`, `statusFor`, `severityOf`, `bySeverity`, labels, colours. Pure functions, no JSX, so it can be unit-tested and counted.
- `src/model/status.test.ts` — the numeric contract (counts, exclusions, polarity).
- `vitest.config.ts` — model-layer tests only.

**Modify**
- `src/model/obs.ts` — widen the absence rule (`q1IsAbsent`).
- `src/model/dash.ts` — delete the local status block; re-export from `status.ts`; sort helpers.
- `src/components/DashParts.tsx` — five status cards; the "How status is calculated" copy.
- `src/screens/Executive.tsx`, `src/screens/Search.tsx`, `src/screens/Misc.tsx`, `src/screens/L2.tsx` — risk-first default sort.
- `src/components/KpiCard.tsx` — expose attainment.
- `src/styles.css` — the maroon status token.

**Why `status.ts` is new rather than more of `dash.ts`:** `dash.ts` is already 680 lines carrying periods, the category tree, search and the AI summary. The status model is about to grow a threshold, an attainment calculation and a severity ordering, and every one of those is a pure function with an exact expected answer. Splitting it out is what makes Task 2's test file possible.

---

### Task 1: Test harness for the model layer

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm i -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

// The model layer only. These are pure functions over the parsed workbook with
// exact expected answers — the one part of this codebase where a unit test is
// worth more than a headless screenshot.
export default defineConfig({
  test: { include: ['src/model/**/*.test.ts'], environment: 'node' },
})
```

- [ ] **Step 3: Add the script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`

- [ ] **Step 4: Verify the runner starts**

Run: `npm test`
Expected: `No test files found` — exit 1, but vitest itself runs. That is the pass condition for this step.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: vitest for the model layer"
```

---

### Task 2: The absence rule — a zero that is not a reading

**Files:**
- Modify: `src/model/obs.ts:102-105`
- Test: `src/model/status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/model/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { obsKpis, q1Of } from './obs'

const byName = (n: string) => obsKpis.find((k) => k.name.trim() === n)!

describe('a Q1 zero that is not a reading', () => {
  it('reads a 0% satisfaction score as an absence, not a collapse', () => {
    expect(q1Of(byName('% Satisfaction with Ya Hala program'))).toBeNull()
  })

  it('reads a 0 NPS as an absence', () => {
    expect(q1Of(byName('Summit NPS'))).toBeNull()
  })

  it('still reads a count of zero deliveries as a real reading', () => {
    // 0 policy adoptions in Q1 is a fact about delivery, not a missing cell
    expect(q1Of(byName('Policy Hub - Policy Adoption'))).toBe(0)
  })

  it('leaves non-zero readings alone', () => {
    expect(q1Of(byName('Budget Variance'))).toBe(18)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `% Satisfaction with Ya Hala program` returns `0`, not `null`.

- [ ] **Step 3: Widen the rule in `src/model/obs.ts`**

Replace the `annualZeroIsAbsent` / `q1Of` block:

```ts
/**
 * A rate, percentage, score or NPS — a level that exists at an instant.
 * Kept here because the ABSENCE rule below depends on it: a 0% is a different
 * kind of claim from a count of 0.
 */
export const isPointInTime = (k: ObsKpi): boolean =>
  /percentage|%|ratio|rate|score|index|average|per employee|satisfaction|time to hire|turnover|utili[sz]ation|nps/i.test(
    `${k.definition ?? ''} ${k.name}`,
  )

/**
 * A Q1 cell holding 0 that is an ABSENCE rather than a reading.
 *
 * Two tells, and both are needed:
 *
 * 1. A zero on a row that HAS 2022–25 history is the year-end reporting
 *    pattern — % Employee Turnover reads 8.45 · 8.3 · 9.0 · 7.0 and then 0,
 *    which is plainly "not yet", not a collapse to zero.
 *
 * 2. A zero on a POINT-IN-TIME indicator is not a measurement at all. "0%
 *    satisfaction with Ya Hala", "Summit NPS 0", "0% succession planning" are
 *    empty cells, not findings — and 15 of the 47 rows this catches are QF
 *    Human Capital, which is exactly the set that must never read as failing.
 *
 * A cumulative COUNT of zero is left alone: 0 policy adoptions in Q1 is a real
 * fact about delivery, and hiding it would be the worse error.
 */
export const q1IsAbsent = (k: ObsKpi): boolean =>
  k.q1 === 0 && (A_YEARS.some((y) => typeof k.actuals[y] === 'number') || isPointInTime(k))

/** @deprecated kept so existing imports keep compiling; prefer `q1IsAbsent` */
export const annualZeroIsAbsent = q1IsAbsent

export const q1Of = (k: ObsKpi): number | null => (q1IsAbsent(k) ? null : lift(k, k.q1))
```

- [ ] **Step 4: Run the test again**

Run: `npm test`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/obs.ts src/model/status.test.ts
git commit -m "A Q1 zero on a rate or score is an absence, not a collapse"
```

---

### Task 3: The status model — attainment, five verdicts, one threshold

**Files:**
- Create: `src/model/status.ts`
- Test: `src/model/status.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/model/status.test.ts`:

```ts
import { RISK, attainmentOf, statusFor, statusCountsOf } from './status'
import { execRows, thematicRows } from './dash'

describe('At Risk is measured against pace, never the annual total', () => {
  it('does not flag most of the portfolio', () => {
    const n = thematicRows.filter((k) => statusFor(k, 'q1') === 'atRisk').length
    // the brief's own tripwire: ~69 means the pace adjustment is missing
    expect(n).toBeLessThan(40)
    expect(n).toBeGreaterThan(10)
  })

  it('counts sum to the size of each dashboard', () => {
    for (const rows of [execRows, thematicRows]) {
      const c = statusCountsOf(rows, 'q1')
      const sum = Object.values(c).reduce((a, b) => a + b.length, 0)
      expect(sum).toBe(rows.length)
    }
  })

  it('never classifies an indicator with no reading as At Risk', () => {
    const bad = [...execRows, ...thematicRows].filter(
      (k) => statusFor(k, 'q1') === 'atRisk' && attainmentOf(k, 'q1') === null,
    )
    expect(bad).toHaveLength(0)
  })

  it('inverts the test for lower-is-better indicators', () => {
    // Budget Variance: 18% against a ceiling of 0 — the overshoot IS the risk
    const bv = obsKpis.find((k) => k.name.trim() === 'Budget Variance')!
    expect(statusFor(bv, 'q1')).toBe('atRisk')
    // Cost Per Hire: 5,567 against a ceiling of 15,000 — comfortably under
    const cph = obsKpis.find((k) => k.name.trim() === 'Cost Per Hire (QAR)')!
    expect(statusFor(cph, 'q1')).toBe('onTarget')
  })

  it('puts the threshold in a settings object', () => {
    expect(RISK.threshold).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './status'`.

- [ ] **Step 3: Create `src/model/status.ts`**

```ts
/**
 * THE status model. Five verdicts, one attainment calculation, one ordering.
 *
 * Everything that says how an indicator is doing comes from here — the status
 * cards, the chips, the AI summary, the search facet and every sort. A surface
 * that computed its own verdict is how a card and its overlay came to disagree.
 */
import { isLowerBetter, isPointInTime, lift, q1Of, type ObsKpi } from './obs'

export type Period = '2025' | 'q1'

/**
 * Tunable, because 50% is a starting position rather than a finding.
 *
 * `elapsed` is the share of the year gone by at the reporting point. QF has set
 * NO quarterly milestones, so even accrual is this platform's assumption and is
 * stated on screen beside every count that rests on it.
 */
export const RISK = {
  /** attainment below this share of expected pace is materially behind */
  threshold: 0.5,
  /** how much of the year Q1 represents */
  elapsed: 0.25,
  elapsedLabel: 'three of twelve months',
} as const

export type DashStatus = 'atRisk' | 'belowTarget' | 'onTarget' | 'noTarget' | 'notReported'

/** Severity order, worst first — the order the cards sit in and lists sort by. */
export const STATUS_ORDER: DashStatus[] = ['atRisk', 'belowTarget', 'noTarget', 'notReported', 'onTarget']

export const STATUS_LABEL: Record<DashStatus, string> = {
  atRisk: 'At risk',
  belowTarget: 'Below target',
  onTarget: 'On target',
  noTarget: 'No target set',
  notReported: 'Not reported',
}

/**
 * Status colour is a MARK — a dot beside a label, in a consistent slot. Never a
 * card fill, a chart series or a theme accent. Thematic colours are fills;
 * status colours are dots, and that separation is the only reason five statuses
 * and five themes stay legible on one screen.
 *
 * Maroon is QF's own semantic unfavourable colour, unambiguously more severe
 * than the amber it has to be told apart from, and far from every thematic hue.
 */
export const STATUS_DOT: Record<DashStatus, string> = {
  atRisk: '#8a1538',
  belowTarget: '#b8860b',
  onTarget: '#78be20',
  noTarget: '#8a8f98',
  notReported: '#9aaba5',
}

export const STATUS_SENSE: Record<DashStatus, string> = {
  atRisk: 'under half the pace expected by now',
  belowTarget: 'behind the pace expected by now',
  onTarget: 'at or ahead of the pace expected by now',
  noTarget: 'a reading, but no target to judge it against',
  notReported: 'no reading this period',
}

export const actualFor = (k: ObsKpi, p: Period): number | null =>
  p === 'q1' ? q1Of(k) : lift(k, k.actuals['2025'] ?? null)

export const targetFor = (k: ObsKpi, p: Period): number | null =>
  lift(k, k.targets[p === 'q1' ? '2026' : '2025'] ?? null)

/**
 * What the target asks for BY NOW rather than by December.
 *
 * A cumulative indicator accrues — 200 internships over a year is roughly 50 by
 * the end of Q1. A point-in-time one is a level that exists at an instant, so it
 * answers to the target directly whatever month it is.
 */
export function expectedBy(k: ObsKpi, p: Period): number | null {
  const t = targetFor(k, p)
  if (t === null) return null
  const elapsed = p === 'q1' ? RISK.elapsed : 1
  return isPointInTime(k) ? t : t * elapsed
}

/**
 * The share of expected pace achieved — the number every verdict rests on, and
 * the one the card prints so a classification can always be traced.
 *
 * Polarity governs direction: for a lower-is-better indicator the ratio
 * inverts, so an OVERSHOOT is what drives attainment down. Null where no honest
 * ratio exists, which is never the same as zero.
 */
export function attainmentOf(k: ObsKpi, p: Period): number | null {
  const a = actualFor(k, p)
  if (a === null) return null
  const bar = expectedBy(k, p)
  if (bar === null) return null
  const t = targetFor(k, p)
  // a zero target on a higher-is-better indicator is an off-year, not a ceiling
  if (!isLowerBetter(k) && t === 0) return null
  if (isLowerBetter(k)) {
    if (a === 0) return Infinity // nothing spent against a ceiling is perfect
    return bar === 0 ? 0 : bar / a
  }
  return bar === 0 ? null : a / bar
}

export function statusFor(k: ObsKpi, p: Period): DashStatus {
  if (actualFor(k, p) === null) return 'notReported'
  const att = attainmentOf(k, p)
  if (att === null) return 'noTarget'
  if (att >= 1) return 'onTarget'
  return att < RISK.threshold ? 'atRisk' : 'belowTarget'
}

export function statusCountsOf(rows: ObsKpi[], p: Period): Record<DashStatus, ObsKpi[]> {
  const out: Record<DashStatus, ObsKpi[]> = {
    atRisk: [], belowTarget: [], onTarget: [], noTarget: [], notReported: [],
  }
  for (const k of rows) out[statusFor(k, p)].push(k)
  return out
}

/**
 * One number per indicator, so every list on the platform can sort by risk
 * with the same comparator.
 *
 * The integer part is the status band in severity order; the fraction is the
 * shortfall within it, so the worst attainment rises to the top of its own
 * group rather than the groups merely being stacked.
 */
export function severityOf(k: ObsKpi, p: Period): number {
  const band = STATUS_ORDER.indexOf(statusFor(k, p))
  const att = attainmentOf(k, p)
  // within At Risk and Below target, worst first; within On target, closest first
  const within = att === null || att === Infinity ? 0 : Math.min(att, 2) / 2
  return band + within
}

/** Riskiest first, ties broken alphabetically so the order is stable. */
export const bySeverity = (p: Period) => (a: ObsKpi, b: ObsKpi) => {
  const d = severityOf(a, p) - severityOf(b, p)
  return d !== 0 ? d : a.name.trim().localeCompare(b.name.trim())
}

/** A category or theme is as urgent as its worst indicator. */
export const worstSeverityOf = (rows: ObsKpi[], p: Period): number =>
  rows.length === 0 ? Number.MAX_SAFE_INTEGER : Math.min(...rows.map((k) => severityOf(k, p)))
```

- [ ] **Step 4: Export `isPointInTime` and `lift` from `obs.ts` if not already**

Confirm `src/model/obs.ts` exports `lift`, `isLowerBetter`, `isPointInTime`, `q1Of`. Add `export` to any that lack it.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS. If the At Risk count comes back ≥ 40, the pace adjustment is not being applied — check `expectedBy`.

- [ ] **Step 6: Commit**

```bash
git add src/model/status.ts src/model/status.test.ts src/model/obs.ts
git commit -m "Five statuses, measured against expected pace, from one module"
```

---

### Task 4: Point `dash.ts` at the new model

**Files:**
- Modify: `src/model/dash.ts`

- [ ] **Step 1: Delete the local status block**

Remove from `dash.ts`: `DashStatus`, `STATUS_LABEL`, `STATUS_DOT`, `STATUS_SENSE`, `PACE`, `accrualOf`, `expectedBy`, `statusFor`, `statusCounts`. They now live in `status.ts`.

- [ ] **Step 2: Re-export, so every existing import keeps working**

Add near the top of `dash.ts`:

```ts
/* The status model lives in status.ts — re-exported here because every surface
   already imports these names from `dash`. One definition, one import path. */
export {
  RISK,
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_DOT,
  STATUS_SENSE,
  actualFor,
  targetFor,
  expectedBy,
  attainmentOf,
  statusFor,
  severityOf,
  bySeverity,
  worstSeverityOf,
  type DashStatus,
} from './status'

export const statusCounts = (p: Period, within: ObsKpi[] = dashTen) => statusCountsOf(within, p)
```

- [ ] **Step 3: Fix the fallout**

Run: `npx tsc --noEmit`
Expected: errors wherever `'performing'` / `'monitoring'` are used as status values. Replace `performing` → `onTarget`, `monitoring` → `noTarget` throughout. Search: `grep -rn "'performing'\|'monitoring'" src`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/model
git commit -m "dash.ts reads the status model rather than defining a second one"
```

---

### Task 5: Five status cards

**Files:**
- Modify: `src/components/DashParts.tsx`

- [ ] **Step 1: Re-lay the row**

Replace the grid class on the status-card container:

```tsx
{/* Five, not four stretched to five. At this count the cards stop being
    tiles and become a severity ROW, so they read left to right in the order
    they are ranked — At risk first — and wrap 2-up on a phone rather than
    shrinking to illegibility. */}
<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
  {STATUS_ORDER.map((st, i) => {
```

Iterate `STATUS_ORDER` (not `Object.keys(STATUS_LABEL)`) so severity order is guaranteed by the model.

- [ ] **Step 2: Update the reconciliation line**

```tsx
<p className="text-[11.5px] text-ink-mute">
  {STATUS_ORDER.map((s) => counts[s].length).join(' + ')} ={' '}
  <span className="font-semibold text-ink-soft">{total}</span> {noun}, judged for {PERIOD_LABEL[p]} only.
</p>
```

- [ ] **Step 3: Rewrite "How status is calculated"**

Replace the explanation body with:

```tsx
<p>
  Three months of a twelve-month year have closed, so a cumulative indicator is
  judged against {Math.round(RISK.elapsed * 100)}% of its annual target rather than
  the whole of it — {paced} of these {total} accrue that way. Even accrual is this
  platform's assumption, not a milestone QF has set. A rate, score or percentage is
  a level that exists at an instant, so it answers to its target directly.
</p>
<p className="mt-2">
  <strong>At risk</strong> means under {Math.round(RISK.threshold * 100)}% of that
  expected pace — materially behind, not merely behind.{' '}
  <strong>Below target</strong> is between {Math.round(RISK.threshold * 100)}% and
  100%. Each card prints its own attainment so the verdict can be checked.
</p>
<p className="mt-2">
  An indicator with no reading is <strong>Not reported</strong>, never at risk — and
  a zero on a satisfaction score or an NPS is treated as an empty cell rather than a
  collapse. For the {redCount} indicators where lower is better, an overshoot is the
  risk.
</p>
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `#exec`. Expected: five cards on one row at desktop width, At risk leftmost in maroon, counts summing to 90 in the line beneath.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashParts.tsx
git commit -m "Five status cards in severity order, with the pace rule explained"
```

---

### Task 6: Attainment on the card

**Files:**
- Modify: `src/components/KpiCard.tsx`

- [ ] **Step 1: Add the prop**

```tsx
  /** the share of expected pace achieved — printed so a verdict is traceable */
  attainment?: number | null
```

- [ ] **Step 2: Render it beside the status label**

In the status row, after the label:

```tsx
{attainment !== null && attainment !== undefined && Number.isFinite(attainment) && (
  <span className="num text-[10.5px] font-medium tabular-nums text-ink-mute">
    {Math.round(attainment * 100)}% of pace
  </span>
)}
```

- [ ] **Step 3: Pass it at every call site**

In `Executive.tsx`, `Search.tsx`: add `attainment={attainmentOf(k, period)}` to each `<KpiCard>`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`, then check a card in the browser reads e.g. `13% of pace`.

- [ ] **Step 5: Commit**

```bash
git add src/components/KpiCard.tsx src/screens/Executive.tsx src/screens/Search.tsx
git commit -m "Every card prints its attainment, so a status can be checked"
```

---

### Task 7: Risk-first ordering everywhere

**Files:**
- Modify: `src/screens/Search.tsx`, `src/screens/Executive.tsx`, `src/screens/L2.tsx`, `src/components/DashParts.tsx`

- [ ] **Step 1: Write the failing test** — append to `src/model/status.test.ts`:

```ts
describe('risk-first ordering', () => {
  it('puts the worst At Risk indicator first', () => {
    const sorted = [...thematicRows].sort(bySeverity('q1'))
    expect(statusFor(sorted[0], 'q1')).toBe('atRisk')
    expect(statusFor(sorted[sorted.length - 1], 'q1')).toBe('onTarget')
  })

  it('is stable — equal severity falls back to name', () => {
    const a = [...thematicRows].sort(bySeverity('q1')).map((k) => k.row)
    const b = [...thematicRows].reverse().sort(bySeverity('q1')).map((k) => k.row)
    expect(a).toEqual(b)
  })
})
```

- [ ] **Step 2: Run it and watch it fail** (`bySeverity` not yet imported in the test)

Run: `npm test` — add the import, expect PASS once Task 3 landed.

- [ ] **Step 3: Apply the default sort in the search listing**

`Search.tsx`, where `shown` is computed:

```tsx
/* riskiest first is the DEFAULT state everywhere — a listing exists to
   surface what needs attention, not to preserve sheet order */
const shown = useMemo(
  () => obsKpis.filter((k) => matches(k, filters, period)).sort(bySeverity(period)),
  [filters, period],
)
```

- [ ] **Step 4: Apply it to the L2 listing and the category rows**

`L2.tsx`: change the default `sort` in `EMPTY` from `'mover'` to `'risk'`, and add the `risk` case to the sort switch using `bySeverity`. Category groups sort by `worstSeverityOf(rowsInCategory, period)`.

- [ ] **Step 5: Verify**

Run: `npm test && npx tsc --noEmit`, then open `#search` and confirm the first cards are maroon.

- [ ] **Step 6: Commit**

```bash
git add src/screens src/components
git commit -m "Every listing defaults to riskiest first, from one comparator"
```

---

### Task 8: The AI summary and the search facet

**Files:**
- Modify: `src/model/dash.ts` (`summaryFor`), `src/screens/Search.tsx`

- [ ] **Step 1: Name at-risk indicators in the summary**

In `summaryFor`, lead with the at-risk bucket:

```ts
const worst = [...c.atRisk].sort(bySeverity(p))[0] ?? null
const collapsed =
  c.atRisk.length > 0
    ? `${c.atRisk.length} of ${n} at risk${worst ? ` — ${worst.name.trim()} is the furthest behind at ${Math.round((attainmentOf(worst, p) ?? 0) * 100)}% of pace` : ''}; ${c.belowTarget.length} below target and ${c.onTarget.length} on target.`
    : `Nothing at risk. ${c.onTarget.length} of ${n} on target, ${c.belowTarget.length} below.`
```

- [ ] **Step 2: The status facet gains its fifth value automatically**

`Search.tsx` builds the facet from `Object.keys(STATUS_LABEL)`. Change to `STATUS_ORDER` so it is severity-ordered and includes all five.

- [ ] **Step 3: Verify**

Open `#search`, open the Status dropdown. Expected: five values, At risk first, each with a live count.

- [ ] **Step 4: Commit**

```bash
git add src/model/dash.ts src/screens/Search.tsx
git commit -m "The summary names what is at risk; the facet offers all five"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the suite**

```bash
npm test && npx tsc --noEmit && npm run build
```

- [ ] **Step 2: Confirm the numbers on screen**

Open `#exec` and `#themes`. Confirm: five cards; counts sum to 90 and 151; At risk is maroon and leftmost; the first card in every listing is the worst one.

- [ ] **Step 3: Confirm the tripwire**

At risk on Thematic must be ~26, never ~69–75. If it is, `expectedBy` is being bypassed.

- [ ] **Step 4: Commit and report — do NOT deploy**

The brief says localhost only.

---

## Self-review against the brief

| Brief requirement | Task |
|---|---|
| Pace-adjusted threshold, not raw target | 3 |
| Cumulative vs point-in-time split | 3 (`expectedBy`) |
| No reading → Not reported, never At Risk | 2, 3 (tested) |
| Percentages normalised first | already `lift`; asserted in 2 |
| 50% threshold in a settings object | 3 (`RISK.threshold`) |
| Attainment exposed per card | 6 |
| Polarity Red inverts | 3 (tested) |
| Five statuses, counts sum | 3 (tested), 5 |
| At Risk first, severity order | 3 (`STATUS_ORDER`), 5 |
| Maroon `#8A1538` | 3 (`STATUS_DOT`) |
| Status colour only as a mark | 3 (documented), 5 |
| Status card row reworked | 5 |
| Risk-first default everywhere | 7 |
| Category lists by worst indicator | 3 (`worstSeverityOf`), 7 |
| AI summary names at-risk + vocabulary | 8 |
| Search facet fifth value | 8 |
| "How status is calculated" rewritten | 5 |
| One shared vocabulary + severity fn | 3 (`status.ts`) |
| Localhost only | 9 |
