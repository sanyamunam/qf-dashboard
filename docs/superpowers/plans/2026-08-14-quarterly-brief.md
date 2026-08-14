# Quarterly Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-visit daily brief with one quarterly memo — Executive (Release 1) findings first, thematic (Release 2) second — opened only from the lamp, read as a scroll, closing on clickable asks that open BOTaina.

**Architecture:** A new Python parser turns Release 1 into `exec.json`; a typed facts layer (`model/exec.ts`) exposes the verified figures; a static quarterly engine (`briefing/quarterly.ts`) holds the memo content with per-finding `VisualSpec`s rendered by the existing `BriefVisual` library; `QuarterlyBrief.tsx` is a full-screen scroll overlay replacing `Briefing.tsx`. The rotation/memory engine is deleted; lamp state becomes one quarter-keyed localStorage flag.

**Tech Stack:** React 18 + TS + Vite, Framer Motion (whileInView), existing SVG visual library, openpyxl.

**Spec:** `docs/superpowers/specs/2026-08-14-quarterly-brief-design.md`

**Verification style:** This repo has no test framework; the established gates are the parser's own assertions, `npx tsc --noEmit`, `npm run build`, and browser verification via the preview tools. Every figure asserted against its cell in the parser.

---

### Task 1: Parse Release 1 → `src/data/exec.json`

**Files:**
- Create: `scripts/parse_release1.py`
- Create: `src/data/exec.json` (generated)

- [ ] **Step 1: Write the parser with hard assertions**

```python
"""Release 1 (executive) workbook -> src/data/exec.json.
Sheet 'Q1_updates_drill downKPIs': header row 2, data rows 3-71 (69 KPIs).
Columns: A framework, B theme, C entity, D level, E category, F name,
G definition, H source, I frequency, J-L Jan/Feb/Mar, M 2026 Q1,
N-Q actuals 2022-2025, R-X targets 2022-2028, Y/Z missing flags, AA comment.
Numbers stay numbers; strings like 'NR', 'TBU', 'Reported annually' are
preserved as notes, never coerced. Junk-unit rows are listed, not dropped.
"""
import json, math
from pathlib import Path
import openpyxl

SRC = Path(r"C:\Users\user\OneDrive - applab.qa\QF Observatory\Al Mishkat - Release 1 KPIs.xlsx")
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "exec.json"

def num(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool) and not (isinstance(v, float) and math.isnan(v)):
        return v
    return None

def note(v):
    if v is None or num(v) is not None:
        return None
    s = str(v).strip()
    return s or None

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Q1_updates_drill downKPIs"]

rows, warnings = [], []
for r in range(3, 72):
    name = ws.cell(r, 6).value
    if not name or not str(name).strip():
        warnings.append(f"row {r}: empty name, skipped")
        continue
    c = lambda col: ws.cell(r, col).value
    rows.append({
        "row": r,
        "framework": str(c(1)).strip(),
        "theme": str(c(2)).strip(),
        "entity": str(c(3)).strip(),
        "level": (str(c(4)).strip() or None) if c(4) else None,
        "category": str(c(5)).strip(),
        "name": str(name).strip(),
        "definition": str(c(7)).strip() if c(7) else None,
        "source": str(c(8)).strip() if c(8) else None,
        "frequency": str(c(9)).strip() if c(9) else None,
        "monthly": {"jan": num(c(10)), "feb": num(c(11)), "mar": num(c(12))},
        "q1": num(c(13)),
        "q1Note": note(c(13)),
        "actuals": {str(2022 + i): num(c(14 + i)) for i in range(4)},
        "actualNotes": {str(2022 + i): note(c(14 + i)) for i in range(4)},
        "targets": {str(2022 + i): num(c(18 + i)) for i in range(7)},
        "targetNotes": {str(2022 + i): note(c(18 + i)) for i in range(7)},
        "comment": str(c(27)).strip() if c(27) else None,
    })

# ---- hard assertions: every figure the brief will print, against its cell ----
by = {x["row"]: x for x in rows}
assert len(rows) == 69, len(rows)
f = by[56]  # EC footfall
assert f["monthly"] == {"jan": 211772, "feb": 237801, "mar": 36546}
assert f["q1"] == 486119 and f["q1"] == sum(f["monthly"].values())
v = by[69]  # vacancies
assert v["monthly"] == {"jan": 610, "feb": 673, "mar": 695}
assert max(v["actuals"].values()) == 620  # 695 beats every year-end
assert by[66]["monthly"]["mar"] == 14 and by[66]["actuals"]["2025"] == 19
rev = by[65]
assert rev["monthly"] == {"jan": 171, "feb": 342, "mar": 545} and rev["actuals"]["2025"] == 2055
g = by[3]
assert [g["actuals"][y] for y in ("2022","2023","2024","2025")] == [0.54, 0.65, 0.65, 0.72]
assert g["targets"]["2026"] == 0.8
assert by[49]["q1"] == 38683 and by[49]["targets"]["2026"] == 30000
assert by[62]["q1"] == 0 and by[62]["actuals"]["2025"] == 169546

OUT.write_text(json.dumps({
    "generatedFrom": SRC.name,
    "sheet": "Q1_updates_drill downKPIs",
    "period": "2026Q1",
    "parseWarnings": warnings,
    "kpis": rows,
}, indent=1), encoding="utf-8")
print(f"wrote {len(rows)} exec KPIs -> {OUT}")
```

