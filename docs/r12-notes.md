# Revision 12 — one AI identity, platform-wide

## The rule

**Green means AI-authored.** One colour, every AI surface, no exceptions —
replacing both the indigo→purple signature AND the bespoke forest fill that
BOTaina's own panel used to carry. Two colours for one meaning was a
contradiction a careful reader would notice.

## Tokens (src/styles.css `:root`)

```
--ai-green-deep:   #073b31
--ai-green-mid:    #146152
--ai-green-bright: #2fa98a
--ai-green-mint:   #3fcba0
--ai-border-gradient  →  thin strokes and rings, never a fill
--ai-panel-gradient   →  BOTaina's own solid surfaces
--ai-wash-subtle      →  tints behind AI-authored content
```

`--ai-gradient` and `--ai-gradient-subtle` are gone; nothing references them.
`--color-ai-mint` (the abandoned R1 teal claim) was dead and was removed too.

## Where it applies

| Surface | Token |
|---|---|
| AI Summary card ring (L1 + L2) | `--ai-border-gradient` on the masked `::before` |
| AI Summary wash + spark chip | `--ai-wash-subtle` |
| AI Summary label, spark glyph gradient | `--ai-green-mid` → `--ai-green-bright` |
| Inline AI caption bullet (every KPI card) | the same `Spark` glyph |
| AI search field ring + Ask button | `--ai-border-gradient` |
| BOTaina launcher ring, glow, panel top edge, panel border | `--ai-border-gradient` |
| BOTaina's answer bubbles | `--ai-wash-subtle` over white + green edge |
| BOTaina's pointing speech bubble | `--ai-panel-gradient` |
| Overlay AI Highlights block | `--ai-panel-gradient` |
| Generating ring-drift | green stops, timing unchanged |

## What deliberately did NOT take the green

Indigo and purple remain in the palette; they simply no longer mean "AI":
Social Progress (`#556bb4`) and Precision Health (`#5b2e8a`) theme hues, the
chart `SERIES_PALETTE`, briefing chart fills, the Policy HUB monogram, the
`BIGGEST MOVER` chip. The Artificial Intelligence *theme* keeps its cyan —
it is a QF thematic area, not an AI-authored surface.

The **user's** chat bubble stays Sidra green. It is the user's voice; giving
it the AI colour would say the platform wrote it.

## BOTaina's scale (fix 4)

Where her avatar attributes a block of AI text it is now a 26px circular
badge beside a label of matching weight — a signature, not a subject. Applied
to the AI Highlights block. Left at full size where she *is* the subject: the
floating launcher (58px), the open panel header (91px), the briefing greeting
(110px), the loader (150px), and her pointing annotation on L2.

## Deviation worth naming

§3 lists "her chat bubbles" under `--ai-panel-gradient`. Filling them with the
dark panel gradient would have put long streamed answers — and `AnswerView`'s
bordered light-surface item rows — on a dark ground, costing real legibility.
They instead take `--ai-wash-subtle` over white plus the green gradient edge:
unmistakably her surface, unmistakably the same family, still readable. Say
the word and they go solid.

## Observation, not changed

Inside the L1 AI Summary the "stopped reporting" spotlight tile draws its bars
in `#556bb4`. That is a data-state colour, not an AI marker, so it was left
alone — but it now reads as a leftover against the green card. Worth deciding
whether that state should be a neutral grey.
