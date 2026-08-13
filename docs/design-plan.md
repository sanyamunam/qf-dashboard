# Al Mishkat R2 — Design Plan
Delivered before code, per brief §0.C. 2026-08-11.

## 0. Brainstorm — three structurally different L1 concepts

Three different answers to *"what is the first thing this person sees?"*

**A. The Morning Letter.** The whole L1 is a written brief — a dated, signed letter from the platform, full-width editorial page; themes exist only as footnoted links. First thing seen: prose.
*Rejected because:* it fails the C-suite secondary audience (no receipts in view), hides coverage asymmetry entirely, and on an iPad it wastes the screen's spatial capacity. It also over-rotates on the CEO's complaint: she asked for intelligence *added to* evidence, not evidence removed.

**B. The Standing + Evidence Grid.** First thing seen: a three-sentence written verdict with linked numbers (The Standing), then five theme cards that each carry one real-world quantity, its trajectory, and a question — with only the anomalous card allowed to be loud. OE as a navy banner.
*Chosen.* It answers "is the promise being kept?" in the first 90 seconds, keeps evidence one glance below the verdict, and honestly renders the 61-vs-2 coverage asymmetry through card content rather than card size.

**C. The Anomaly Stage.** First thing seen: ONE finding at full-screen scale — the WISH decline chart, annotated by BOTaina — with everything else in a quiet rail.
*Rejected because:* it fails the idle test structurally. On a quarter where nothing moves, the stage has nothing to stage and must either manufacture drama or invert its own layout. It also collapses the reader's ability to see breadth (Miller's Law works against a single-object screen when the real question spans five themes).

B absorbs the best of both rejects: A's editorial spine becomes The Standing; C's spotlight becomes the Von Restorff treatment of the single anomalous card plus BOTaina's one pointing moment.

## 1. Palette (6 named values + theme layer)

| Name | Hex | Job |
|---|---|---|
| Sidra Green | `#034638` | Structure, identity, headers, BOTaina's chrome. The 30%. |
| Lantern Cream | `#F6F1E7` | App canvas. Warm paper the white cards sit on. The 60%. |
| Card White | `#FFFFFF` | Evidence surfaces. Borderless, navy-tinted shadow. |
| Ink | `#122822` | Body text. Green-black, never pure black. |
| QF Lime | `#78BE20` | Favourable movement ONLY. Semantic, never decorative. |
| QF Maroon | `#8A1538` | Unfavourable movement ONLY. The only red on the screen. |