- [ ] **Step 2: Run it**

Run: `python scripts/parse_release1.py`
Expected: `wrote 69 exec KPIs -> ...exec.json`, no assertion failures.

- [ ] **Step 3: Commit** — `git add scripts/parse_release1.py src/data/exec.json` + commit.

---

### Task 2: Typed exec facts — `src/model/exec.ts`

**Files:**
- Create: `src/model/exec.ts`

- [ ] **Step 1: Types + facts**

```ts
/** Release 1 — the Executive View's own data. Facts pulled by sheet row so a
 *  moved row fails loudly (undefined) rather than silently reading a neighbour. */
import raw from '../data/exec.json'

export interface ExecKpi {
  row: number
  framework: string; theme: string; entity: string
  level: string | null; category: string; name: string
  definition: string | null; source: string | null; frequency: string | null
  monthly: { jan: number | null; feb: number | null; mar: number | null }
  q1: number | null; q1Note: string | null
  actuals: Record<string, number | null>
  targets: Record<string, number | null>
  comment: string | null
}

export const execKpis = (raw as { kpis: ExecKpi[] }).kpis
const byRow = (r: number): ExecKpi => {
  const k = execKpis.find((x) => x.row === r)
  if (!k) throw new Error(`exec row ${r} missing`)
  return k
}

export const execFacts = {
  footfall: byRow(56),          // EC total footfall, monthly
  carbon: byRow(57),
  vacancies: byRow(69),         // total vacancies, monthly
  leadershipVacancies: byRow(66),
  revenue: byRow(65),           // QAR millions, cumulative monthly
  gradEmployment: byRow(3),     // fraction of graduates employed
  genomes: byRow(49),           // cumulative caveat in .comment
  cultural: byRow(62),          // cultural events footfall, Q1 = 0
  qatarization: byRow(71),
  // units contradict their own history — named in the accounting, never charted
  excluded: [byRow(63), byRow(51), byRow(52)], // Budget Variance, 2x Diabetes
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — clean. Commit.

---

### Task 3: Quarterly engine — `src/briefing/quarterly.ts`

**Files:**
- Create: `src/briefing/quarterly.ts`
- Modify: `src/briefing/visuals.tsx` (VisualSpec moves here from engine.ts; add optional `target` + `fmt: 'pct'` to `columns`)

- [ ] **Step 1: Move `VisualSpec` into `visuals.tsx`** (it outlives engine.ts) and extend `columns`:

```ts
export type VisualSpec =
  | { type: 'exact-targets' }
  | { type: 'slope'; peak: number; peakLabel: string; now: number; nowLabel: string; target: number }
  | { type: 'quiet-rows'; rows: { label: string; series: [string, number][]; unit?: string }[] }
  | { type: 'dot-grid'; total: number; filled: number; filledLabel: string; restLabel: string; headline: number }
  | { type: 'columns'; series: [string, number][]; unit: string; target?: number; fmt?: 'pct' }
  | { type: 'ceilings'; names: string[] }
