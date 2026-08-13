# R2 §8 verification — run 2026-08-11 against the live build

1. **Balance.** One dominant element: the hero card (Social Progress, 5fr column) with the brief supporting above. Verified via layout measurement; hero fronts a 150-unit WISH trajectory. PASS.
2. **Brief.** AI summary measures 143px at 700px viewport ≈ 20% ("about a fifth"); under a fifth at every larger viewport. PASS.
3. **Portfolio.** The summary names all five thematic areas' substance (WISH/Social Progress, DIFI, Earthna/Sustainability, WISE/Progressive Education, Artificial Intelligence) and its lede is computed across entities (5 with stopped-reporting indicators — the brief's example said four; cells say five, and cells win). PASS.
4. **Door.** Every card: theme name, "N indicators · M entities", spotlight chip, visual, persistent "Explore N indicators →" with chevron; whole card is the pointer target with lift + accent-bar grow on hover. PASS.
5. **Chip.** All four spotlight cards carry their reason chip (BIGGEST MOVER / BASELINE / BASELINE / LARGEST GAP), fired by the spotlight engine in `src/model/spotlight.ts`. PASS.
6. **WISH.** The decline is the summary's opening evidence and the hero card (900, down from 11,939, trajectory mark). PASS.
7. **Status.** No RAG anywhere; state-tally footers, drawer state chips, and OE "targets already met" line removed. What remains is substance and availability wording (readings, reports at year end, idle by design). The state engine survives only as plumbing. PASS.
8. **Honest visual.** Sparklines and trajectories render only at ≥3 readings (MiniLine guard, first-reading tiles elsewhere). PASS.
9. **Gradient.** `--ai-gradient` appears on: summary rule/wash, spark glyphs, BOTaina launcher ring + panel avatar + bubble edge, L2 glass card avatar ring. Nothing decorative takes it; theme bands use theme hues. PASS.
10. **BOTaina.** Verified end to end in-browser: named greeting auto-opened once → "Show me" → insight-contract answer streamed → "Show me the trend" rendered a live ECharts chart inside the panel → "Take me to Social Progress" closed the panel, navigated to #t/social, scrolled to the WISH chart, and the pointing callout fired. PASS.
11. **Asset.** Supplied `Botaina_gif.gif` runs in launcher, panel and L2 ring (no drawn character on R2 surfaces; the SVG figure remains only as the in-chart pointing sprite where the GIF cannot leave its circle). Supplied wordmark top-left, unstretched, unrecoloured. PASS with that one noted judgement call.
12. **Filter.** `#t/social?e=WISH&fw=Strategic&av=trend` reloaded to the identical filtered view (2 results, chips, Clear all). Live counts per option; empty state names the filter to relax. PASS.
13. **Prose.** Summary and answers rewritten concrete-first; every claim spot-checked against cells (stopped-reporting list, 15 exact hits, WISH series, media mentions 700→12). PASS.
14. **Rationale.** `docs/r2-layout-rationale.md` records the three arrangements and the rejection reasons. PASS.

Notes: at exactly 1024×700 the second small-card row peeks (labels visible) with OE below the fold — the accepted trade named in §2.2. BDO route ships as a designed empty state with `TODO: BDO content model`.
