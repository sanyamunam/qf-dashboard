# R4 notes — brainstorms for Fix 1 and Fix 2

## Fix 1 · AI Summary card

**Structure options considered**
1. Headline + severity-ordered list (weighted rows, exception first). Rejected: still rows of prose; weight signalled only by order, and the ten-second test fails because every row must still be read.
2. Headline + one giant exception panel (WISH only) + four-item strip. Rejected: hides the second attention story (stopped reporting) and the one genuine climb; a single panel over-rotates on one entity again.
3. **Headline + spotlight row (1 performing / 2 attention tiles, real marks + figures) + compressed strip for the rest — CHOSEN.** Hierarchy is structural, not typographic: the exceptional cases get tiles with evidence, the steady areas get four words each. Ten-second read: headline gives the conclusion, tile labels give the direction, strip covers the rest.

**Spotlight selection (ranking logic, not hand-picking):** `% Variance` indicators excluded from mover ranking (signed measures around zero produce nonsense like −600%). Performing = largest scale-weighted favourable movement whose current quarter is not a zero-artifact → Human Capital training hours 6.0 → 15.0. Attention #1 = largest scale-weighted decline → WISH beneficiaries (peak 23,150 → 900). Attention #2 = largest-scale stopped-reporting series → DIFI sponsorship revenue (627,160 in 2025, zero reported so far in Q1) — framed as a collection question, not a decline, because a trailing Q1 zero is never proof of decline.

**Marks:** no line sparklines. WISH = dumbbell (peak vs now, both labelled). Sponsorship + training = delta columns (fat columns, last emphasized, zero rendered hollow with a "0" label). All ≥32px tall, every mark carries labelled values.

**Border/surface options considered**
1. Low-saturation indigo→purple full animated border. Rejected: still a frame competing with content — the same failure at a different hue.
2. Flat indigo hairline. Rejected: reads as an ordinary card; the AI signal disappears entirely.
3. No border, tinted surface. Rejected: the tint has to be strong enough to notice, at which point it fights the marks.
4. **Left-edge indigo→purple gradient accent (3px) + borderless surface — CHOSEN.** The signature sits beside the information, not around it. The whole AI signature system (spark glyph, BOTaina ring) moves with it to `#556BB4 → #5B2E8A` so there is still exactly one AI gradient in the product. Noted: `#5B2E8A` is the reserved Precision Health hue; accepted per this brief's explicit direction, revisit if Precision Health enters the data.

**Also:** two-questions line and metadata strip deleted; `Ask BOTaina →` CTA (small GIF avatar) bottom-right, opening her panel pre-seeded with a question about the current top spotlight.

## Fix 2 · Theme card grid

1. **OE folded in as a sixth tile, 3×2 — CHOSEN.** With only four data-bearing theme cards, the sixth slot is **Precision Health as a designed reserved tile** (QF's actual fifth thematic area, in the brand system, no Release 2 data — nothing invented, non-clickable, dashed "No indicators yet"). Six tiles fill the grid exactly; the dead block disappears by construction. OE keeps its distinctness by being the one navy card with its own internal treatment — different colour does the "enabling function, not a theme" work that the full-width banner used to do. The summary card's spotlight row now carries the page's hierarchy, so the card grid no longer needs a hero to make the point.
2. Five cards 3+2 with widened bottom row. Rejected: two card widths for identical content classes violates "size justified by content", and the widened pair reads as accidental.
3. Restrained hero (smaller ratio). Rejected: the hero card holds the same four elements as the small ones — a bigger box would still be padding, not content.