```

In `BigColumns`: when `fmt === 'pct'` label values as `Math.round(v*100) + '%'` and scale bars on the fraction; when `target` present draw the same dashed target line style used in `Slope` (MUTE, `6 5` dash, right-anchored label).

- [ ] **Step 2: The engine** — static, verified, no rotation:

```ts
/** The Quarterly Brief — one memo per quarter. Content is code so that every
 *  sentence stays welded to the cells it cites. No rotation, no memory beyond
 *  one read-flag. */
import { execFacts } from '../model/exec'
import { kpis, inventory, fmt } from '../model/data'
import { facts, wishDropPct } from '../model/facts'
import type { VisualSpec } from './visuals'

export const QBRIEF_KEY = 'almishkat.qbrief.2026q1'
export const isBriefUnread = () => !localStorage.getItem(QBRIEF_KEY)
export const markBriefRead = () => {
  localStorage.setItem(QBRIEF_KEY, String(Date.now()))
  window.dispatchEvent(new Event('brief-read'))
}

export interface QFinding {
  id: string
  kicker: string            // 'What moved' / "What doesn't add up" ...
  finding: string           // serif sentence
  visual: VisualSpec
  figures: string           // trace line, verbatim numbers
  read: string              // one short paragraph of judgement
  kpiId?: string            // Release 2 only: opens the drawer
}
export interface QAsk { q: string; owner: string }
export interface QuarterlyBrief {
  title: string; dateLine: string
  hook: { shape: string; lines: string[] }
  foundation: QFinding[]    // Release 1 — leads
  themes: QFinding[]        // Release 2 — follows
  asks: QAsk[]              // each opens BOTaina
  accounting: string        // incl. the excluded rows, named
}
export function buildQuarterlyBrief(): QuarterlyBrief { /* content below */ }
```

Content (figures verified in Task 1 / already verified in kpis.json):

- **hook**: shape line naming the two halves of the quarter (records + one cliff), 2 lines max.
- **foundation** (order = magnitude of movement):
  1. `ec-footfall` — 'What moved' — Jan 211,772 / Feb 237,801 / Mar 36,546; Q1 486,119. `columns` with monthly series. Read: an 85% fall from February, in the sheet's own monthly columns; last year's full-year was 3,051,433.
  2. `vacancies` — 'What is climbing' — 610→673→695 vs year-ends 451/521/620/614; leadership steady 15/14/14. `columns`.
  3. `revenue` — 'What is working' — QAR 545m by March = 27% of 2055m (all of 2025). `columns` (cumulative months + 2025 for scale).
  4. `grad-employment` — 'The long climb' — 54→65→65→72% vs 80% 2026 target. `columns` with `fmt:'pct'` + `target: 0.8`.
- **themes**:
  1. `wish` — 'What changed' — existing slope spec (peak 23,150 → 900, target 5,000).
  2. `exact-targets` — "What doesn't add up" — existing exact-targets spec; 35 of 151 done at Q1.
  3. `gone-quiet` — 'What stopped' — existing quiet-rows spec (4 entities, 6 zeros).
  4. `eco-schools` — 'What worked' — existing dot-grid spec (beneficiaries / registered / certified).
- **asks** (each clickable → BOTaina):
  1. What happened at Education City in March — programme calendar, access, or counting? — City Operations
  2. Which of the 35 finished 2026 targets are being re-based, and by whom? — Strategy & Performance
  3. Budget Variance and both Diabetes outcome rows report in units that contradict their own history — whose numbers are right? — CFO Division & QDA reporting leads
- **accounting**: totals both sources (69 + 151 indicators), names the three excluded rows and why, states nothing else needed the reader this quarter.

- [ ] **Step 3: `npx tsc --noEmit`** — clean. Commit.

---

### Task 4: The memo — `src/briefing/QuarterlyBrief.tsx`

**Files:**
- Create: `src/briefing/QuarterlyBrief.tsx`

- [ ] **Step 1: Build the overlay** — fixed inset overlay on `bg-cream`, `overflow-y-auto`, one centered column `max-w-[860px]`:

- Masthead (sticky top): mark + "The Quarterly Brief · Q1 2026 · generated <date>" + "Open dashboard" exit. Esc exits.
- Section rail: fixed right edge (desktop only), three dots labelled Foundation / Themes / Asks; `scrollIntoView` on tap; active section tracked with an IntersectionObserver. Never required for reading.
- Hook: BOTaina avatar (ai-ring, existing pattern), shape line in `voice` serif at 38–44px, two supporting lines.
- Section heads: `label` kicker ("ACROSS THE FOUNDATION · RELEASE 1 — EXECUTIVE INDICATORS" / "ACROSS THE THEMES · RELEASE 2") with thin rule — the hierarchy is *stated*.
- Finding block (shared component): kicker, serif finding sentence (26–30px), `<BriefVisual spec active={inView}/>` triggered by `whileInView`/`useInView` once at 30% visibility, trace line in `num` 12px (Release 2 findings: trace line is a button → `onOpenKpi`), read paragraph 15px `text-ink-soft`.
- Asks: each ask is a **whole-card button** → `onAskBotaina(ask.q)`; card shows the question in serif italic + owner + a small BOTaina avatar chip so the affordance is legible. "Copy the asks" + "Have BOTaina draft the note" kept below.
- Accounting line, then a final "Open the dashboard" button.
- On mount: `markBriefRead()`.

Props: `{ onExit, onOpenKpi, onAskBotaina }` — same contract as old `Briefing`, so `App.tsx` wiring is a rename.

- [ ] **Step 2: `npx tsc --noEmit`** — clean. Commit.

---

### Task 5: Wiring + deletion of the daily brief

**Files:**
- Modify: `src/App.tsx` (render `QuarterlyBrief`; delete auto-open front-door in the two `hasUnseenBrief()` sites; keep `open-brief` listener)
- Modify: `src/components/Shell.tsx:316-346` (Lamp imports `../briefing/quarterly` → `isBriefUnread()`; title "The Quarterly Brief · Q1 2026" / "Read · Q1 2026")
- Delete: `src/briefing/Briefing.tsx`, `src/briefing/engine.ts`
- Check: `grep -rn "briefing/engine\|Briefing\b" src/` → fix all references (BotainaDock imports `recordAskTopic`? verify; drop ask-topic memory with the engine)

- [ ] **Step 1: Wire, delete, then prove nothing references the corpse**

Run: `grep -rn "briefing/engine" src/` → no matches. `npx tsc --noEmit` → clean.

- [ ] **Step 2: `npm run build`** — clean. Commit.

---

### Task 6: Verify in browser, document, deploy

- [ ] **Step 1: Browser verification** (preview_start `al-mishkat-r2`; clear `almishkat.qbrief.2026q1` first):
  1. Load → **no auto-open**; lamp lit "Brief ready".
  2. Lamp → memo opens; Foundation section before Themes; scroll is the read; rail jumps.
  3. Every figure on screen matches its cell (footfall 211,772/237,801/36,546/486,119; vacancies 610/673/695; revenue 545/2,055; grads 54/65/65/72 vs 80%; WISH 23,150→900; 35 targets; 4 quiet entities; Eco-Schools counts).
  4. Click an ask → overlay closes, BOTaina opens with the question.
  5. Click a Release 2 trace line → KPI drawer opens.
  6. Exit → lamp quiet ("You're up to date"); reload → still no auto-open, lamp stays quiet.
  7. Word-count the memo prose (≤ ~700 words) — under two minutes standing.
- [ ] **Step 2:** `docs/quarterly-brief-notes.md` — decisions + exclusions.
- [ ] **Step 3:** Commit, push, `npx wrangler pages deploy dist --project-name qf-dashboard --branch master --commit-dirty=true`, verify deployed URL end-to-end, screenshot to user.

---

## Self-review

- Spec coverage: exec-first ✓ (Task 3 order + Task 4 section heads), traceability ✓ (Task 1 assertions + trace lines), <2 min ✓ (6.1.7), chart reuse ✓ (BriefVisual only; the one extension is a param, not a new chart), lamp-only entry ✓ (Task 5 removes both auto-open sites), clickable asks → BOTaina ✓ (Task 4), scroll-not-pagination ✓, exclusion rule ✓ (Task 2 `excluded` + accounting).
- No placeholders: engine content itemised with real figures; component described to the element level against an existing sibling (`Briefing.tsx`) whose patterns it reuses.
- Type consistency: `VisualSpec` single source in `visuals.tsx`; `QuarterlyBrief` props match old `Briefing` contract.