Theme hues (one per theme; lime/maroon banned as themes): Social Progress indigo `#556BB4` · Sustainability mid-green `#2E7D5B` · Progressive Education amber `#C98F1B` (brief's `#E5A823` darkened for AA on cream at small sizes; used at full `#E5A823` in chart fills) · Artificial Intelligence cyan `#0E93B5` (same AA darkening of `#0CC1E9`; full hue in fills) · Precision Health purple `#5B2E8A` (reserved slot) · Organizational Excellence navy `#1F2A44` (banner, not a theme card).
**Deviation note:** QF's public 2024 Year-in-Review markup exposes no theme hex values (compiled CSS); the brief's proposed hues are adopted with AA-contrast darkening for text/stroke use.

## 2. Type

| Face | Role | Note |
|---|---|---|
| **Instrument Sans** (400/500/600/700) | All UI: labels, body, nav, band headers, definitions | Stand-in for the unlicensed QF typeface — humanist grotesk, warm, nothing like Inter. Substitution declared per §4.1. |
| **Space Grotesk** (500/700, tabular) | Numbers only: KPI values, figures, counters, axis numerals | Per brief. `font-variant-numeric: tabular-nums` everywhere. |
| **Fraunces** (300/400 + italic, opsz) | The AI's written voice: The Standing, per-card questions, BOTaina's verdict lines | The declared aesthetic risk (below). Stand-in for Aeonik's editorial role, deliberately swapped from sans to serif. |

Scale: Standing display 34–44px Fraunces Light · hero KPI value 40–44px Space Grotesk 700 Sidra Green · section labels 11px/600/+0.14em uppercase · body 15–16px/1.6 · footnote 12.5px muted. Minimum body 15px (iPad at arm's length).

**The declared aesthetic risk:** *everything the AI says is set in a serif; everything the apparatus says is set in a sans.* The judgement layer and the evidence layer become typographically distinguishable at a squint — you can see where the intelligence is on the page before reading a word. It also gives The Standing the register of a chief-of-staff memo rather than a dashboard widget. Defense: brand inheritance in the brief is tokens and colour layers; Aeonik is listed as droppable, and the serif carries only the platform's written voice.

## 3. Layout

L1 (structure per brief §5.2 wireframe, adopted): header with Sidra stripe → The Standing (Fraunces, linked figures, state chips in muted footer) + BOTaina at rest with ask bar → "Since you last looked" delta strip (renders only with genuine delta) → 2×2 theme cards (Social Progress loud; trajectory / dot-grid / progress / sparse grammars) → OE navy banner with inline strip of 4 tiles.

L2 (per brief §5.3 wireframe, adopted): theme stripe header → BOTaina's theme read (verdict/evidence/ask + confidence) → entity lens + band filter → Impact ("Did anything change?") → Strategic ("Are we building it?") → Operational (collapsed; "Nothing needs you here" + open) → category groups → combined `Name:`-group ECharts, one Fraunces AI line under each. Drawer for KPI detail (L3), never a page.

## 4. Signature

**The Standing** — a dated, three-sentence written verdict whose every figure is a tappable link into its evidence, with the loader's last line becoming its first line. Secondary signature: BOTaina leaves her resting spot and physically annotates the one chart that matters (`convertToPixel` anchor).

## 5. Self-critique — "would I have produced this plan for any other executive dashboard?"

- *The 2×2 card grid was generic.* Any dashboard has cards in a grid. Revised: the four **card grammars** (trajectory / composition dots / progress / sparse field) mean the cards' internal shapes differ per evidence type — the grid is a container, not the design. Card size stays equal (honesty), card *voice* doesn't.
- *"Needs you: 3" chips risked becoming state tallies as heroes* — §13 explicitly bans that. Revised: chips demoted to the Standing's muted footer line; the sentence itself is the hero. The loader's "Found N that need you" line survives because it routes attention, but lands as prose, not as a stat tile.
- *A health-score temptation:* early sketch had per-theme "pace dots." Killed — QF has not defined health; the verdict slot is built but renders empty (§5.2.1). What renders instead: per-card state inventory in the footer, in words.
- *Generic AI-crutch look:* no purple gradients, no glass cards (glass only on panels/radius-20 per §4.3 — in practice: the KPI drawer scrim), no chat dock (BOTaina is a character with states, summoned, not a sidebar).
- *Q1 pace trap re-checked in data:* confirmed zero breaches; the Standing's third sentence is the target-calibration finding (15 exact hits computed from cells, e.g. WISH LinkedIn 7,000/7,000, WISE testbeds 9/9) — not manufactured concern.

## 6. Data facts the screens are built from (verified against cells 2026-08-11)

- WISH Beneficiaries 11,939 → 23,150 → 2,000 → 1,170 → Q1 900 vs 5,000 target. Largest scale-weighted decline with history. The L1 anomaly.
- Earthna Eco-Schools: 78,391 beneficiaries, 86 registered, 32 certified (all first readings — dot grid, no fake trend). Research publications 4 → 9 → 14.
- WISE: QAR 27.4m / 99 prize recipients (cells: Awards Value 27,400,000; Awardees 99); Edtech testbeds 16 schools (9/9 Q1 target met).
- AI theme: 2 KPIs (WISE policy recommendations 1 of 3; adoptions 0 of 1) — sparse-field card.
- OE banner history: turnover 8.45→8.3→9.0→7.0 (annual, no Q1 read); training hours 6.02→10.7→11.4→15.0.
- States: 72 in progress · 35 target already met · 35 report at year end · 9 idle · **0 above ceiling**. 15 exact hits. 2 overshoots >2×.
- Counterweights for The Standing: DIFI sponsorship revenue +72% (160,830 → 627,160 QAR); DIFI research publications 25 in 2025; WISH media mentions 700 → 12 (secondary decline, corroborates the WISH story).
- No `Parent Entity` column exists in the ALL sheet (brief schema lists one) — escalation routing derived from entity names. Documented deviation.

## 7. Tech

Vite + React 18 + TS · Tailwind v4 (tokens above as CSS variables) · ECharts 5 (L2 only, thin adapter) · hand-rolled SVG for L1 card marks · Framer Motion (three orchestrated moments only) · BOTaina as inline SVG recreation with CSS/Motion states (the GIF asset was not on disk — substitution declared) · xlsx parsed at build time by `scripts/parse_kpis.py` → `src/data/kpis.json`; zero fabricated numbers, every figure traces to a cell reference carried in the model.
