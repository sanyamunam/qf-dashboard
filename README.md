# QF Dashboard

AI-centric thematic performance platform — the judgement is the content, the chart is the evidence. React 18 + TS + Vite + Tailwind v4 + ECharts 5 + Framer Motion.

**Private preview.** Deployed on Cloudflare Pages behind a password gate (`functions/_middleware.ts`); all responses carry `noindex` and robots.txt disallows crawling.

## Run

```bash
npm install
npm run dev   # port 4188 (launch.json entry: al-mishkat-r2)
```

## Data pipeline

`data/release2-kpis.xlsx` (ALL sheet, 151 KPIs) → `scripts/parse_kpis.py` → `src/data/kpis.json`.
The parser computes cadence, the six-state engine, chart-group keys (the `Name:` suffix), scale-weighted movement, exact-hit and overshoot flags, and verifies the counts printed to stdout. Re-run after replacing the workbook:

```bash
python scripts/parse_kpis.py
```

## Where things live

- `docs/design-plan.md` — the §0.C design plan: brainstorm, palette, type, signature, self-critique
- `docs/verification.md` — §12 acceptance test results and declared deviations
- `src/model/` — types, selectors, findings engine (`needsYouCount` is computed, never typed in)
- `src/components/marks.tsx` — the four L1 card grammars (hand-rolled SVG)
- `src/components/charts/` — the ECharts adapter (one file to swap libraries) + honesty-first builders
- `src/screens/L1.tsx` / `L2.tsx` — The Standing + theme cards; bands + entity lens + BOTaina's annotation walk
- `src/components/KpiDrawer.tsx` — L3 detail drawer with cell provenance
