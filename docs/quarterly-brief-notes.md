# The Quarterly Brief — The Two Findings

Rebuilt 15 Aug 2026 from the question of what a quarterly executive brief is.
Supersedes the four-block memo of 14 Aug, which failed both of the tests that
matter: it took work to parse, and it looked like a competent dashboard.

## What it is

The quarter stated as two facts, one from each source, each given a full-bleed
moment: one serif sentence, one chart big enough to read as an image, one line
of meaning in BOTaina's voice. Beneath each hero, a quiet ledger of that
source's other findings. Then three asks. One scroll.

## The four directions considered

| | What it is | CEO takeaway | Why rejected |
|---|---|---|---|
| A · The Letter | Continuous addressed prose from BOTaina, charts inline | She's read an opinion | Prose hides structure; "well / watch" has to be excavated; eight charts in a letter isn't a letter |
| B · The Front Page | Headline + image above the fold, two source columns below | The quarter at a glance | Two-column density collapses on a phone; the format wants more stories, the brief wants fewer |
| C · Ten Sentences | Ten sentences and a figure each, everything else behind a tap | Ten true things | Wins comprehension, fails uplift; a notification, not a flagship; violates "charts stay" |
| **D · The Two Findings** | Two full-bleed moments + a ledger + asks | The two things that mattered, and that the rest is there | **Chosen** — the only one passing both tests at once |

## Selection logic

Heroes are chosen by magnitude of real movement in their source, regardless of
direction. This quarter that gives two falls: EC footfall (Release 1 row 56,
237,801 → 36,546, −85% in one month) and WISH beneficiaries (Release 2, 23,150
peak → 900). Honesty over balance: promoting a lesser "went well" finding to
hero for optics would be lying with layout.

The ledger carries the remaining eight, four per source, interleaved and
marked with a glyph and a word (● went well / ○ to watch), never a section
header. Same verified set as before. No new figures.

## The "any other client" critique, applied

- Two heroes then a ledger is a shape anyone could produce. What makes it
  Al Mishkat's is the selection — the heroes are chosen by this data, and both
  are bad news because that is what the data says.
- Numbered 01–04 eyebrows: gone. Coloured side-stripes: gone. Section labels
  "Across the Foundation": gone — the heroes are the sections. Cards: gone —
  the ledger is a register with hairlines. Glass: none. BOTaina's greeting
  avatar at the top: gone — she appears three times, as the meaning line under
  each hero and at the sign-off, and carries more weight for it.
- The asks are lines, not cards. The whole line is the control.

## Verification (the eight points)

1. **One pass.** Two hero sentences of ≤12 words, eight ledger sentences of
   ≤16, one meaning line each. Nothing on the page asks to be read twice.
2. **Under two minutes.** 803 words rendered, of which 237 are trace lines
   (verbatim cell references, scanned not read). Reading load ~430 words of
   finding prose plus three asks. Scroll height ~5,750px at desktop.
3. **Traceability.** Every figure asserted in `parse_release1.py` (Release 1)
   or checked against `kpis.json` (Release 2). Release 1 hero + ledger sit in
   one `<section>`, Release 2 in another; nothing crosses.
4. **Uplift.** Set beside a well-made annual review: two moments with big type,
   one chart each, macro whitespace; nothing else competing.
5. **Charts in ~1s.** Six charts: 3 trends (hero footfall Jan/Feb/Mar, hero
   WISH 2022→Q1 26 with target, and row-size revenue / adoption / vacancies /
   training) plus 3 ledgers and 1 figure table. No legends anywhere.
6. **Platform-consistent.** `BriefTrend`/`BriefLedger`/`BriefFigures` reuse
   the L2 chart theme (`AXIS`, `TOOLTIP`, `STATUS_COLOR`); theme `fill` on
   thematic marks; sidra on executive; `.voice` serif; `.ai-ring` on BOTaina.
7. **Humanized.** All twelve BOTaina lines audited: em dashes cut from 8/12 to
   3/12, three "A, not B" formulas reduced to one, every hard specific kept.
8. **Directions recorded.** Above.

Also verified live: lamp lit → opens → quiet; ask tap closes the brief and
opens BOTaina with the question loaded; Release 2 trace lines open the KPI
drawer; zero elements with a coloured left border > 1px; zero backdrop-filter.
